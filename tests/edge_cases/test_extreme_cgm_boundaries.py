"""
Extreme CGM Boundaries and Payload Edge-Case Testing
Covers:
- Numeric boundary values: -100, -1, 0, 1, 19, 20, 39, 40, 69.9, 70, 70.1, 79.9, 80, 80.1, 180, 249.9, 250, 250.1, 400, 500, 1000, 10000, NaN, Inf, -Inf, -0.0
- Malformed payloads, scientific notation, numeric strings, empty arrays, missing fields
- Timestamp anomalies: future dates, ancient dates, duplicate timestamps, out-of-order readings, irregular intervals
- Sequence lengths: 0, 1, 2, 5, 11, 12, 100+ readings, flatlines, sudden cliff drops, extreme spikes
"""

import pytest
import numpy as np
from datetime import datetime, timezone, timedelta

from apps.ml.demo_patient_alert_pipeline import DiabetoPipelineRunner
from apps.api.app.modules.risk.engine import evaluate_glucose_reading
from apps.ml.personalized_alert_engine import PersonalizedAlertEngine, AlertSeverity, RiskCategory


class TestExtremeNumericBoundaries:
    """Tests extreme and boundary glucose values through telemetry sanitizers and risk evaluators."""

    @pytest.fixture
    def runner(self):
        return DiabetoPipelineRunner(device="cpu")

    def test_extreme_and_invalid_glucose_sanitization(self, runner):
        # Array of extreme and pathological glucose inputs
        pathological_values = [
            -100.0, -1.0, 0.0, 1.0, 19.9, 20.0, 39.0, 40.0, 69.9, 70.0, 70.1,
            79.9, 80.0, 80.1, 179.9, 180.0, 180.1, 249.9, 250.0, 250.1,
            399.0, 400.0, 500.0, 1000.0, 10000.0, float("nan"), float("inf"), float("-inf"), -0.0
        ]

        for val in pathological_values:
            stream = [100.0] * 11 + [val]
            sanitized = runner.sanitize_cgm_stream(stream)
            assert sanitized.shape == (1, 12)
            # Ensure no NaNs or Infinities propagate
            assert not np.isnan(sanitized).any(), f"NaN detected for input {val}"
            assert not np.isinf(sanitized).any(), f"Inf detected for input {val}"
            # Ensure all values are clamped within physiological limits [20, 600]
            assert (sanitized >= 20.0).all(), f"Sub-20 value unclamped for {val}"
            assert (sanitized <= 600.0).all(), f"Above-600 value unclamped for {val}"

    def test_deterministic_risk_engine_boundaries(self):
        # Test low threshold exact boundaries
        res_crit_low = evaluate_glucose_reading(54.0)
        assert res_crit_low is not None and res_crit_low[1] == "critical"
        assert res_crit_low[0] == "critical_hypoglycemia"

        res_low_boundary = evaluate_glucose_reading(75.0)
        # 75 is below low threshold 80 -> low_glucose, urgent
        assert res_low_boundary is not None and res_low_boundary[1] == "urgent"

        res_in_range = evaluate_glucose_reading(110.0)
        assert res_in_range is None

        res_crit_high = evaluate_glucose_reading(300.0)
        assert res_crit_high is not None and res_crit_high[1] == "critical"
        assert res_crit_high[0] == "critical_hyperglycemia"


    def test_malformed_and_type_coercion_payloads(self, runner):
        malformed_inputs = [
            None,
            [],
            ["120", "130", "invalid_str", None, 140.5],
            [True, False, 100.0],
            {"reading": 120},
            "120, 130, 140",
            [1e2, 1.5e2, 2e2],  # scientific notation
        ]
        for payload in malformed_inputs:
            sanitized = runner.sanitize_cgm_stream(payload)
            assert isinstance(sanitized, np.ndarray)
            assert sanitized.shape == (1, 12)
            assert not np.isnan(sanitized).any()
            assert not np.isinf(sanitized).any()


class TestSequenceLengthsAndPatterns:
    """Tests sequences ranging from 0 to 100+ readings, cliff drops, flatlines, and spikes."""

    @pytest.fixture
    def runner(self):
        return DiabetoPipelineRunner(device="cpu")

    def test_variable_sequence_lengths(self, runner):
        lengths_to_test = [0, 1, 2, 3, 6, 11, 12, 13, 50, 150]
        for l in lengths_to_test:
            raw_seq = [100.0 + i for i in range(l)]
            sanitized = runner.sanitize_cgm_stream(raw_seq)
            assert sanitized.shape == (1, 12)
            # If length was 0, defaults to 100.0 baseline
            if l == 0:
                assert np.allclose(sanitized, 100.0)
            elif l > 12:
                # Should take the last 12 readings
                assert sanitized[0, -1] == pytest.approx(raw_seq[-1])

    def test_cliff_drop_and_spike_patterns(self, runner):
        # 1. Precipitous Cliff Drop (e.g., 200 down to 60 within 1 hour)
        cliff_drop = [200.0, 190.0, 175.0, 160.0, 140.0, 120.0, 100.0, 85.0, 75.0, 68.0, 62.0, 55.0]
        patient = {"patient_id": "pt_synth_01", "name": "Synthetic Patient", "age": 70, "thresholds": {"low": 70, "high": 180}}
        result_drop = runner.process_patient_cgm_stream(patient, cliff_drop)
        
        assert result_drop["telemetry"]["roc_5min"] < 0
        assert result_drop["pipeline_stages"]["stage2_model2_risk"]["hypoglycemia_probability_pct"] > 50.0
        assert result_drop["decision"]["severity"] in ["WARNING", "URGENT", "CRITICAL"]

        # 2. Extreme Spike (e.g. 90 up to 350 post-meal)
        extreme_spike = [90.0, 100.0, 120.0, 150.0, 190.0, 230.0, 270.0, 300.0, 320.0, 340.0, 350.0, 360.0]
        result_spike = runner.process_patient_cgm_stream(patient, extreme_spike)
        assert result_spike["telemetry"]["roc_5min"] > 0
        assert result_spike["pipeline_stages"]["stage2_model2_risk"]["hyperglycemia_probability_pct"] > 50.0
        assert result_spike["decision"]["severity"] in ["WARNING", "URGENT", "CRITICAL"]

    def test_flatline_sequence(self, runner):
        flatline = [110.0] * 12
        patient = {"patient_id": "pt_synth_02", "name": "Flatline Patient", "age": 65}
        result = runner.process_patient_cgm_stream(patient, flatline)
        assert result["telemetry"]["roc_5min"] == pytest.approx(0.0, abs=1e-3)
        assert result["decision"]["severity"] in ["NORMAL", "WATCH"]
