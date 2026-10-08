import pytest
from apps.api.app.modules.ai_gateway.guardrails import validate_number_fidelity, validate_medical_safety

def test_number_fidelity_passes_with_exact_metrics():
    evidence = {
        "average_glucose_mgdl": 135,
        "lowest_reading_mgdl": 92,
        "peak_reading_mgdl": 178,
    }
    # Output only uses numbers from evidence
    valid_text = "Namaste! Your average sugar level is 135 mg/dL with a low of 92 mg/dL."
    is_valid, msg = validate_number_fidelity(valid_text, evidence)
    assert is_valid is True

def test_number_fidelity_blocks_hallucinated_metrics():
    evidence = {
        "average_glucose_mgdl": 135,
    }
    # Notice 240 is not in evidence
    hallucinated_text = "Your blood sugar spiked to 240 mg/dL yesterday."
    is_valid, msg = validate_number_fidelity(hallucinated_text, evidence)
    assert is_valid is False
    assert "240" in msg

def test_medical_safety_blocks_prescribing_and_dosing():
    unsafe_outputs = [
        "Please increase your dose of Metformin to 1000mg.",
        "You should stop taking your evening medication.",
        "You are diagnosed with chronic renal diabetic disease.",
    ]
    for text in unsafe_outputs:
        is_safe, msg = validate_medical_safety(text)
        assert is_safe is False

def test_medical_safety_allows_supportive_lifestyle_nudges():
    safe_outputs = [
        "Namaste! A 15-minute gentle walk after lunch helps smooth glucose levels.",
        "Remember to drink a glass of water before your evening tea.",
        "Consistent dinner timing around 8:00 PM supports restful sleep.",
    ]
    for text in safe_outputs:
        is_safe, msg = validate_medical_safety(text)
        assert is_safe is True
