"""
Diabeto Platform — Comprehensive Edge Case & Outlier Test Suite
Validates system behavior under abnormal inputs, physiological extremes, missing data, and safety boundaries.
"""

import pytest
import numpy as np

torch = pytest.importorskip("torch")
from apps.ml.personalized_alert_engine import PersonalizedAlertEngine, AlertSeverity, RiskCategory
from apps.ml.demo_patient_alert_pipeline import DiabetoPipelineRunner


BANNED_MEDICAL_PATTERNS = [
    "take insulin",
    "inject insulin",
    "units of insulin",
    "increase dose",
    "decrease dose",
    "stop taking metformin",
    "stop medication",
    "diagnosed with diabetes"
]


@pytest.fixture(scope="module")
def pipeline_runner():
    return DiabetoPipelineRunner(device="cpu")


@pytest.fixture
def base_profile():
    return {
        "patient_id": "pt_edge_001",
        "name": "Edge Test Patient",
        "age": 75,
        "thresholds": {"critical_low": 70.0, "low": 80.0, "high": 180.0, "critical_high": 250.0},
        "caregivers": [{"name": "Caring Daughter", "phone": "+919800000002"}],
        "clinician_of_record": {"name": "Dr. Specialist", "phone": "+919800000003"}
    }


# 1. Extremely Low Glucose Values (20, 40, 55, 69 mg/dL)
@pytest.mark.parametrize("extreme_low", [20.0, 40.0, 55.0, 69.0])
def test_extremely_low_glucose(pipeline_runner, base_profile, extreme_low):
    stream = [extreme_low + 10] * 6 + [extreme_low] * 6
    res = pipeline_runner.process_patient_cgm_stream(base_profile, stream)
    
    assert res["decision"]["severity"] in ["CRITICAL", "URGENT"]
    assert res["decision"]["risk_category"] == "HYPOGLYCEMIA"
    assert res["decision"]["caregiver_escalation"]["notification_required"] is True
    assert "Rule of 15" in " ".join(res["decision"]["recommended_actions"])
    assert res["decision"]["current_glucose"] == extreme_low


# 2. Extremely High Glucose Values (250, 400, 600 mg/dL)
@pytest.mark.parametrize("extreme_high", [250.0, 400.0, 600.0])
def test_extremely_high_glucose(pipeline_runner, base_profile, extreme_high):
    stream = [extreme_high - 10] * 6 + [extreme_high] * 6
    res = pipeline_runner.process_patient_cgm_stream(base_profile, stream)
    
    assert res["decision"]["severity"] in ["CRITICAL", "URGENT", "WARNING"]
    assert res["decision"]["risk_category"] == "HYPERGLYCEMIA"
    assert res["decision"]["current_glucose"] == extreme_high
    assert "water" in " ".join(res["decision"]["recommended_actions"]).lower()


# 3. Sudden Glucose Spike / Drop (High Rate of Change)
def test_sudden_glucose_crash(pipeline_runner, base_profile):
    # Rapid crash from 160 to 76 in 60 mins (-1.4 mg/dL/min)
    crash_stream = [160, 150, 140, 130, 120, 110, 100, 92, 86, 82, 78, 74]
    res = pipeline_runner.process_patient_cgm_stream(base_profile, crash_stream)
    
    assert res["decision"]["severity"] in ["WARNING", "URGENT", "CRITICAL"]
    assert res["decision"]["risk_category"] == "HYPOGLYCEMIA"
    assert res["telemetry"]["roc_5min"] < -0.5


def test_sudden_glucose_spike(pipeline_runner, base_profile):
    # Rapid post-meal spike from 110 to 220 in 60 mins (+2.0 mg/dL/min)
    spike_stream = [110, 115, 125, 135, 150, 165, 180, 192, 202, 210, 218, 225]
    res = pipeline_runner.process_patient_cgm_stream(base_profile, spike_stream)
    
    assert res["decision"]["severity"] in ["WARNING", "URGENT"]
    assert res["decision"]["risk_category"] == "HYPERGLYCEMIA"
    assert res["telemetry"]["roc_5min"] > 1.0


# 4. Flat / Stable Glucose for Long Periods (std = 0)
def test_flat_glucose_for_long_periods(pipeline_runner, base_profile):
    flat_stream = [110.0] * 12
    res = pipeline_runner.process_patient_cgm_stream(base_profile, flat_stream)
    
    assert res["decision"]["severity"] == "NORMAL"
    assert res["decision"]["risk_category"] == "IN_RANGE"
    assert res["telemetry"]["std_60min"] == 0.0
    assert res["telemetry"]["roc_5min"] == 0.0
    assert not res["decision"]["caregiver_escalation"]["notification_required"]


