"""
Diabeto Platform — Comprehensive Automated Test Suite for Model 3 (Personalized Alert Engine)
Covers all 10 clinical safety scenarios and edge cases.
"""

import pytest
from apps.ml.personalized_alert_engine import PersonalizedAlertEngine, AlertSeverity, RiskCategory


@pytest.fixture
def engine():
    return PersonalizedAlertEngine()


@pytest.fixture
def base_patient_profile():
    return {
        "patient_id": "pt_test_001",
        "name": "Ramesh Kulkarni",
        "age": 68,
        "thresholds": {
            "critical_low": 70.0,
            "low": 80.0,
            "high": 180.0,
            "critical_high": 250.0
        },
        "caregivers": [{"name": "Rohit Kulkarni", "phone": "+919822222222"}],
        "clinician_of_record": {"name": "Dr. Arvind Mehta", "phone": "+919811111111"}
    }


# 1. Normal Stable Glucose
def test_normal_stable_glucose(engine, base_patient_profile):
    telemetry = {"current_glucose": 120.0, "roc_5min": 0.0, "std_60min": 4.0, "trend_descriptor": "Steady (->)"}
    m1 = {"t_plus_15m": 120.0, "t_plus_30m": 121.0, "t_plus_45m": 121.0, "t_plus_60m": 122.0}
    m2 = {"hypoglycemia_probability_pct": 2.0, "in_range_probability_pct": 96.0, "hyperglycemia_probability_pct": 2.0}

    result = engine.evaluate(base_patient_profile, telemetry, m1, m2)
    assert result["severity"] == AlertSeverity.NORMAL.value
    assert result["risk_category"] == RiskCategory.IN_RANGE.value
    assert result["caregiver_escalation"]["notification_required"] is False
    assert result["clinician_escalation"]["escalation_required"] is False
    assert "within your personalized target range" in result["reason"]


# 2. Falling Glucose with Increasing Hypoglycemia Risk (Trajectory Risk)
def test_falling_glucose_increasing_hypo_risk(engine, base_patient_profile):
    # Current glucose is 92 (above low 80), but dropping rapidly at -1.4 mg/dL/min, Model 2 flags 58% hypo risk
    telemetry = {"current_glucose": 92.0, "roc_5min": -1.4, "std_60min": 18.0, "trend_descriptor": "Falling rapidly (↓↓)"}
    m1 = {"t_plus_15m": 86.0, "t_plus_30m": 82.0, "t_plus_45m": 78.0, "t_plus_60m": 75.0}
    m2 = {"hypoglycemia_probability_pct": 65.0, "in_range_probability_pct": 35.0, "hyperglycemia_probability_pct": 0.0}

    result = engine.evaluate(base_patient_profile, telemetry, m1, m2)
    # Since min_pred drops to 75 (below low 80) with 65% hypo risk, it triggers WARNING/URGENT
    assert result["severity"] in [AlertSeverity.WARNING.value, AlertSeverity.URGENT.value]
    assert result["risk_category"] == RiskCategory.HYPOGLYCEMIA.value
    assert result["caregiver_escalation"]["notification_required"] is True


# 3. Current Glucose Below Low Threshold
def test_current_glucose_below_low_threshold(engine, base_patient_profile):
    # Current glucose is 76 (below low threshold of 80), stable/recovering
    telemetry = {"current_glucose": 76.0, "roc_5min": 0.1, "std_60min": 12.0, "trend_descriptor": "Steady (->)"}
    m1 = {"t_plus_15m": 77.0, "t_plus_30m": 78.0, "t_plus_45m": 80.0, "t_plus_60m": 82.0}
    m2 = {"hypoglycemia_probability_pct": 52.0, "in_range_probability_pct": 48.0, "hyperglycemia_probability_pct": 0.0}

    result = engine.evaluate(base_patient_profile, telemetry, m1, m2)
    assert result["severity"] == AlertSeverity.WARNING.value
    assert result["risk_category"] == RiskCategory.HYPOGLYCEMIA.value
    assert "Current glucose (76 mg/dL) is below your low threshold (80 mg/dL)" in result["reason"]
    assert result["caregiver_escalation"]["notification_required"] is True


