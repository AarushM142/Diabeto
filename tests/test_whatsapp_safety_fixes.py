"""
Regression tests for the five WhatsApp safety fixes:
1. Reading confirmation matches whole replies ("nahi"/"change"/"sugar 150 hai" are not yes).
2. Low sugar gets low-sugar advice, and caregivers are told it is low.
3. Caregiver acknowledgement needs an exact ack reply ("is she ok?" does not ack).
4. Caregiver messages never fall through to a patient record.
5. Twilio webhooks require a valid signature (a missing header is rejected).
"""
import base64
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.app.channels.reply_intents import is_affirmative, is_caregiver_ack, is_negative
from apps.api.app.channels.twilio_validator import validate_twilio_signature
from apps.api.app.core.config import settings
from apps.api.app.core.database import get_db
from apps.api.app.main import app
from apps.api.app.models.entities import HealthEvent
from apps.api.app.modules.risk.escalation import (
    caregiver_level_word,
    is_low_glucose_risk,
    trigger_immediate_0min_caregiver_alert,
)

WEBHOOK = "/v1/webhooks/whatsapp"


@pytest.fixture
def unsigned_ok(monkeypatch):
    monkeypatch.setattr(settings, "TWILIO_VALIDATE_SIGNATURE", False)


@pytest.fixture
def signatures_on(monkeypatch):
    monkeypatch.setattr(settings, "TWILIO_VALIDATE_SIGNATURE", True)
    monkeypatch.setattr(settings, "TWILIO_AUTH_TOKEN", "test_auth_token_123")
    monkeypatch.setattr(settings, "PUBLIC_BASE_URL", None)


def _result(value):
    """A db.execute() result whose scalar_one_or_none() returns value."""
    return MagicMock(scalar_one_or_none=lambda: value)


def _patient(lang="en"):
    p = MagicMock()
    p.id = "pt_test_001"
    p.name = "Test Patient"
    p.phone = "+919800000001"
    p.language = lang
    return p


def _caregiver(lang="en"):
    cg = MagicMock()
    cg.id = "cg_test_001"
    cg.language = lang
    return cg


def _pending_reading(mgdl=58.0):
    state = MagicMock()
    state.state = "awaiting_reading_confirmation"
    state.expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    state.payload = {"mgdl": mgdl, "context": "fasting", "source": "text"}
    return state


def _health_events_added(mock_db):
    return [c.args[0] for c in mock_db.add.call_args_list if isinstance(c.args[0], HealthEvent)]


async def _post(mock_db, data, headers=None):
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(WEBHOOK, data=data, headers=headers or {})
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 1. Whole-message reply matching
# ---------------------------------------------------------------------------

class TestReplyIntents:
    @pytest.mark.parametrize("text", ["nahi", "Nahi!", "change", "sugar 150 hai", "no", "नहीं", "बदला", "hello"])
    def test_not_affirmative(self, text):
        assert not is_affirmative(text)

    @pytest.mark.parametrize("text", ["yes", "Yes, save", "haan", "ha", "ok", "सही है", "हाँ, सहेजें", "होय, सेव्ह करा", "होय"])
    def test_affirmative(self, text):
        assert is_affirmative(text)

    @pytest.mark.parametrize("text", ["nahi", "no", "change", "Change", "नहीं", "फिर से", "बदला", "पुन्हा नोंदवा"])
    def test_negative(self, text):
        assert is_negative(text)

    @pytest.mark.parametrize("text", ["is she ok?", "call me at 10", "book appointment", "not ok", "her sugar is 250"])
    def test_not_caregiver_ack(self, text):
        assert not is_caregiver_ack(text)

    @pytest.mark.parametrize("text", ["OK", "ok.", "I've checked", "checked", "1", "देख लिया", "मी पाहिले"])
    def test_caregiver_ack(self, text):
        assert is_caregiver_ack(text)


