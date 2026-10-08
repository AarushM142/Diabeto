import pytest
from datetime import datetime, timezone, timedelta
from apps.api.app.modules.escalation.service import (
    generate_twiml_ivr,
    check_active_cooldown,
    find_patient_caregivers,
    dispatch_emergency_escalation,
    acknowledge_emergency,
)

def test_generate_twiml_ivr_multilingual():
    # Test English
    twiml_en = generate_twiml_ivr("Ramesh Kulkarni", 52.0, "risk_123", language="en")
    assert "<Response>" in twiml_en
    assert "<Gather" in twiml_en
    assert "Ramesh Kulkarni" in twiml_en
    assert "52 milligrams" in twiml_en
    assert "en-IN" in twiml_en

    # Test Hindi
    twiml_hi = generate_twiml_ivr("Shanti Sharma", 48.0, "risk_456", language="hi")
    assert "<Response>" in twiml_hi
    assert "Shanti Sharma" in twiml_hi
    assert "48 मिलीग्राम" in twiml_hi or "hi-IN" in twiml_hi

    # Test Marathi
    twiml_mr = generate_twiml_ivr("Ramesh Kulkarni", 50.0, "risk_789", language="mr")
    assert "<Response>" in twiml_mr
    assert "mr-IN" in twiml_mr
    assert "साखर" in twiml_mr

def test_check_active_cooldown():
    now = datetime.now(timezone.utc)
    # 5 minutes ago -> within 15-minute cooldown
    assert check_active_cooldown(now - timedelta(minutes=5), cooldown_minutes=15) is True
    # 25 minutes ago -> outside cooldown
    assert check_active_cooldown(now - timedelta(minutes=25), cooldown_minutes=15) is False
    # None -> no previous escalation
    assert check_active_cooldown(None) is False

@pytest.mark.asyncio
async def test_find_patient_caregivers_db():
    from apps.api.app.core.database import async_session_factory
    async with async_session_factory() as session:
        cgs = await find_patient_caregivers(session, "pt_ramesh_001")
        assert len(cgs) >= 1
        assert any(cg["name"] == "Rohit Kulkarni" for cg in cgs)

@pytest.mark.asyncio
async def test_dispatch_and_cooldown_flow():
    from apps.api.app.core.database import async_session_factory
    async with async_session_factory() as session:
        # 1. First Dispatch (forced to guarantee execution)
        res1 = await dispatch_emergency_escalation(
            db=session,
            patient_id="pt_ramesh_001",
            glucose_mgdl=54.0,
            reason="Test severe hypoglycemia",
            force_dispatch=True,
        )
        assert res1["status"] == "dispatched"
        assert res1["recipients_notified"] >= 1
        assert len(res1["dispatches"]) >= 1
        d0 = res1["dispatches"][0]
        assert d0["call_sid"] is not None
        assert d0["sms_sid"] is not None
        assert "54 mg/dL" in res1["emergency_sms_preview"]

        # 2. Immediate Second Dispatch without force -> Cooldown Suppression
        res2 = await dispatch_emergency_escalation(
            db=session,
            patient_id="pt_ramesh_001",
            glucose_mgdl=53.0,
            force_dispatch=False,
        )
        assert res2["status"] == "suppressed_cooldown"

        # 3. Third Dispatch with force_dispatch=True -> Bypasses Cooldown
        res3 = await dispatch_emergency_escalation(
            db=session,
            patient_id="pt_ramesh_001",
            glucose_mgdl=49.0,
            force_dispatch=True,
        )
        assert res3["status"] == "dispatched"

@pytest.mark.asyncio
async def test_escalation_api_endpoints():
    from httpx import AsyncClient, ASGITransport
    from apps.api.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. TwiML Preview
        prev = await client.get("/v1/escalations/twiml/preview?patient_name=Ramesh&glucose_mgdl=50&language=mr")
        assert prev.status_code == 200
        assert prev.headers["content-type"].startswith("application/xml")
        assert "<Response>" in prev.text

        # 2. Trigger Emergency Escalation
        payload = {
            "glucose_mgdl": 52.0,
            "reason": "Sudden drop detected in morning testing",
            "force_dispatch": True,
        }
        res = await client.post("/v1/patients/pt_ramesh_001/escalate/emergency", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "dispatched"
        assert data["patient_id"] == "pt_ramesh_001"
        risk_event_id = data["risk_event_id"]

        # 3. View Escalations History
        hist = await client.get("/v1/patients/pt_ramesh_001/escalations")
        assert hist.status_code == 200
        hist_data = hist.json()
        assert hist_data["total_escalations"] >= 1

        # 4. Caregiver Phone IVR DTMF Keypad Callback (Caregiver pressed 1 on phone)
        cb = await client.post(
            f"/v1/escalations/twiml/callback?risk_event_id={risk_event_id}&lang=en",
            data={"Digits": "1", "From": "+919822222222"},
        )
        assert cb.status_code == 200
        assert cb.headers["content-type"].startswith("application/xml")
        assert "<Say" in cb.text

        # 5. Direct API Acknowledgment
        ack = await client.post(
            f"/v1/escalations/{risk_event_id}/acknowledge",
            json={"acknowledged_by": "Rohit Kulkarni (Caregiver)", "notes": "Given 3 tsp honey, patient is responsive."},
        )
        assert ack.status_code == 200
        assert ack.json()["status"] == "acknowledged"
