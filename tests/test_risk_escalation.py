"""
Phase 4 Unit Tests — Risk Engine & Escalation State Machine
============================================================
Tests cover:
- Single-reading threshold evaluation (already tested in test_risk_engine.py,
  extended here for completeness of the consecutive-high interactions).
- Consecutive-high window detection (pure function).
- Escalation state machine tier advancement (with mock session).
- Acknowledge risk event helper.
"""
import pytest
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

from apps.api.app.modules.risk.engine import (
    check_consecutive_highs,
    evaluate_glucose_reading,
    CONSECUTIVE_HIGH_WINDOW,
)


# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

@dataclass
class MockThreshold:
    critical_low: float = 70.0
    low: float = 80.0
    high: float = 180.0
    critical_high: float = 250.0
    escalation_timings: dict = field(default_factory=lambda: {"t1_minutes": 15, "t2_minutes": 30})


# ---------------------------------------------------------------------------
# check_consecutive_highs — pure function tests
# ---------------------------------------------------------------------------

class TestConsecutiveHighs:
    def test_returns_true_when_all_readings_above_threshold(self):
        readings = [195.0, 200.0, 185.0]
        assert check_consecutive_highs(readings, high_threshold=180.0) is True

    def test_returns_false_when_one_reading_below_threshold(self):
        readings = [195.0, 170.0, 185.0]  # 170 is below 180
        assert check_consecutive_highs(readings, high_threshold=180.0) is False

    def test_returns_false_when_not_enough_readings(self):
        readings = [195.0, 200.0]  # Only 2, window requires 3
        assert check_consecutive_highs(readings, high_threshold=180.0) is False

    def test_returns_false_for_empty_readings(self):
        assert check_consecutive_highs([], high_threshold=180.0) is False

    def test_boundary_exactly_at_threshold_counts_as_high(self):
        # All readings exactly at threshold value
        readings = [180.0, 180.0, 180.0]
        assert check_consecutive_highs(readings, high_threshold=180.0) is True

    def test_custom_window_size(self):
        readings = [200.0, 200.0]  # 2 readings, window=2 → should trigger
        assert check_consecutive_highs(readings, high_threshold=180.0, window=2) is True

    def test_only_first_window_readings_are_checked(self):
        # First 3 are high, 4th is not — still True because window=3
        readings = [200.0, 195.0, 185.0, 100.0, 90.0]
        assert check_consecutive_highs(readings, high_threshold=180.0) is True

    def test_normal_consecutive_readings_do_not_trigger(self):
        readings = [120.0, 130.0, 125.0]
        assert check_consecutive_highs(readings, high_threshold=180.0) is False


# ---------------------------------------------------------------------------
# evaluate_glucose_reading — threshold boundary tests
# ---------------------------------------------------------------------------

class TestSingleReadingEvaluation:
    def test_normal_reading_returns_none(self):
        result = evaluate_glucose_reading(120.0, MockThreshold())
        assert result is None

    def test_exactly_at_low_boundary_is_low_glucose(self):
        # Exactly at the low threshold (80.0)
        result = evaluate_glucose_reading(80.0, MockThreshold())
        # 80 is NOT < 80, so it's not low_glucose; and NOT >= 180, so it's None
        assert result is None

    def test_below_critical_low_is_critical_hypoglycemia(self):
        risk_type, severity = evaluate_glucose_reading(60.0, MockThreshold())
        assert risk_type == "critical_hypoglycemia"
        assert severity == "critical"

    def test_above_critical_high_is_critical_hyperglycemia(self):
        risk_type, severity = evaluate_glucose_reading(260.0, MockThreshold())
        assert risk_type == "critical_hyperglycemia"
        assert severity == "critical"

    def test_between_low_and_critical_low_is_low_glucose_urgent(self):
        risk_type, severity = evaluate_glucose_reading(75.0, MockThreshold())
        assert risk_type == "low_glucose"
        assert severity == "urgent"

    def test_between_high_and_critical_high_is_watch(self):
        risk_type, severity = evaluate_glucose_reading(200.0, MockThreshold())
        assert risk_type == "high_glucose"
        assert severity == "watch"

    def test_defaults_used_when_no_threshold_object(self):
        # Should fall back to 70/80/180/250 defaults
        result = evaluate_glucose_reading(120.0, threshold=None)
        assert result is None

    def test_custom_thresholds_respected(self):
        custom = MockThreshold(critical_low=60.0, low=70.0, high=160.0, critical_high=220.0)
        risk_type, severity = evaluate_glucose_reading(165.0, custom)
        assert risk_type == "high_glucose"
        assert severity == "watch"


# ---------------------------------------------------------------------------
# Escalation state machine — tier advancement
# ---------------------------------------------------------------------------

