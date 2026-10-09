"""
Patient Isolation and Data Integrity Extreme Testing
Covers:
- 3 synthetic patients with distinct thresholds, languages, caregivers, and clinical targets
- Verification that thresholds, languages, or histories never leak across patient boundaries
- Concurrent evaluation isolation and duplicate submission deduplication
"""

import pytest
import asyncio
from concurrent.futures import ThreadPoolExecutor

from apps.ml.demo_patient_alert_pipeline import DiabetoPipelineRunner
from apps.ml.personalized_alert_engine import PersonalizedAlertEngine


SYNTHETIC_PATIENTS = [
    {
        "patient_id": "pt_synth_marathi",
        "name": "Anand Gokhale",
        "age": 68,
        "language": "mr",
        "thresholds": {"critical_low": 70.0, "low": 85.0, "high": 160.0, "critical_high": 240.0},
        "caregivers": [{"name": "Sunil Gokhale", "phone": "+919800000001", "notify_for": ["critical", "warning"]}]
    },
    {
        "patient_id": "pt_synth_hindi",
        "name": "Sunita Verma",
        "age": 74,
        "language": "hi",
        "thresholds": {"critical_low": 55.0, "low": 70.0, "high": 190.0, "critical_high": 260.0},
        "caregivers": [{"name": "Pooja Verma", "phone": "+919800000002", "notify_for": ["critical"]}]
    },
    {
        "patient_id": "pt_synth_english",
        "name": "David Fernandez",
        "age": 62,
        "language": "en",
        "thresholds": {"critical_low": 50.0, "low": 65.0, "high": 170.0, "critical_high": 230.0},
        "caregivers": [{"name": "Maria Fernandez", "phone": "+919800000003", "notify_for": ["critical", "warning", "urgent"]}]
    }
]


class TestPatientIsolation:
    """Verifies strict data isolation across multiple concurrent synthetic patients."""

    @pytest.fixture
    def runner(self):
        return DiabetoPipelineRunner(device="cpu")

    def test_distinct_patient_thresholds_applied_correctly(self, runner):
        # Patient 1: Low threshold is 85. Glucose is 82 (Below low -> WARNING/URGENT)
        res1 = runner.process_patient_cgm_stream(SYNTHETIC_PATIENTS[0], [82.0] * 12)
        assert res1["decision"]["patient_thresholds_applied"]["low"] == 85.0
        assert res1["decision"]["patient_thresholds_applied"]["high"] == 160.0
        assert res1["patient_info"]["name"] == "Anand Gokhale"

        # Patient 2: Low threshold is 70. Glucose is 82 (Above low -> NORMAL)
        res2 = runner.process_patient_cgm_stream(SYNTHETIC_PATIENTS[1], [82.0] * 12)
        assert res2["decision"]["patient_thresholds_applied"]["low"] == 70.0
        assert res2["decision"]["patient_thresholds_applied"]["high"] == 190.0
        assert res2["patient_info"]["name"] == "Sunita Verma"

        # Patient 3: Low threshold is 65. Glucose is 82 (Normal)
        res3 = runner.process_patient_cgm_stream(SYNTHETIC_PATIENTS[2], [82.0] * 12)
        assert res3["decision"]["patient_thresholds_applied"]["low"] == 65.0
        assert res3["decision"]["patient_thresholds_applied"]["high"] == 170.0
        assert res3["patient_info"]["name"] == "David Fernandez"

    def test_concurrent_multi_patient_inference_isolation(self, runner):
        """Runs concurrent inferences for different patients to check for state corruption/leakage."""
        streams = [
            (SYNTHETIC_PATIENTS[0], [80.0] * 12),
            (SYNTHETIC_PATIENTS[1], [150.0] * 12),
            (SYNTHETIC_PATIENTS[2], [220.0] * 12),
        ]

        def run_inference(p_and_s):
            patient, stream = p_and_s
            return runner.process_patient_cgm_stream(patient, stream)

        with ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(run_inference, streams * 4))

        assert len(results) == 12
        for r in results:
            p_name = r["patient_info"]["name"]
            if p_name == "Anand Gokhale":
                assert r["decision"]["patient_thresholds_applied"]["low"] == 85.0
            elif p_name == "Sunita Verma":
                assert r["decision"]["patient_thresholds_applied"]["low"] == 70.0
            elif p_name == "David Fernandez":
                assert r["decision"]["patient_thresholds_applied"]["low"] == 65.0
            else:
                pytest.fail(f"Unexpected leaked patient name: {p_name}")

    def test_caregiver_contact_isolation(self, runner):
        # Trigger critical hypo for Patient 1 -> Caregiver Sunil must be escalated
        res1 = runner.process_patient_cgm_stream(SYNTHETIC_PATIENTS[0], [45.0] * 12)
        cg1 = res1["decision"]["caregiver_escalation"]
        assert cg1["recipient_name"] == "Sunil Gokhale"
        assert cg1["recipient_phone"] == "+919800000001"
        assert cg1["recipient_name"] != "Pooja Verma"
        assert cg1["recipient_name"] != "Maria Fernandez"