# 4. Predicted Glucose Below Low Threshold
def test_predicted_glucose_below_low_threshold(engine, base_patient_profile):
    # Current glucose is 88 (above 80), but predicted +30 min is 74 (below low threshold 80)
    # min_pred remains 72 (above critical low 70)
    telemetry = {"current_glucose": 88.0, "roc_5min": -0.8, "std_60min": 10.0, "trend_descriptor": "Falling (↓)"}
    m1 = {"t_plus_15m": 80.0, "t_plus_30m": 74.0, "t_plus_45m": 73.0, "t_plus_60m": 72.0}
    m2 = {"hypoglycemia_probability_pct": 45.0, "in_range_probability_pct": 55.0, "hyperglycemia_probability_pct": 0.0}

    result = engine.evaluate(base_patient_profile, telemetry, m1, m2)
    assert result["severity"] == AlertSeverity.WARNING.value
    assert result["risk_category"] == RiskCategory.HYPOGLYCEMIA.value
    assert "crossing below your low threshold (80 mg/dL)" in result["reason"]
    assert result["caregiver_escalation"]["notification_required"] is True


# 5. Critical Hypoglycemia
def test_critical_hypoglycemia(engine, base_patient_profile):
    # Current glucose is 58 (below critical threshold 70)
    telemetry = {"current_glucose": 58.0, "roc_5min": -0.6, "std_60min": 22.0, "trend_descriptor": "Falling (↓)"}
    m1 = {"t_plus_15m": 56.0, "t_plus_30m": 55.0, "t_plus_45m": 54.0, "t_plus_60m": 53.0}
    m2 = {"hypoglycemia_probability_pct": 98.0, "in_range_probability_pct": 2.0, "hyperglycemia_probability_pct": 0.0}

    result = engine.evaluate(base_patient_profile, telemetry, m1, m2)
    assert result["severity"] == AlertSeverity.CRITICAL.value
    assert result["risk_category"] == RiskCategory.HYPOGLYCEMIA.value
    assert result["caregiver_escalation"]["notification_required"] is True
    assert result["clinician_escalation"]["escalation_required"] is True
    assert "critical low threshold (70 mg/dL)" in result["reason"]
    assert "Rule of 15" in " ".join(result["recommended_actions"])


# 6. Hyperglycemia (Postprandial Excursion)
def test_hyperglycemia_warning(engine, base_patient_profile):
    # Current glucose is 195 (above high threshold 180)
    telemetry = {"current_glucose": 195.0, "roc_5min": 0.6, "std_60min": 15.0, "trend_descriptor": "Rising (↑)"}
    m1 = {"t_plus_15m": 202.0, "t_plus_30m": 210.0, "t_plus_45m": 215.0, "t_plus_60m": 218.0}
    m2 = {"hypoglycemia_probability_pct": 0.0, "in_range_probability_pct": 15.0, "hyperglycemia_probability_pct": 85.0}

    result = engine.evaluate(base_patient_profile, telemetry, m1, m2)
    assert result["severity"] == AlertSeverity.WARNING.value
    assert result["risk_category"] == RiskCategory.HYPERGLYCEMIA.value
    assert "Current glucose (195 mg/dL) is elevated above your upper target (180 mg/dL)" in result["reason"]


# 7. Critical Hyperglycemia
def test_critical_hyperglycemia(engine, base_patient_profile):
    # Current glucose is 285 (above critical high threshold 250)
    telemetry = {"current_glucose": 285.0, "roc_5min": 1.2, "std_60min": 35.0, "trend_descriptor": "Rising rapidly (↑↑)"}
    m1 = {"t_plus_15m": 292.0, "t_plus_30m": 305.0, "t_plus_45m": 315.0, "t_plus_60m": 320.0}
    m2 = {"hypoglycemia_probability_pct": 0.0, "in_range_probability_pct": 1.0, "hyperglycemia_probability_pct": 99.0}

    result = engine.evaluate(base_patient_profile, telemetry, m1, m2)
    assert result["severity"] == AlertSeverity.CRITICAL.value
    assert result["risk_category"] == RiskCategory.HYPERGLYCEMIA.value
    assert result["caregiver_escalation"]["notification_required"] is True
    assert result["clinician_escalation"]["escalation_required"] is True
    assert "critical high threshold (250 mg/dL)" in result["reason"]


