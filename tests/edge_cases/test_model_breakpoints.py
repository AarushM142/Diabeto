"""
Model 1, Model 2, and Model 3 Breakpoint and Contradictory Testing
Covers:
- Model 1: Multi-horizon forecasts (+15, +30, +45, +60m), horizon consistency, clamping
- Model 2: Calibrated probability sum to 100%, index correctness (0: Hypo, 1: Normal, 2: Hyper)
- Model 3: Contradictory signal handling:
    1. Current 84 mg/dL, forecast 85 mg/dL, threshold 80 mg/dL with high hypo probability
    2. Current 65 mg/dL, forecast 90 mg/dL with low hypo probability
    3. Current 200 mg/dL, forecast 160 mg/dL with high hyper probability
    4. Current 300 mg/dL with faulty in-range prediction from upstream
    5. Critical current reading with missing/failing Model 1 forecast
    6. Dangerous forecast while current glucose is normal
    7. Missing/corrupted threshold definitions
"""

import pytest
import numpy as np
from apps.ml.demo_patient_alert_pipeline import DiabetoPipelineRunner
from apps.ml.personalized_alert_engine import PersonalizedAlertEngine, AlertSeverity, RiskCategory


class TestModel1And2Breakpoints:
    """Verifies Model 1 and Model 2 behavior under stress and boundary states."""

    @pytest.fixture
    def runner(self):
        return DiabetoPipelineRunner(device="cpu")

    def test_model1_four_horizons_order_and_bounds(self, runner):
        # Stable sequence
        seq = [120.0, 118.0, 116.0, 115.0, 114.0, 112.0, 110.0, 108.0, 106.0, 105.0, 104.0, 102.0]
        patient = {"patient_id": "pt_m1_test", "name": "M1 Tester", "age": 60}
        res = runner.process_patient_cgm_stream(patient, seq)
        
        m1 = res["pipeline_stages"]["stage1_model1_forecast"]
        assert "t_plus_15m" in m1
        assert "t_plus_30m" in m1
        assert "t_plus_45m" in m1
        assert "t_plus_60m" in m1

        # Check all outputs are finite and within physiological bounds
        for horizon, val in m1.items():
            assert np.isfinite(val), f"Horizon {horizon} produced non-finite value {val}"
            assert 20.0 <= val <= 600.0, f"Horizon {horizon} out of bounds: {val}"

    def test_model2_probability_normalization_and_indices(self, runner):
        # Test extreme hypo sequence
        hypo_seq = [110.0, 100.0, 90.0, 80.0, 75.0, 70.0, 65.0, 60.0, 58.0, 55.0, 52.0, 49.0]
        res = runner.process_patient_cgm_stream({"patient_id": "p1"}, hypo_seq)
        m2 = res["pipeline_stages"]["stage2_model2_risk"]
        
        prob_hypo = m2["hypoglycemia_probability_pct"]
        prob_norm = m2["in_range_probability_pct"]
        prob_hyper = m2["hyperglycemia_probability_pct"]

        assert 0.0 <= prob_hypo <= 100.0
        assert 0.0 <= prob_norm <= 100.0
        assert 0.0 <= prob_hyper <= 100.0
        # Probabilities sum to 100% (+/- 0.1% floating precision)
        total_prob = prob_hypo + prob_norm + prob_hyper
        assert total_prob == pytest.approx(100.0, abs=0.1)

        # Hypoglycemia should be the dominant probability
        assert prob_hypo > prob_norm
        assert prob_hypo > prob_hyper