# 5. Missing / Insufficient CGM Readings & First-Ever Reading
def test_first_ever_reading(pipeline_runner, base_profile):
    # Newly onboarded patient with only 1 reading
    single_reading_stream = [115.0]
    res = pipeline_runner.process_patient_cgm_stream(base_profile, single_reading_stream)
    
    assert res["decision"]["current_glucose"] == 115.0
    assert res["decision"]["severity"] == "NORMAL"
    assert len(res["decision"]["recommended_actions"]) > 0


def test_partial_cgm_history(pipeline_runner, base_profile):
    # Only 4 readings
    partial_stream = [105.0, 108.0, 112.0, 110.0]
    res = pipeline_runner.process_patient_cgm_stream(base_profile, partial_stream)
    
    assert res["decision"]["current_glucose"] == 110.0
    assert not np.isnan(res["pipeline_stages"]["stage1_model1_forecast"]["t_plus_30m"])


def test_empty_cgm_stream_failsafe(pipeline_runner, base_profile):
    # Empty list or None should not crash
    res_empty = pipeline_runner.process_patient_cgm_stream(base_profile, [])
    res_none = pipeline_runner.process_patient_cgm_stream(base_profile, None)
    
    assert res_empty["decision"]["severity"] == "NORMAL"
    assert res_none["decision"]["severity"] == "NORMAL"


# 6. NaN / Null / Invalid & String CGM Values
def test_nan_and_invalid_values(pipeline_runner, base_profile):
    dirty_stream = [120.0, None, "invalid", np.nan, 125.0, "130.0", None, 135.0, 138.0, 140.0, None, 142.0]
    res = pipeline_runner.process_patient_cgm_stream(base_profile, dirty_stream)
    
    assert res["decision"]["current_glucose"] == 142.0
    assert not np.isnan(res["decision"]["predicted_glucose_30min"])
    assert not np.isnan(res["pipeline_stages"]["stage2_model2_risk"]["hypoglycemia_probability_pct"])


# 7. Negative and Unrealistically High Outlier Glucose Values
def test_negative_and_outlier_glucose_values(pipeline_runner, base_profile):
    # Outlier values: -50.0 (clamped to 20.0) and 2500.0 (clamped to 600.0)
    negative_stream = [-50.0] * 6 + [65.0] * 6
    res_neg = pipeline_runner.process_patient_cgm_stream(base_profile, negative_stream)
    assert res_neg["decision"]["severity"] in ["CRITICAL", "URGENT", "WARNING"]

    huge_stream = [120.0] * 6 + [2500.0] * 6
    res_huge = pipeline_runner.process_patient_cgm_stream(base_profile, huge_stream)
    assert res_huge["decision"]["severity"] == "CRITICAL"
    assert res_huge["decision"]["current_glucose"] <= 600.0


# 8. Missing Patient Profile Fields & Thresholds
def test_completely_empty_patient_profile(pipeline_runner):
    stream = [120.0] * 12
    res = pipeline_runner.process_patient_cgm_stream({}, stream)
    
    assert res["decision"]["severity"] == "NORMAL"
    assert res["decision"]["patient_thresholds_applied"]["critical_low"] == 70.0
    assert res["decision"]["patient_thresholds_applied"]["low"] == 80.0
    assert res["decision"]["caregiver_escalation"]["status"] == "simulated"


# 9. Inverted and Non-Standard Patient Thresholds
def test_inverted_impossible_thresholds(pipeline_runner):
    # Patient with malformed inverted thresholds (e.g. low > high)
    bad_thresh_profile = {
        "name": "Bad Threshold Pt",
        "thresholds": {"critical_low": 150.0, "low": 180.0, "high": 80.0, "critical_high": 70.0}
    }
    stream = [110.0] * 12
    res = pipeline_runner.process_patient_cgm_stream(bad_thresh_profile, stream)
    
    t = res["decision"]["patient_thresholds_applied"]
    # Guaranteed sanitized ordering: critical_low < low < high < critical_high
    assert t["critical_low"] < t["low"] < t["high"] < t["critical_high"]