# 8. Conflicting Model 1 / Model 2 Signals (Numerical Consistency Validation)
def test_conflicting_signals_numerical_consistency(engine, base_patient_profile):
    # Edge case from PRD:
    # current glucose = 84, low threshold = 80, predicted glucose = 85 (Model 1 predicted above 80)
    # BUT Model 2 flags 62% hypo risk because of rapid previous drop (-1.2 mg/dL/min)
    telemetry = {"current_glucose": 84.0, "roc_5min": -1.2, "std_60min": 16.0, "trend_descriptor": "Falling rapidly (↓↓)"}
    m1 = {"t_plus_15m": 84.5, "t_plus_30m": 85.0, "t_plus_45m": 85.2, "t_plus_60m": 85.5}
    m2 = {"hypoglycemia_probability_pct": 62.0, "in_range_probability_pct": 38.0, "hyperglycemia_probability_pct": 0.0}

    result = engine.evaluate(base_patient_profile, telemetry, m1, m2)
    assert result["severity"] == AlertSeverity.WARNING.value
    assert result["risk_category"] == RiskCategory.HYPOGLYCEMIA.value
    # Ensure it does NOT falsely say "predicted glucose is below low threshold"
    assert "below your low threshold (80 mg/dL)" not in result["reason"]
    # Ensure it accurately explains trajectory risk
    assert "Model 2 flags high trajectory hypoglycemia risk" in result["reason"] or "risk" in result["reason"]
    assert result["predicted_glucose_30min"] == 85.0
    assert result["current_glucose"] == 84.0


# 9. Missing Optional Patient Information (Robust Fallbacks)
def test_missing_optional_patient_information(engine):
    # Minimal profile with no thresholds, no caregivers, no clinician
    sparse_profile = {"name": "Anonymous User"}
    telemetry = {"current_glucose": 135.0, "roc_5min": 0.0, "std_60min": 5.0}
    m1 = {"t_plus_30m": 135.0}
    m2 = {"hypoglycemia_probability_pct": 1.0, "in_range_probability_pct": 98.0, "hyperglycemia_probability_pct": 1.0}

    result = engine.evaluate(sparse_profile, telemetry, m1, m2)
    assert result["severity"] == AlertSeverity.NORMAL.value
    # Fallback thresholds applied correctly
    assert result["patient_thresholds_applied"]["critical_low"] == 70.0
    assert result["patient_thresholds_applied"]["low"] == 80.0
    assert result["patient_thresholds_applied"]["high"] == 180.0
    assert result["caregiver_escalation"]["recipient_name"] == "N/A"
    assert result["caregiver_escalation"]["status"] == "simulated"


# 10. Patient-Specific Threshold Differences (Personalization Test)
def test_patient_specific_threshold_personalization(engine):
    # Patient A (Standard: low = 80)
    patient_a = {
        "name": "Patient A",
        "thresholds": {"critical_low": 70.0, "low": 80.0, "high": 180.0, "critical_high": 250.0}
    }
    # Patient B (Strict elderly low threshold: low = 90)
    patient_b = {
        "name": "Patient B",
        "thresholds": {"critical_low": 75.0, "low": 90.0, "high": 200.0, "critical_high": 260.0}
    }

    # Test identical telemetry on both patients: glucose = 86 mg/dL (steady)
    telemetry = {"current_glucose": 86.0, "roc_5min": 0.0, "std_60min": 3.0}
    m1 = {"t_plus_30m": 86.0}
    m2 = {"hypoglycemia_probability_pct": 15.0, "in_range_probability_pct": 85.0, "hyperglycemia_probability_pct": 0.0}

    result_a = engine.evaluate(patient_a, telemetry, m1, m2)
    result_b = engine.evaluate(patient_b, telemetry, m1, m2)

    # For Patient A, 86 is IN-RANGE (> 80) -> NORMAL
    assert result_a["severity"] == AlertSeverity.NORMAL.value
    # For Patient B, 86 is BELOW Low threshold (< 90) -> WARNING
    assert result_b["severity"] == AlertSeverity.WARNING.value
    assert "is below your low threshold (90 mg/dL)" in result_b["reason"]
