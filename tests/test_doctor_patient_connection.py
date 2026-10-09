import pytest
from starlette.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)

def test_get_patient_connection_code():
    """Verify patient can fetch their unique 6-character connection code and invite link."""
    res = client.get("/v1/patients/pt_ramesh_001/connection-code")
    assert res.status_code == 200
    data = res.json()
    assert "connection_code" in data
    assert data["connection_code"].startswith("DIA-")
    assert len(data["connection_code"]) >= 7  # e.g. DIA-RAM789
    assert "invite_link" in data
    assert data["patient_id"] == "pt_ramesh_001"

def test_get_clinician_patient_roster():
    """Verify clinician roster returns patients with calculated triage severity, TIR %, and alert metrics."""
    res = client.get(
        "/v1/clinicians/doc_mehta_101/patients",
        headers={"X-User-Role": "clinician", "X-User-ID": "doc_mehta_101"}
    )
    assert res.status_code == 200
    roster = res.json()
    assert isinstance(roster, list)
    assert len(roster) >= 3

    # Verify patient schema fields
    for p in roster:
        assert "id" in p
        assert "name" in p
        assert "severity" in p
        assert p["severity"] in ["critical", "watch", "stable"]
        assert "tir_percentage" in p
        assert "connection_code" in p

def test_connect_patient_by_code_success():
    """Verify clinician can link patient using valid connection code."""
    res = client.post(
        "/v1/clinicians/connect-patient",
        headers={"X-User-Role": "clinician", "X-User-ID": "doc_mehta_101"},
        json={
            "doctor_id": "doc_mehta_101",
            "connection_code": "DIA-RAM789"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["patient"]["id"] == "pt_ramesh_001"
    assert "successfully connected" in data["message"].lower()

def test_connect_patient_by_code_invalid():
    """Verify entering an invalid / non-existent connection code returns 404."""
    res = client.post(
        "/v1/clinicians/connect-patient",
        headers={"X-User-Role": "clinician", "X-User-ID": "doc_mehta_101"},
        json={
            "doctor_id": "doc_mehta_101",
            "connection_code": "DIA-INVALID999"
        }
    )
    assert res.status_code == 404
    data = res.json()
    assert "no patient found" in data["detail"].lower()

def test_patient_meal_history_endpoint():
    """Verify clinician can inspect real food logs logged by the patient."""
    res = client.get(
        "/v1/meals/history/pt_ramesh_001",
        headers={"X-User-Role": "clinician", "X-User-ID": "doc_mehta_101"}
    )
    assert res.status_code == 200
    meals = res.json()
    assert isinstance(meals, list)
    assert len(meals) >= 1
    
    first_meal = meals[0]
    assert "foods_summary" in first_meal
    assert "estimated_carbs_g" in first_meal
    assert "carbohydrate_impact" in first_meal

def test_connect_patient_by_dynamic_google_doctor_id():
    """Verify dynamic Google OAuth doctor IDs satisfy foreign key constraints upon patient linking."""
    dynamic_doc_id = "goog_8e45719a"
    res = client.post(
        "/v1/clinicians/connect-patient",
        headers={"X-User-Role": "clinician", "X-User-ID": dynamic_doc_id},
        json={
            "doctor_id": dynamic_doc_id,
            "connection_code": "DIA-SHA402"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["patient"]["id"] == "pt_shanti_002"

def test_google_auth_syncs_user_to_db():
    """Verify Google OAuth endpoint persists user profile to database."""
    res = client.post(
        "/v1/auth/google",
        json={
            "email": "dr.dynamic.test@diabeto.care",
            "name": "Dr Dynamic Test",
            "role": "clinician"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "dr.dynamic.test@diabeto.care"
    assert data["user"]["id"].startswith("goog_")

def test_get_patient_connection_code_dynamic_google_patient_id():
    """Verify fetching connection code for dynamic Google patient ID creates patient & returns valid code without 404."""
    res = client.get("/v1/patients/goog_8e45719a/connection-code")
    assert res.status_code == 200
    data = res.json()
    assert data["patient_id"] == "goog_8e45719a"
    assert "connection_code" in data
    assert data["connection_code"].startswith("DIA-")
    assert "invite_link" in data

