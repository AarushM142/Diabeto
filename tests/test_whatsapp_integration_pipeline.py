import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from dataclasses import dataclass

from apps.api.app.channels.template_manager import render_message, load_templates
from apps.api.app.channels.number_parser import parse_glucose_reading, convert_devanagari_numerals, infer_reading_context
from apps.api.app.channels.twilio_validator import validate_twilio_signature, is_in_quiet_hours
from apps.api.app.channels.image_classifier import classify_and_read_image
from apps.api.app.modules.risk.escalation import (
    advance_escalation_state_machine,
    acknowledge_risk_event,
    trigger_immediate_0min_caregiver_alert,
)


# ============================================================================
# 1. Template & Localization Tests (§6.1, §6.2)
# ============================================================================

class TestTemplateCatalog:
    def test_all_templates_exist_and_render_multilingual(self):
        templates = load_templates()
        required_keys = [
            "welcome_opt_in",
            "caregiver_opt_in",
            "medication_reminder",
            "reading_reminder",
            "caregiver_critical_alert",
            "caregiver_missed_dose",
            "care_team_message",
            "weekly_summary",
            "echo_confirmation",
            "reading_saved_normal",
            "high_glucose_warning",
            "critical_hypo_emergency",
            "help_message",
            "unregistered_sender",
            "opt_out_success",
            "opt_in_success",
            "sms_critical_alert",
            "voice_call_script",
        ]
        for key in required_keys:
            assert key in templates, f"Template '{key}' missing from messages.json"
            for lang in ["en", "hi", "mr"]:
                assert lang in templates[key], f"Language '{lang}' missing for '{key}'"

    def test_render_message_variable_interpolation(self):
        msg = render_message(
            "echo_confirmation",
            lang="en",
            glucose_val="140",
            context="fasting"
        )
        assert "140" in msg
        assert "fasting" in msg

        msg_hi = render_message(
            "echo_confirmation",
            lang="hi",
            glucose_val="140",
            context="उपवास"
        )
        assert "140" in msg_hi
        assert "उपवास" in msg_hi


# ============================================================================
# 2. Number Parsing & Context Routing Tests (§3.3, Gaps 6 & 13)
# ============================================================================

class TestNumberParsing:
    def test_devanagari_numeral_conversion(self):
        assert convert_devanagari_numerals("१४०") == "140"
        assert convert_devanagari_numerals("२५०") == "250"

    def test_parse_standard_digits(self):
        res = parse_glucose_reading("Fasting sugar 115")
        assert res is not None
        assert res.value == 115.0
        assert res.context == "fasting"
        assert res.is_valid_range is True

    def test_parse_devanagari_reading(self):
        res = parse_glucose_reading("शुगर १४०")
        assert res is not None
        assert res.value == 140.0
        assert res.is_valid_range is True

    def test_parse_spoken_hindi(self):
        res = parse_glucose_reading("मेरी शुगर एक सौ चालीस है")
        assert res is not None
        assert res.value == 140.0

        res2 = parse_glucose_reading("शुगर दो सौ बीस आई")
        assert res2 is not None
        assert res2.value == 220.0

    def test_parse_spoken_marathi(self):
        res = parse_glucose_reading("रक्तातील साखर एकशे चाळीस")
        assert res is not None
        assert res.value == 140.0

    def test_parse_spoken_english(self):
        res = parse_glucose_reading("sugar was one forty this morning")
        assert res is not None
        assert res.value == 140.0

    def test_meal_routing_vs_glucose_reading(self):
        # Gap 6: "after dinner sugar 210" must be parsed as glucose, not a meal!
        res = parse_glucose_reading("after dinner sugar 210")
        assert res is not None
        assert res.value == 210.0
        assert res.context == "post_dinner"

    def test_plausibility_boundaries(self):
        # 20 - 600 mg/dL boundaries
        res_low = parse_glucose_reading("15")
        assert res_low is not None
        assert res_low.is_valid_range is False

        res_high = parse_glucose_reading("750")
        assert res_high is not None
        assert res_high.is_valid_range is False

        res_ok = parse_glucose_reading("85")
        assert res_ok is not None
        assert res_ok.is_valid_range is True


