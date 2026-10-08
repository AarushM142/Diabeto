import pytest
from apps.api.app.modules.ai_gateway.guardrails import validate_number_fidelity, validate_medical_safety

def test_number_fidelity_success():
    evidence = {"fasting_mgdl": 140, "missed_doses": 2}
    generated_text = "Your fasting sugar was 140 mg/dL today and you had 2 missed doses."
    valid, message = validate_number_fidelity(generated_text, evidence)
    assert valid is True

def test_number_fidelity_hallucination_detected():
    evidence = {"fasting_mgdl": 140}
    # Notice 250 is hallucinated
    generated_text = "Your sugar spiked to 250 mg/dL today."
    valid, message = validate_number_fidelity(generated_text, evidence)
    assert valid is False
    assert "250" in message

def test_banned_medical_patterns():
    # Should catch dosage modifications
    unsafe_text = "Please increase your dose of Metformin to 1000mg."
    valid, message = validate_medical_safety(unsafe_text)
    assert valid is False
    assert "Banned medical pattern" in message

    safe_text = "Great job logging your morning walk. Keep drinking water!"
    valid, message = validate_medical_safety(safe_text)
    assert valid is True