# 10. Numerical Safety Checks (No NaN, No Inf, Probabilities Sum to 100%)
def test_numerical_safety_invariants(pipeline_runner, base_profile):
    streams = [
        [35.0] * 12,
        [85.0] * 12,
        [150.0] * 12,
        [320.0] * 12,
        [140, 130, 120, 110, 100, 90, 80, 75, 70, 65, 60, 55]
    ]

    for s in streams:
        res = pipeline_runner.process_patient_cgm_stream(base_profile, s)
        m2 = res["pipeline_stages"]["stage2_model2_risk"]
        m1 = res["pipeline_stages"]["stage1_model1_forecast"]
        
        # Invariant 1: No NaNs
        assert not np.isnan(m1["t_plus_30m"])
        assert not np.isnan(m2["hypoglycemia_probability_pct"])
        
        # Invariant 2: Non-negative predictions
        assert m1["t_plus_15m"] >= 0.0
        assert m1["t_plus_30m"] >= 0.0
        
        # Invariant 3: Probabilities sum to 100%
        prob_sum = m2["hypoglycemia_probability_pct"] + m2["in_range_probability_pct"] + m2["hyperglycemia_probability_pct"]
        assert abs(prob_sum - 100.0) < 0.1
        
        # Invariant 4: Probabilities within [0, 100]
        assert 0.0 <= m2["hypoglycemia_probability_pct"] <= 100.0
        assert 0.0 <= m2["in_range_probability_pct"] <= 100.0
        assert 0.0 <= m2["hyperglycemia_probability_pct"] <= 100.0


# 11. Clinical Safety & Non-Prescription Guardrail
def test_banned_medical_patterns_guardrail(pipeline_runner, base_profile):
    test_scenarios = [
        [30.0] * 12,   # Deep hypo
        [450.0] * 12,  # Severe hyper
        [110.0] * 12   # Normal
    ]
    
    for s in test_scenarios:
        res = pipeline_runner.process_patient_cgm_stream(base_profile, s)
        rec_text = " ".join(res["decision"]["recommended_actions"]).lower()
        
        for banned in BANNED_MEDICAL_PATTERNS:
            assert banned not in rec_text, f"Banned pattern '{banned}' found in recommendation: {rec_text}"
        
        # Must explicitly mark simulated status
        assert res["decision"]["caregiver_escalation"]["status"] == "simulated"
        assert res["decision"]["clinician_escalation"]["status"] == "simulated"


# 12. Conflicting Model 1 and Model 2 Predictions (Model 3 Resolution)
def test_conflicting_model_signals(pipeline_runner, base_profile):
    # Simulated case where current glucose is 78 (low), but Model 1 predicts slight recovery
    stream = [95, 90, 88, 85, 82, 80, 78, 77, 76, 76, 77, 78]
    res = pipeline_runner.process_patient_cgm_stream(base_profile, stream)
    
    # Even if predicted glucose is near 80, current glucose is below low threshold (80.0),
    # so alert engine must prioritize safety and trigger WATCH or WARNING
    assert res["decision"]["severity"] in ["WATCH", "WARNING"]
    assert res["decision"]["risk_category"] in ["HYPOGLYCEMIA", "IN_RANGE"]


# 13. Ambiguous / Very Close Class Probabilities
def test_ambiguous_close_probabilities(pipeline_runner):
    engine = PersonalizedAlertEngine()
    # Mock inputs with borderline probabilities (35% hypo, 35% normal, 30% hyper)
    profile = {"name": "Ambiguous Pt", "thresholds": {"low": 80.0, "high": 180.0}}
    telemetry = {
        "current_glucose": 84.0,
        "mean_60min": 85.0,
        "std_60min": 2.0,
        "roc_5min": -0.2,
        "roc_15min": -0.5,
        "recent_readings": [85.0]*11 + [84.0]
    }
    m1_forecast = {"t_plus_15m": 82.0, "t_plus_30m": 80.5, "t_plus_45m": 79.0, "t_plus_60m": 78.0}
    m2_probs = {"hypoglycemia": 0.36, "in_range": 0.35, "hyperglycemia": 0.29}

    res = engine.evaluate(profile, telemetry, m1_forecast, m2_probs)
    # Pipeline should handle borderline case gracefully (WATCH for downward drift)
    assert res["severity"] in [AlertSeverity.WATCH.value, AlertSeverity.NORMAL.value]
    assert "explanation" in res


