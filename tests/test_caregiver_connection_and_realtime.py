import random
import pytest
from starlette.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)

def test_caregiver_connection_flow():
    rand_phone = f"+9198{random.randint(10000000, 99999999)}"
    rand_cg_id = f"cg_test_{random.randint(1000, 9999)}"

    # 1. Create a dynamic test patient
    create_payload = {
        "clinic_id": "clinic_pune_central",
        "name": "Dattatray Deshmukh",
        "age": 74,
        "gender": "male",
        "phone": rand_phone,
        "language": "mr",
        "consent_flags": {"whatsapp": True, "voice": True}
    }
    create_res = client.post("/v1/patients", json=create_payload)
    assert create_res.status_code == 201
    patient_data = create_res.json()
    patient_id = patient_data["id"]

    # 2. Get connection code for patient
    code_res = client.get(f"/v1/patients/{patient_id}/connection-code")
    assert code_res.status_code == 200
    code_data = code_res.json()
    assert "connection_code" in code_data
    connection_code = code_data["connection_code"]
    assert connection_code.startswith("DIA-")

    # 3. Connect caregiver using code
    connect_payload = {
        "caregiver_id": rand_cg_id,
        "connection_code": connection_code
    }
    connect_res = client.post("/v1/caregivers/connect-patient", json=connect_payload)
    assert connect_res.status_code == 200
    connect_data = connect_res.json()
    assert connect_data["success"] is True
    assert connect_data["patient"]["name"] == "Dattatray Deshmukh"

    # 4. Caregiver gets their patient roster
    roster_res = client.get(f"/v1/caregivers/{rand_cg_id}/patients")
    assert roster_res.status_code == 200
    roster_data = roster_res.json()
    assert len(roster_data) >= 1
    assert any(p["id"] == patient_id for p in roster_data)

    # 5. Post and retrieve care message in persistent chat
    msg_payload = {
        "sender": "caretaker",
        "author_name": "Pooja Deshmukh",
        "author_id": rand_cg_id,
        "text": "Baba, please take your morning tablet with breakfast.",
        "is_voice": False
    }
    post_msg_res = client.post(f"/v1/care/{patient_id}/messages", json=msg_payload)
    assert post_msg_res.status_code == 201
    msg_data = post_msg_res.json()
    assert msg_data["text"] == msg_payload["text"]

    # 6. List care messages
    list_msg_res = client.get(f"/v1/care/{patient_id}/messages")
    assert list_msg_res.status_code == 200
    messages = list_msg_res.json()
    assert len(messages) >= 1
    assert any(m["text"] == msg_payload["text"] for m in messages)


def test_patient_connect_caregiver_flow():
    """Verify patient can fetch dual invite links and directly connect their family caretaker."""
    rand_phone = f"+9198{random.randint(10000000, 99999999)}"
    rand_cg_phone = f"+9197{random.randint(10000000, 99999999)}"

    # 1. Create a dynamic test patient
    create_res = client.post("/v1/patients", json={
        "clinic_id": "clinic_pune_central",
        "name": "Kavita Raje",
        "age": 68,
        "gender": "female",
        "phone": rand_phone,
        "language": "hi",
        "consent_flags": {"whatsapp": True}
    })
    assert create_res.status_code == 201
    patient_id = create_res.json()["id"]

    # 2. Get connection code — verify doctor and caregiver invite links exist
    code_res = client.get(f"/v1/patients/{patient_id}/connection-code")
    assert code_res.status_code == 200
    code_data = code_res.json()
    assert "doctor_invite_link" in code_data
    assert "caregiver_invite_link" in code_data
    assert "role=caregiver" in code_data["caregiver_invite_link"]
    assert code_data["caregiver_connected"] is False

    # 3. Patient directly links caregiver via POST /v1/patients/{patient_id}/connect-caregiver
    link_res = client.post(f"/v1/patients/{patient_id}/connect-caregiver", json={
        "caregiver_name": "Rohan Deshmukh",
        "caregiver_phone": rand_cg_phone,
        "relation": "Son",
    })
    assert link_res.status_code == 200
    link_data = link_res.json()
    assert link_data["success"] is True
    assert link_data["caregiver"]["name"] == "Rohan Deshmukh"
    assert link_data["caregiver"]["connected"] is True

    # 4. Re-query connection-code — verify caregiver is now connected
    code_res_after = client.get(f"/v1/patients/{patient_id}/connection-code")
    assert code_res_after.status_code == 200
    after_data = code_res_after.json()
    assert after_data["caregiver_connected"] is True
    assert after_data["caregiver_name"] == "Rohan Deshmukh"
    assert after_data["caregiver_relation"] == "Son"

    # 5. Validation test: missing caregiver name or phone returns 400
    bad_res = client.post(f"/v1/patients/{patient_id}/connect-caregiver", json={
        "caregiver_name": "",
        "caregiver_phone": "",
    })
    assert bad_res.status_code == 400
