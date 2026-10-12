import random
import pytest
from starlette.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)

@pytest.fixture
def test_patient():
    rand_phone = f"+9198{random.randint(10000000, 99999999)}"
    res = client.post("/v1/patients", json={
        "clinic_id": "clinic_pune_central",
        "name": "Sharad Joshi",
        "age": 69,
        "gender": "male",
        "phone": rand_phone,
        "language": "mr",
        "consent_flags": {"view_raw_glucose": True}
    })
    assert res.status_code in [200, 201]
    return res.json()

def test_get_patient_connection_code(test_patient):
    """Verify patient can fetch their unique 6-character connection code and invite link."""
    patient_id = test_patient["id"]
    res = client.get(f"/v1/patients/{patient_id}/connection-code")
    assert res.status_code == 200
    data = res.json()
    assert "connection_code" in data
    assert data["connection_code"].startswith("DIA-")
    assert len(data["connection_code"]) >= 7  # e.g. DIA-SHA123
    assert "invite_link" in data
    assert data["patient_id"] == patient_id

def test_connect_patient_by_code_success(test_patient):
    """Verify clinician can link patient using valid connection code."""
    patient_id = test_patient["id"]
    code_res = client.get(f"/v1/patients/{patient_id}/connection-code")
    code = code_res.json()["connection_code"]

    res = client.post(
        "/v1/clinicians/connect-patient",
        headers={"X-User-Role": "clinician", "X-User-ID": "doc_test_101"},
        json={
            "doctor_id": "doc_test_101",
            "connection_code": code
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["patient"]["id"] == patient_id
    assert "successfully connected" in data["message"].lower()

def test_connect_patient_by_code_invalid():
    """Verify entering an invalid / non-existent connection code returns 404."""
    res = client.post(
        "/v1/clinicians/connect-patient",
        headers={"X-User-Role": "clinician", "X-User-ID": "doc_test_101"},
        json={
            "doctor_id": "doc_test_101",
            "connection_code": "DIA-INVALID999"
        }
    )
    assert res.status_code == 404
    data = res.json()
    assert "no patient found" in data["detail"].lower()

def test_google_auth_syncs_user_to_db():
    """Verify Google OAuth endpoint persists user profile to database."""
    res = client.post(
        "/v1/auth/google",
        json={
            "email": f"dr.dynamic.{random.randint(100,999)}@diabeto.care",
            "name": "Dr Dynamic Test",
            "role": "clinician"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "dr.dynamic." in data["user"]["email"]
    assert data["user"]["id"].startswith("goog_")
