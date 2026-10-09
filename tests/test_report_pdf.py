import pytest
from apps.api.app.modules.trend.report_generator import generate_clinical_pdf_report

def test_generate_clinical_pdf_report_full_data():
    patient = {
        "id": "pt_ramesh_001",
        "name": "Ramesh Patel",
        "age": 68,
        "gender": "male",
        "phone": "+91 98200 12345",
        "language": "gu",
    }
    clinic = {
        "name": "Diabeto Senior Diabetes Clinic",
        "address": "Shivaji Nagar, Pune, MH 411005",
    }
    clinician = {
        "name": "Dr. Arvind Mehta, MD",
        "phone": "+91 98111 11111",
    }
    events = [
        {
            "id": "evt_1",
            "type": "glucose",
            "value": {"mgdl": 115, "context": "fasting"},
            "measured_at": "2026-10-08T08:00:00Z",
            "reported_by": "patient",
        },
        {
            "id": "evt_2",
            "type": "glucose",
            "value": {"mgdl": 160, "context": "post_meal"},
            "measured_at": "2026-10-08T13:30:00Z",
            "reported_by": "patient",
        },
        {
            "id": "evt_3",
            "type": "glucose",
            "value": {"mgdl": 130, "context": "bedtime"},
            "measured_at": "2026-10-08T21:00:00Z",
            "reported_by": "patient",
        },
    ]
    meds = [
        {
            "drug_name": "Metformin",
            "dosage": "500mg",
            "scheduled_time": "08:00",
            "instructions": "With breakfast",
            "is_active": True,
        },
        {
            "drug_name": "Glimepiride",
            "dosage": "1mg",
            "scheduled_time": "08:00",
            "instructions": "Before breakfast",
            "is_active": True,
        },
    ]
    notes = "Patient glycemic control is stable. Advised 30 mins brisk morning walk."

    buffer = generate_clinical_pdf_report(
        patient=patient,
        clinic=clinic,
        clinician=clinician,
        events=events,
        medications=meds,
        notes=notes,
    )

    pdf_bytes = buffer.getvalue()
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF-")

def test_generate_clinical_pdf_report_sparse_data():
    patient = {
        "id": "pt_new_002",
        "name": "Kavita Sharma",
        "age": 72,
        "gender": "female",
    }
    # No events, no medications, no clinic or doctor passed
    buffer = generate_clinical_pdf_report(
        patient=patient,
        events=[],
        medications=[],
    )

    pdf_bytes = buffer.getvalue()
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")

def test_generate_clinical_pdf_report_high_risk_hypoglycemia():
    patient = {
        "id": "pt_risk_003",
        "name": "Suresh Rao",
        "age": 75,
        "gender": "male",
    }
    events = [
        {"type": "glucose", "value": {"mgdl": 55, "context": "fasting"}, "measured_at": "2026-10-08T08:00:00Z"},
        {"type": "glucose", "value": {"mgdl": 62, "context": "fasting"}, "measured_at": "2026-10-07T08:00:00Z"},
    ]
    buffer = generate_clinical_pdf_report(patient=patient, events=events)
    pdf_bytes = buffer.getvalue()
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")


@pytest.mark.asyncio
async def test_clinical_report_endpoints():
    from httpx import AsyncClient, ASGITransport
    from apps.api.app.main import app

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            # 1. Test 404 for non-existent patient
            res_404 = await client.get("/v1/patients/non_existent_patient_id/report/pdf")
            assert res_404.status_code == 404

            # 2. Test 200 for seeded patient pt_ramesh_001
            res_pdf = await client.get("/v1/patients/pt_ramesh_001/report/pdf")
            assert res_pdf.status_code == 200
            assert res_pdf.headers["content-type"] == "application/pdf"
            assert res_pdf.headers["X-Report-Status"] == "clinician-verified"
            assert res_pdf.content.startswith(b"%PDF-")

            # 3. Test EHR Summary endpoint
            res_summary = await client.get("/v1/patients/pt_ramesh_001/report/summary")
            assert res_summary.status_code == 200
            data = res_summary.json()
            assert data["resourceType"] == "ClinicalImpression"
            assert data["patient_id"] == "pt_ramesh_001"
            assert "ada_glycemic_metrics" in data
            assert "time_in_range_percent" in data["ada_glycemic_metrics"]
    except Exception as e:
        if "getaddrinfo failed" in str(e) or "connect" in str(e).lower() or "Event loop is closed" in str(e):
            pytest.skip(f"Live database not reachable in current offline environment: {e}")
        else:
            raise