# 14. Extremely High-Risk Probabilities (99%+ Certainty)
def test_extremely_high_risk_probabilities(pipeline_runner):
    engine = PersonalizedAlertEngine()
    profile = {"name": "High Risk Pt"}
    telemetry = {
        "current_glucose": 52.0,
        "mean_60min": 60.0,
        "std_60min": 8.0,
        "roc_5min": -1.5,
        "roc_15min": -3.5,
        "recent_readings": [70, 65, 60, 58, 55, 52]
    }
    m1_forecast = {"t_plus_15m": 45.0, "t_plus_30m": 40.0, "t_plus_45m": 38.0, "t_plus_60m": 35.0}
    m2_probs = {"hypoglycemia": 0.995, "in_range": 0.003, "hyperglycemia": 0.002}

    res = engine.evaluate(profile, telemetry, m1_forecast, m2_probs)
    assert res["severity"] == AlertSeverity.CRITICAL.value
    assert res["caregiver_escalation"]["notification_required"] is True
    assert res["clinician_escalation"]["notification_required"] is True


# 15. Divergent Patient-Specific Thresholds (Strict vs Liberal)
def test_divergent_patient_thresholds(pipeline_runner):
    strict_profile = {
        "name": "Strict Threshold Pt",
        "thresholds": {"critical_low": 75.0, "low": 90.0, "high": 140.0, "critical_high": 200.0}
    }
    liberal_profile = {
        "name": "Liberal Threshold Pt",
        "thresholds": {"critical_low": 55.0, "low": 70.0, "high": 220.0, "critical_high": 300.0}
    }
    # Glucose at 150 mg/dL: Strict profile flags WARNING (150 > 140), Liberal profile is NORMAL (150 < 220)
    stream = [150.0] * 12
    res_strict = pipeline_runner.process_patient_cgm_stream(strict_profile, stream)
    res_liberal = pipeline_runner.process_patient_cgm_stream(liberal_profile, stream)

    assert res_strict["decision"]["severity"] in ["WARNING", "WATCH"]
    assert res_liberal["decision"]["severity"] == "NORMAL"


# 16. Missing Caregiver and Clinician Data (Zero Contact Failures)
def test_missing_caregiver_and_clinician_data(pipeline_runner):
    isolated_profile = {
        "patient_id": "pt_no_contacts",
        "name": "Isolated Patient",
        "caregivers": [],
        "clinician_of_record": None
    }
    stream = [45.0] * 12 # Critical hypo
    res = pipeline_runner.process_patient_cgm_stream(isolated_profile, stream)
    
    assert res["decision"]["severity"] == "CRITICAL"
    # Caregiver escalation object exists without throwing exceptions
    assert res["decision"]["caregiver_escalation"]["notification_required"] is True
    assert res["decision"]["caregiver_escalation"]["recipients"] == []
    assert res["decision"]["clinician_escalation"]["notification_required"] is True


# 17. Explanation String Numbers Match Output Telemetry
def test_explanation_numerical_consistency(pipeline_runner, base_profile):
    stream = [110, 112, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160]
    res = pipeline_runner.process_patient_cgm_stream(base_profile, stream)
    
    explanation = res["decision"]["explanation"]
    current_g_rounded = f"{res['decision']['current_glucose']:.0f}"
    pred_30_rounded = f"{res['decision']['predicted_glucose_30min']:.0f}"
    
    assert current_g_rounded in explanation or str(res["decision"]["current_glucose"]) in explanation
    assert pred_30_rounded in explanation or str(res["decision"]["predicted_glucose_30min"]) in explanation


# 18. Current Danger vs Predicted Future Risk Distinction
def test_current_danger_vs_future_risk_distinction(pipeline_runner, base_profile):
    # Scenario A: Currently safe (120 mg/dL), but sharp crash predicted
    crash_stream = [160, 155, 150, 145, 140, 135, 130, 126, 124, 122, 120, 118]
    res_a = pipeline_runner.process_patient_cgm_stream(base_profile, crash_stream)
    
    # Scenario B: Currently low (65 mg/dL), but rising back up
    recovery_stream = [50, 52, 54, 56, 58, 60, 62, 63, 64, 65, 66, 67]
    res_b = pipeline_runner.process_patient_cgm_stream(base_profile, recovery_stream)
    
    # Res A has normal current glucose (118) but future risk
    assert res_a["decision"]["current_glucose"] >= 100.0
    
    # Res B has current hypoglycemia danger (67 < 70/80)
    assert res_b["decision"]["current_glucose"] < 70.0 or res_b["decision"]["current_glucose"] < 80.0
    assert res_b["decision"]["severity"] in ["WARNING", "URGENT", "CRITICAL"]