class TestEscalationStateMachine:
    """
    Tests the advance_escalation_state_machine function with mocked DB queries.
    We mock the session.execute() calls to return controlled data without a
    real Postgres connection.
    """

    def _make_mock_risk_event(
        self,
        risk_type: str = "critical_hypoglycemia",
        severity: str = "critical",
        status: str = "active",
        created_at: Optional[datetime] = None,
    ):
        evt = MagicMock()
        evt.id = "risk_001"
        evt.type = risk_type
        evt.severity = severity
        evt.status = status
        evt.created_at = created_at or datetime(2026, 10, 9, 0, 0, 0, tzinfo=timezone.utc)
        return evt

    def _make_mock_patient(self, language: str = "en"):
        p = MagicMock()
        p.id = "pt_ramesh_001"
        p.name = "Ramesh"
        p.phone = "+919876543210"
        p.language = language
        return p

    def _make_mock_threshold(self):
        t = MagicMock()
        t.escalation_timings = {"t1_minutes": 15, "t2_minutes": 30}
        return t

    async def _build_session(
        self,
        risk_event,
        patient,
        threshold=None,
        caregiver_pair=None,
    ) -> AsyncMock:
        """Builds a mock AsyncSession whose execute() returns controlled rows."""
        session = AsyncMock()

        risk_patient_result = MagicMock()
        risk_patient_result.first.return_value = (risk_event, patient)

        threshold_result = MagicMock()
        threshold_result.scalar_one_or_none.return_value = threshold or self._make_mock_threshold()

        caregiver_result = MagicMock()
        caregiver_result.first.return_value = caregiver_pair

        session.execute.side_effect = [
            risk_patient_result,   # RiskEvent + Patient JOIN
            threshold_result,      # PatientThreshold lookup
            caregiver_result,      # CareRelationship + User JOIN
        ]
        session.flush = AsyncMock()
        return session

    @pytest.mark.asyncio
    async def test_tier1_at_zero_minutes(self):
        from apps.api.app.modules.risk.escalation import advance_escalation_state_machine

        risk_evt = self._make_mock_risk_event()
        patient = self._make_mock_patient()
        session = await self._build_session(risk_evt, patient)

        with patch("apps.api.app.channels.twilio_client.send_whatsapp_message", new_callable=AsyncMock):
            result = await advance_escalation_state_machine(session, "risk_001", override_elapsed_minutes=0)

        assert result["tier"] == 1
        assert result["action"] == "patient_alerted"

    @pytest.mark.asyncio
    async def test_tier2_caregiver_escalated_after_t1(self):
        from apps.api.app.modules.risk.escalation import advance_escalation_state_machine

        risk_evt = self._make_mock_risk_event()
        patient = self._make_mock_patient()

        # Mock a caregiver pair
        cg_user = MagicMock()
        cg_user.phone = "+918888888888"
        cg_user.name = "Sunita"
        caregiver_pair = (MagicMock(), cg_user)

        session = await self._build_session(risk_evt, patient, caregiver_pair=caregiver_pair)

        with patch("apps.api.app.channels.twilio_client.send_whatsapp_message", new_callable=AsyncMock):
            result = await advance_escalation_state_machine(session, "risk_001", override_elapsed_minutes=16)

        assert result["tier"] == 2
        assert result["action"] == "caregiver_escalated"
        assert risk_evt.status == "escalated_caregiver"

    @pytest.mark.asyncio
    async def test_tier3_emergency_escalated_after_t2(self):
        from apps.api.app.modules.risk.escalation import advance_escalation_state_machine

        risk_evt = self._make_mock_risk_event()
        patient = self._make_mock_patient()
        session = await self._build_session(risk_evt, patient)

        with patch("apps.api.app.channels.twilio_client.send_whatsapp_message", new_callable=AsyncMock):
            result = await advance_escalation_state_machine(session, "risk_001", override_elapsed_minutes=35)

        assert result["tier"] == 3
        assert result["action"] == "emergency_doctor_escalated"
        assert risk_evt.status == "escalated_doctor"

    @pytest.mark.asyncio
    async def test_already_acknowledged_event_is_noop(self):
        from apps.api.app.modules.risk.escalation import advance_escalation_state_machine

        risk_evt = self._make_mock_risk_event(status="acknowledged")
        patient = self._make_mock_patient()
        session = await self._build_session(risk_evt, patient)

        result = await advance_escalation_state_machine(session, "risk_001", override_elapsed_minutes=35)

        assert result["status"] == "already_handled"
        assert result["risk_status"] == "acknowledged"
        assert result.get("action") is None  # No further action taken

    @pytest.mark.asyncio
    async def test_not_found_returns_not_found_status(self):
        from apps.api.app.modules.risk.escalation import advance_escalation_state_machine

        session = AsyncMock()
        not_found_result = MagicMock()
        not_found_result.first.return_value = None
        session.execute.return_value = not_found_result

        result = await advance_escalation_state_machine(session, "nonexistent_id")

        assert result["status"] == "not_found"


# ---------------------------------------------------------------------------
# acknowledge_risk_event
# ---------------------------------------------------------------------------

class TestAcknowledgeRiskEvent:
    @pytest.mark.asyncio
    async def test_acknowledge_sets_status(self):
        from apps.api.app.modules.risk.escalation import acknowledge_risk_event

        risk_evt = MagicMock()
        risk_evt.status = "active"

        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = risk_evt
        session.execute.return_value = result_mock
        session.flush = AsyncMock()

        success = await acknowledge_risk_event(session, "risk_001", actor_id="user_001")

        assert success is True
        assert risk_evt.status == "acknowledged"

    @pytest.mark.asyncio
    async def test_acknowledge_returns_false_for_missing_event(self):
        from apps.api.app.modules.risk.escalation import acknowledge_risk_event

        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        session.execute.return_value = result_mock

        success = await acknowledge_risk_event(session, "nonexistent_id", actor_id="user_001")

        assert success is False