# ============================================================================
# 3. Twilio Signature & Quiet Hours Tests (§7.2, §3.8)
# ============================================================================

class TestTwilioSecurityAndRules:
    def test_signature_validation(self):
        url = "https://api.example.com/v1/webhooks/whatsapp"
        params = {"From": "+919800000001", "Body": "140"}
        auth_token = "secret_twilio_token_123"

        # Mock compute valid signature
        import hmac, hashlib, base64
        data = url + "Body140" + "From+919800000001"
        valid_sig = base64.b64encode(hmac.new(auth_token.encode("utf-8"), data.encode("utf-8"), hashlib.sha1).digest()).decode("utf-8")

        assert validate_twilio_signature(url, params, valid_sig, auth_token) is True
        assert validate_twilio_signature(url, params, "invalid_sig", auth_token) is False

    def test_quiet_hours(self):
        from datetime import time
        # 22:00 UTC should be inside quiet hours (21:30 - 07:00)
        t_inside = datetime(2026, 10, 9, 22, 0, tzinfo=timezone.utc)
        assert is_in_quiet_hours("21:30", "07:00", t_inside) is True

        # 10:00 UTC should be outside quiet hours
        t_outside = datetime(2026, 10, 9, 10, 0, tzinfo=timezone.utc)
        assert is_in_quiet_hours("21:30", "07:00", t_outside) is False


# ============================================================================
# 4. Image Classifier Tests (§3.3, §3.6, Gap 7)
# ============================================================================

class TestImageClassification:
    @pytest.mark.asyncio
    async def test_classify_glucometer(self):
        res = await classify_and_read_image("https://media.twilio.com/photo1", context_hint="glucometer meter display 135")
        assert res.kind == "glucometer"
        assert res.glucose_value == 135.0

    @pytest.mark.asyncio
    async def test_classify_meal(self):
        res = await classify_and_read_image("https://media.twilio.com/photo2", context_hint="dal roti lunch meal plate")
        assert res.kind == "meal"


# ============================================================================
# 5. Escalation Ladder & Multi-Channel Tests (§5, Gaps 3, 8, 9)
# ============================================================================

