import pytest
from starlette.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)

def test_auth_personas_endpoint():
    res = client.get("/v1/auth/personas")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 4
    roles = [p["role"] for p in data]
    assert "clinician" in roles
    assert "coach" in roles
    assert "caregiver" in roles
    assert "admin" in roles

def test_rbac_caregiver_forbidden_on_clinician_verify():
    # Caregiver cannot sign off clinical weekly summaries
    res_fail = client.post(
        "/v1/patients/pt_ramesh_001/weekly-summary/verify",
        headers={"X-User-Role": "caregiver", "X-User-ID": "cg_ananya_03"},
        json={"notes": "Caregiver trying to sign off"}
    )
    assert res_fail.status_code == 403

def test_rbac_caregiver_forbidden_on_audit_logs():
    # Caregiver cannot access system-wide audit logs
    res_fail = client.get(
        "/v1/audit/logs",
        headers={"X-User-Role": "caregiver", "X-User-ID": "cg_ananya_03"}
    )
    assert res_fail.status_code == 403

def test_auth_me_endpoint():
    res = client.get(
        "/v1/auth/me",
        headers={"X-User-Role": "clinician", "X-User-ID": "doc_mehta_101"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "clinician"
    assert data["user"]["id"] == "doc_mehta_101"