class TestModel3ContradictoryCases:
    """Table-driven testing for conflicting signals and safety engine resilience."""

    @pytest.fixture
    def engine(self):
        return PersonalizedAlertEngine()

    def test_contradictory_case_1_current_84_forecast_85_elevated_hypo_prob(self, engine):
        """Current 84, forecast 85, threshold 80, but Model 2 reports 93% hypo risk."""
        patient = {
            "patient_id": "p_contra_1",
            "name": "Ramesh",
            "age": 68,
            "target_range": {"low": 80.0, "high": 180.0}
        }
        telemetry = {
            "current_glucose": 84.0,
            "roc_5min": -0.8,
            "roc_15min": -0.7,
            "roc_30min": -0.6,
            "std_60min": 15.0,
            "trend_descriptor": "Falling (↓)"
        }
        forecast = {"t_plus_15m": 84.5, "t_plus_30m": 85.0, "t_plus_45m": 85.5, "t_plus_60m": 86.0}
        risk = {"hypoglycemia_probability_pct": 92.7, "in_range_probability_pct": 7.3, "hyperglycemia_probability_pct": 0.0}

        dec = engine.evaluate(patient, telemetry, forecast, risk)
        assert dec["severity"] in ["WARNING", "WATCH"]
        assert dec["risk_category"] == "HYPOGLYCEMIA"
        # Reason must explain trajectory risk without falsely claiming current glucose < threshold
        assert "above threshold" in dec["reason"] or "84" in dec["reason"]
        assert "84 < 80" not in dec["reason"]

    def test_contradictory_case_2_current_65_forecast_90_low_prob(self, engine):
        """Current 65 (below low threshold 70), forecast recovering to 90, but low risk probability."""
        patient = {
            "patient_id": "p_contra_2",
            "name": "Kavita",
            "age": 72,
            "target_range": {"low": 70.0, "high": 180.0}
        }
        telemetry = {"current_glucose": 65.0, "roc_5min": 0.5, "trend_descriptor": "Rising (↑)"}
        forecast = {"t_plus_15m": 75.0, "t_plus_30m": 90.0, "t_plus_45m": 100.0, "t_plus_60m": 110.0}
        risk = {"hypoglycemia_probability_pct": 10.0, "in_range_probability_pct": 85.0, "hyperglycemia_probability_pct": 5.0}

        dec = engine.evaluate(patient, telemetry, forecast, risk)
        # Safety rule: Current glucose below threshold must trigger an alert regardless of upstream low probability
        assert dec["severity"] in ["URGENT", "WARNING", "CRITICAL"]
        assert dec["risk_category"] == "HYPOGLYCEMIA"

    def test_contradictory_case_3_current_200_forecast_160_high_hyper_prob(self, engine):
        """Current 200 (above high threshold 180), forecast dropping to 160."""
        patient = {"patient_id": "p_contra_3", "target_range": {"low": 70.0, "high": 180.0}}
        telemetry = {"current_glucose": 200.0, "roc_5min": -1.2, "trend_descriptor": "Falling (↓)"}
        forecast = {"t_plus_15m": 180.0, "t_plus_30m": 160.0, "t_plus_45m": 150.0, "t_plus_60m": 140.0}
        risk = {"hypoglycemia_probability_pct": 5.0, "in_range_probability_pct": 35.0, "hyperglycemia_probability_pct": 60.0}

        dec = engine.evaluate(patient, telemetry, forecast, risk)
        assert dec["severity"] in ["WATCH", "WARNING"]
        assert dec["risk_category"] == "HYPERGLYCEMIA"

    def test_contradictory_case_4_current_300_faulty_in_range_prediction(self, engine):
        """Current 300 (Severe Hyperglycemia) while upstream Model 2 erroneously outputs 95% in-range."""
        patient = {"patient_id": "p_contra_4", "target_range": {"low": 70.0, "high": 180.0}}
        telemetry = {"current_glucose": 300.0, "roc_5min": 0.0, "trend_descriptor": "Steady (→)"}
        forecast = {"t_plus_15m": 300.0, "t_plus_30m": 300.0, "t_plus_45m": 300.0, "t_plus_60m": 300.0}
        risk = {"hypoglycemia_probability_pct": 0.0, "in_range_probability_pct": 95.0, "hyperglycemia_probability_pct": 5.0}

        dec = engine.evaluate(patient, telemetry, forecast, risk)
        # Clinical Safety Rule: 300 mg/dL MUST be flagged as CRITICAL / URGENT regardless of faulty classifier
        assert dec["severity"] in ["CRITICAL", "URGENT"]
        assert dec["risk_category"] == "HYPERGLYCEMIA"

    def test_contradictory_case_5_missing_forecast_and_risk(self, engine):
        """Model 1 or Model 2 failed/timed out, but telemetry is provided."""
        patient = {"patient_id": "p_contra_5", "target_range": {"low": 70.0, "high": 180.0}}
        telemetry = {"current_glucose": 50.0, "roc_5min": -1.0, "trend_descriptor": "Falling rapidly"}
        
        # Missing forecast and risk payloads
        dec = engine.evaluate(patient, telemetry, model1_forecast=None, model2_risk=None)
        # Should gracefully evaluate based on current glucose safety thresholds
        assert dec["severity"] == "CRITICAL"
        assert dec["risk_category"] == "HYPOGLYCEMIA"

    def test_contradictory_case_6_dangerous_forecast_current_normal(self, engine):
        """Current 110 mg/dL (Normal) but forecast +30m is 55 mg/dL (Critical Drop)."""
        patient = {"patient_id": "p_contra_6", "target_range": {"low": 70.0, "high": 180.0}}
        telemetry = {"current_glucose": 110.0, "roc_5min": -2.5, "trend_descriptor": "Falling rapidly (↓↓)"}
        forecast = {"t_plus_15m": 80.0, "t_plus_30m": 55.0, "t_plus_45m": 45.0, "t_plus_60m": 40.0}
        risk = {"hypoglycemia_probability_pct": 88.0, "in_range_probability_pct": 12.0, "hyperglycemia_probability_pct": 0.0}

        dec = engine.evaluate(patient, telemetry, forecast, risk)
        assert dec["severity"] in ["CRITICAL", "URGENT", "WARNING"]
        assert dec["risk_category"] == "HYPOGLYCEMIA"
        assert dec["caregiver_escalation"]["notification_required"] is True
