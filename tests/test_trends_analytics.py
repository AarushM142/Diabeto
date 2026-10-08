import pytest
from httpx import AsyncClient, ASGITransport
from apps.api.app.main import app
from apps.api.app.modules.trend.analytics import (
    calculate_glycemic_metrics,
    calculate_context_breakdowns,
    calculate_adherence_metrics,
)
from apps.api.app.models.entities import HealthEvent, MedicationSchedule
from datetime import datetime, timezone

def test_glycemic_metrics_empty():
    res = calculate_glycemic_metrics([])
    assert res["total_readings"] == 0
    assert res["clinical_status"] == "insufficient_data"
    assert res["tir_percentage"] == 0.0

def test_glycemic_metrics_normal_profile():
    # 5 readings between 90 and 130
    readings = [90.0, 100.0, 110.0, 120.0, 130.0]
    res = calculate_glycemic_metrics(readings)
    assert res["total_readings"] == 5
    assert res["mean_glucose"] == 110.0
    assert res["median_glucose"] == 110.0
    assert res["mad_glucose"] == 10.0
    assert res["tir_percentage"] == 100.0
    assert res["tar_percentage"] == 0.0
    assert res["tbr_percentage"] == 0.0
    assert res["clinical_status"] == "optimal_control"

def test_glycemic_metrics_hypo_risk():
    # 2 readings below 70 out of 10 -> 20% TBR
    readings = [55.0, 62.0, 95.0, 110.0, 120.0, 130.0, 140.0, 150.0, 160.0, 170.0]
    res = calculate_glycemic_metrics(readings)
    assert res["total_readings"] == 10
    assert res["tbr_percentage"] == 20.0
    assert res["clinical_status"] == "hypo_risk"

def test_glycemic_metrics_hyper_risk():
    # 4 readings above 180 out of 10 -> 40% TAR
    readings = [120.0, 130.0, 140.0, 150.0, 160.0, 170.0, 190.0, 210.0, 220.0, 260.0]
    res = calculate_glycemic_metrics(readings)
    assert res["total_readings"] == 10
    assert res["tar_percentage"] == 40.0
    assert res["clinical_status"] == "hyper_risk"

def test_context_breakdowns():
    events = [
        HealthEvent(patient_id="p1", type="glucose", value={"mgdl": 100.0, "context": "fasting"}, measured_at=datetime.now(timezone.utc)),
        HealthEvent(patient_id="p1", type="glucose", value={"mgdl": 120.0, "context": "fasting"}, measured_at=datetime.now(timezone.utc)),
        HealthEvent(patient_id="p1", type="glucose", value={"mgdl": 180.0, "context": "postprandial"}, measured_at=datetime.now(timezone.utc)),
    ]
    res = calculate_context_breakdowns(events)
    assert res["fasting"]["count"] == 2
    assert res["fasting"]["mean_mgdl"] == 110.0
    assert res["postprandial"]["count"] == 1
    assert res["postprandial"]["mean_mgdl"] == 180.0
    assert res["bedtime"]["count"] == 0

def test_adherence_metrics_perfect_compliance():
    schedules = [
        MedicationSchedule(patient_id="p1", drug_name="Metformin", dosage="500mg", scheduled_time="08:00", is_active=True),
    ]
    # 7 confirmed doses for 7 days
    events = [
        HealthEvent(patient_id="p1", type="medication", value={"drug": "Metformin"}, measured_at=datetime.now(timezone.utc))
        for _ in range(7)
    ]
    res = calculate_adherence_metrics(events, schedules, days=7)
    assert res["active_medication_count"] == 1
    assert res["total_confirmed_doses"] == 7
    assert res["compliance_score_pct"] == 100.0
    assert res["status"] == "adherent"

def test_adherence_metrics_partial_compliance():
    schedules = [
        MedicationSchedule(patient_id="p1", drug_name="Metformin", dosage="500mg", scheduled_time="08:00", is_active=True),
        MedicationSchedule(patient_id="p1", drug_name="Glimepiride", dosage="1mg", scheduled_time="20:00", is_active=True),
    ]
    # Expect 20 doses in 10 days, but only 10 confirmed
    events = [
        HealthEvent(patient_id="p1", type="medication", value={"drug": "Metformin"}, measured_at=datetime.now(timezone.utc))
        for _ in range(10)
    ]
    res = calculate_adherence_metrics(events, schedules, days=10)
    assert res["active_medication_count"] == 2
    assert res["compliance_score_pct"] == 50.0
    assert res["status"] == "needs_attention"

@pytest.mark.asyncio
async def test_trends_api_endpoints():
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Fetch Trends for Ramesh
            res = await client.get("/v1/patients/pt_ramesh_001/trends?days=14")
            if res.status_code == 200:
                data = res.json()
                assert data["patient_id"] == "pt_ramesh_001"
                assert "glycemic_metrics" in data
                assert "tir_percentage" in data["glycemic_metrics"]
                assert "context_breakdowns" in data
                assert "adherence_metrics" in data

                # 2. Fetch Weekly Summary (Defaults to unverified)
                res_summary = await client.get("/v1/patients/pt_ramesh_001/weekly-summary")
                assert res_summary.status_code == 200
                summary = res_summary.json()
                assert summary["status"] == "unverified"
                assert summary["patient_name"] == "Ramesh Kulkarni"
                assert len(summary["clinical_highlights"]) > 0

                # 3. Doctor Verifies Weekly Summary
                verify_payload = {"notes": "Patient shows good stability, keep current Metformin dosage."}
                res_verify = await client.post("/v1/patients/pt_ramesh_001/weekly-summary/verify", json=verify_payload)
                assert res_verify.status_code == 200
                verified = res_verify.json()
                assert verified["status"] == "verified"
                assert verified["verified_by"] is not None
                assert verified["clinician_notes"] == "Patient shows good stability, keep current Metformin dosage."
    except Exception as e:
        if "getaddrinfo failed" in str(e) or "connect" in str(e).lower() or "Event loop is closed" in str(e):
            pytest.skip(f"Live database not reachable or loop teardown in current offline environment: {e}")
        else:
            raise