@pytest.mark.usefixtures("unsigned_ok")
class TestReadingConfirmation:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("reply", ["nahi", "change"])
    async def test_no_discards_pending_reading(self, reply):
        state = _pending_reading(58.0)
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [_result(None), _result(_patient()), _result(None), _result(state)]

        res = await _post(mock_db, {"From": "whatsapp:+919800000001", "Body": reply, "MessageSid": f"SM_{reply}"})

        assert res.status_code == 200
        assert "again" in res.text.lower()
        assert _health_events_added(mock_db) == []

    @pytest.mark.asyncio
    async def test_new_number_replaces_pending_reading_instead_of_confirming(self):
        state = _pending_reading(58.0)
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [_result(None), _result(_patient()), _result(None), _result(state)]

        res = await _post(mock_db, {"From": "whatsapp:+919800000001", "Body": "sugar 150 hai", "MessageSid": "SM_new"})

        assert res.status_code == 200
        assert "150" in res.text and "correct" in res.text.lower()
        assert state.payload["mgdl"] == 150.0
        assert _health_events_added(mock_db) == []

    @pytest.mark.asyncio
    async def test_yes_saves_pending_reading(self):
        state = _pending_reading(140.0)
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [_result(None), _result(_patient()), _result(None), _result(state)]

        with patch("apps.api.app.channels.whatsapp.evaluate_and_record_risk", new_callable=AsyncMock, return_value=None):
            res = await _post(mock_db, {"From": "whatsapp:+919800000001", "Body": "haan", "MessageSid": "SM_yes"})

        assert res.status_code == 200
        saved = _health_events_added(mock_db)
        assert len(saved) == 1 and saved[0].value["mgdl"] == 140.0


# ---------------------------------------------------------------------------
# 2. Low sugar is treated as low
# ---------------------------------------------------------------------------

class TestLowGlucoseDirection:
    def test_low_types(self):
        assert is_low_glucose_risk("critical_hypoglycemia")
        assert is_low_glucose_risk("low_glucose")
        assert not is_low_glucose_risk("critical_hyperglycemia")
        assert not is_low_glucose_risk("consecutive_high")

    def test_caregiver_level_words(self):
        assert caregiver_level_word("low_glucose", 75, view_raw=False) == "low"
        assert caregiver_level_word("low_glucose", 75, view_raw=True) == "75 mg/dL (low)"
        assert caregiver_level_word("low_glucose", 75, view_raw=False, lang="hi") == "कम"
        assert caregiver_level_word("critical_hypoglycemia", 58, view_raw=False, lang="mr") == "खूप कमी"
        assert caregiver_level_word("consecutive_high", 230, view_raw=False) == "high on several readings"

    @pytest.mark.asyncio
    async def test_caregiver_alert_for_low_glucose_says_low(self):
        session = AsyncMock()
        cg_rel = MagicMock(permissions={"view_raw_glucose": False})
        cg_user = MagicMock(phone="+919811122233", language="en")
        session.execute.return_value = MagicMock(first=lambda: (cg_rel, cg_user))
        risk = MagicMock(id="risk_low", type="low_glucose", severity="urgent")
        patient = MagicMock(id="pt_1")
        patient.name = "Ramesh"

        with patch("apps.api.app.modules.risk.escalation.send_whatsapp_message", new_callable=AsyncMock, return_value=True) as send:
            await trigger_immediate_0min_caregiver_alert(session, risk, patient, glucose_val=75.0)

        body = send.call_args.kwargs["body_text"]
        assert "low" in body and "high" not in body.lower()

    @pytest.mark.asyncio
    async def test_patient_with_low_reading_gets_low_advice(self, unsigned_ok):
        state = _pending_reading(75.0)
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [_result(None), _result(_patient()), _result(None), _result(state)]
        risk = MagicMock(id="risk_low", type="low_glucose", severity="urgent")

        with patch("apps.api.app.channels.whatsapp.evaluate_and_record_risk", new_callable=AsyncMock, return_value=risk), \
             patch("apps.api.app.channels.whatsapp.trigger_immediate_0min_caregiver_alert", new_callable=AsyncMock) as alert:
            res = await _post(mock_db, {"From": "whatsapp:+919800000001", "Body": "yes", "MessageSid": "SM_low"})

        assert res.status_code == 200
        assert "low" in res.text and "higher" not in res.text.lower()
        assert "teaspoons of sugar" in res.text
        alert.assert_awaited_once()


# ---------------------------------------------------------------------------
# 3 & 4. Caregiver messages
# ---------------------------------------------------------------------------