class TestEscalationPipeline:
    @pytest.mark.asyncio
    async def test_immediate_0min_caregiver_alert(self):
        session = AsyncMock()
        risk_evt = MagicMock()
        risk_evt.id = "risk_001"
        risk_evt.type = "critical_hypoglycemia"

        patient = MagicMock()
        patient.id = "pt_001"
        patient.name = "Ramesh"

        cg_rel = MagicMock()
        cg_rel.permissions = {"view_raw_glucose": False}
        cg_user = MagicMock()
        cg_user.phone = "+919811122233"
        cg_user.language = "en"

        mock_res = MagicMock()
        mock_res.first.return_value = (cg_rel, cg_user)
        session.execute.return_value = mock_res

        with patch("apps.api.app.modules.risk.escalation.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            sent = await trigger_immediate_0min_caregiver_alert(session, risk_evt, patient, glucose_val=55.0)

        assert sent is True
        assert mock_send.called
        call_kwargs = mock_send.call_args[1]
        assert call_kwargs["to_phone"] == "+919811122233"
        assert "caregiver_critical_alert" in call_kwargs["template_key"]

    @pytest.mark.asyncio
    async def test_multi_channel_acknowledgement(self):
        session = AsyncMock()
        risk_evt = MagicMock()
        risk_evt.id = "risk_001"
        risk_evt.status = "active"

        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = risk_evt
        session.execute.return_value = mock_res

        # Test WhatsApp button acknowledgement
        ok = await acknowledge_risk_event(session, "risk_001", actor_id="cg_01", via="whatsapp_button")
        assert ok is True
        assert risk_evt.status == "acknowledged"
        assert risk_evt.acknowledged_by == "cg_01"
        assert risk_evt.acknowledged_via == "whatsapp_button"
        assert risk_evt.acknowledged_at is not None


# ============================================================================
# 6. Webhook Endpoints Integration Tests (§7.1, §7.2, §7.5)
# ============================================================================

from httpx import AsyncClient, ASGITransport
from apps.api.app.main import app
from apps.api.app.core.database import get_db
from apps.api.app.core.config import settings


@pytest.fixture(autouse=True)
def _allow_unsigned_webhooks(monkeypatch):
    # These tests post unsigned requests; signature enforcement is covered in
    # tests/test_whatsapp_safety_fixes.py.
    monkeypatch.setattr(settings, "TWILIO_VALIDATE_SIGNATURE", False)

class TestWebhookEndpoints:
    @pytest.mark.asyncio
    async def test_webhook_unknown_number_rejected_politely(self):
        mock_db = AsyncMock()
        mock_pt_res = MagicMock()
        mock_pt_res.scalar_one_or_none.return_value = None
        mock_cg_res = MagicMock()
        mock_cg_res.scalar_one_or_none.return_value = None
        mock_db.execute.side_effect = [
            MagicMock(scalar_one_or_none=lambda: None), # duplicate check
            mock_pt_res, # patient lookup
            mock_cg_res, # caregiver lookup
        ]

        app.dependency_overrides[get_db] = lambda: mock_db
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/v1/webhooks/whatsapp",
                data={"From": "whatsapp:+919999999999", "Body": "sugar 140", "MessageSid": "SM_unreg"}
            )
            assert res.status_code == 200
            assert "not registered" in res.text.lower() or "नोंदणीकृत" in res.text or "पंजीकृत" in res.text
        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_webhook_echo_confirmation_and_save(self):
        mock_db = AsyncMock()
        patient = MagicMock()
        patient.id = "pt_ramesh_001"
        patient.name = "Ramesh Patel"
        patient.phone = "+919800000001"
        patient.language = "en"

        # Mock lookups: duplicate -> patient -> caregiver (None) -> conv_state (None)
        mock_db.execute.side_effect = [
            MagicMock(scalar_one_or_none=lambda: None), # duplicate check
            MagicMock(scalar_one_or_none=lambda: patient), # patient lookup
            MagicMock(scalar_one_or_none=lambda: None), # caregiver lookup
            MagicMock(scalar_one_or_none=lambda: None), # active conv state
        ]

        app.dependency_overrides[get_db] = lambda: mock_db
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/v1/webhooks/whatsapp",
                data={"From": "whatsapp:+919800000001", "Body": "140", "MessageSid": "SM_echo_1"}
            )
            assert res.status_code == 200
            assert "140" in res.text
            assert "correct" in res.text.lower()
        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_webhook_voice_twiml_and_gather(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Test voice call TwiML endpoint
            res_voice = await client.post("/v1/webhooks/twilio/voice?risk_event_id=risk_test_1&lang=en")
            assert res_voice.status_code == 200
            assert res_voice.headers["content-type"] == "application/xml"
            assert "<Gather" in res_voice.text
            assert "numDigits=\"1\"" in res_voice.text

            # 2. Test voice gather endpoint
            mock_db = AsyncMock()
            mock_risk = MagicMock()
            mock_risk.id = "risk_test_1"
            mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_risk)

            app.dependency_overrides[get_db] = lambda: mock_db
            res_gather = await client.post(
                "/v1/webhooks/twilio/voice/gather?risk_event_id=risk_test_1",
                data={"Digits": "1"}
            )
            assert res_gather.status_code == 200
            assert "confirmation has been recorded" in res_gather.text.lower()
            assert mock_risk.status == "acknowledged"
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_webhook_button_dose_taken(self):
        mock_db = AsyncMock()
        patient = MagicMock()
        patient.id = "pt_ramesh_001"
        patient.phone = "+919800000001"
        patient.language = "en"

        mock_db.execute.side_effect = [
            MagicMock(scalar_one_or_none=lambda: None), # duplicate check
            MagicMock(scalar_one_or_none=lambda: patient), # patient lookup
            MagicMock(scalar_one_or_none=lambda: None), # caregiver lookup
        ]

        app.dependency_overrides[get_db] = lambda: mock_db
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/v1/webhooks/whatsapp",
                data={"From": "whatsapp:+919800000001", "ButtonPayload": "dose_taken:sched_101", "MessageSid": "SM_btn_1"}
            )
            assert res.status_code == 200
            assert "dose" in res.text.lower() or "taken" in res.text.lower()
        app.dependency_overrides.clear()