@pytest.mark.usefixtures("unsigned_ok")
class TestCaregiverMessages:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("text", ["is she ok?", "her sugar is 250", "STOP"])
    async def test_non_ack_message_is_not_actioned(self, text):
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [_result(None), _result(None), _result(_caregiver())]

        with patch("apps.api.app.channels.whatsapp.acknowledge_risk_event", new_callable=AsyncMock) as ack:
            res = await _post(mock_db, {"From": "whatsapp:+919811122233", "Body": text, "MessageSid": "SM_cg_text"})

        assert res.status_code == 200
        assert "receives diabeto alerts" in res.text.lower()
        ack.assert_not_awaited()
        assert _health_events_added(mock_db) == []

    @pytest.mark.asyncio
    async def test_exact_ok_acknowledges_latest_alert(self):
        latest = MagicMock(id="risk_9")
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            _result(None), _result(None), _result(_caregiver()),
            MagicMock(scalars=lambda: MagicMock(first=lambda: latest)),
        ]

        with patch("apps.api.app.channels.whatsapp.acknowledge_risk_event", new_callable=AsyncMock) as ack:
            res = await _post(mock_db, {"From": "whatsapp:+919811122233", "Body": "OK", "MessageSid": "SM_cg_ok"})

        assert res.status_code == 200
        ack.assert_awaited_once()
        assert ack.call_args.args[1] == "risk_9"
        assert ack.call_args.kwargs["via"] == "whatsapp_text"

    @pytest.mark.asyncio
    async def test_ack_button_for_another_patients_alert_is_ignored(self):
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [_result(None), _result(None), _result(_caregiver()), _result(None)]

        with patch("apps.api.app.channels.whatsapp.acknowledge_risk_event", new_callable=AsyncMock) as ack:
            res = await _post(mock_db, {"From": "whatsapp:+919811122233", "ButtonPayload": "ack:risk_other", "MessageSid": "SM_cg_btn"})

        assert res.status_code == 200
        ack.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_ack_button_for_own_alert_acknowledges(self):
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [_result(None), _result(None), _result(_caregiver()), _result("risk_mine")]

        with patch("apps.api.app.channels.whatsapp.acknowledge_risk_event", new_callable=AsyncMock) as ack:
            res = await _post(mock_db, {"From": "whatsapp:+919811122233", "ButtonPayload": "ack:risk_mine", "MessageSid": "SM_cg_btn2"})

        assert res.status_code == 200
        ack.assert_awaited_once()
        assert ack.call_args.args[1] == "risk_mine"


# ---------------------------------------------------------------------------
# 5. Twilio signatures
# ---------------------------------------------------------------------------

def _sign(url, params, token="test_auth_token_123"):
    data = url + "".join(f"{k}{params[k]}" for k in sorted(params))
    return base64.b64encode(hmac.new(token.encode(), data.encode(), hashlib.sha1).digest()).decode()


class TestTwilioSignatures:
    def test_missing_signature_never_validates(self):
        assert validate_twilio_signature("https://x/y", {"a": "1"}, None, "token") is False
        assert validate_twilio_signature("https://x/y", {"a": "1"}, "sig", None) is False

    @pytest.mark.asyncio
    async def test_unsigned_form_post_rejected(self, signatures_on):
        res = await _post(AsyncMock(), {"From": "whatsapp:+919800000001", "Body": "140"})
        assert res.status_code == 403

    @pytest.mark.asyncio
    async def test_wrong_signature_rejected(self, signatures_on):
        res = await _post(AsyncMock(), {"From": "whatsapp:+919800000001", "Body": "140"}, headers={"X-Twilio-Signature": "bogus"})
        assert res.status_code == 403

    @pytest.mark.asyncio
    async def test_unsigned_json_post_rejected(self, signatures_on):
        app.dependency_overrides[get_db] = lambda: AsyncMock()
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post(WEBHOOK, json={"entry": []})
        finally:
            app.dependency_overrides.clear()
        assert res.status_code == 403

    @pytest.mark.asyncio
    async def test_valid_signature_accepted(self, signatures_on):
        params = {"From": "whatsapp:+919999999999", "Body": "140", "MessageSid": "SM_signed"}
        sig = _sign(f"http://test{WEBHOOK}", params)
        mock_db = AsyncMock()
        mock_db.execute.side_effect = [_result(None), _result(None), _result(None)]  # dup, patient, caregiver

        res = await _post(mock_db, params, headers={"X-Twilio-Signature": sig})

        assert res.status_code == 200
        assert "not registered" in res.text.lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("path", [
        "/v1/webhooks/twilio/voice/gather?risk_event_id=risk_1",
        "/v1/webhooks/twilio/voice?risk_event_id=risk_1",
        "/v1/webhooks/twilio/status",
        "/v1/webhooks/twilio/sms",
    ])
    async def test_other_twilio_endpoints_require_signature(self, signatures_on, path):
        app.dependency_overrides[get_db] = lambda: AsyncMock()
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post(path, data={"Digits": "1", "MessageSid": "SM_x", "MessageStatus": "failed", "Body": "OK"})
        finally:
            app.dependency_overrides.clear()
        assert res.status_code == 403
