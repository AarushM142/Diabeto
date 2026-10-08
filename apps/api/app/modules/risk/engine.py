from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple, List

# Number of consecutive above-high readings required to trigger the rule.
CONSECUTIVE_HIGH_WINDOW = 3


def evaluate_glucose_reading(
    glucose_mgdl: float,
    threshold: Optional[Any] = None,
) -> Optional[Tuple[str, str]]:
    """
    Evaluates a single glucose reading synchronously against clinical boundaries.
    Returns (risk_type, severity) or None if normal.
    """
    crit_low = getattr(threshold, "critical_low", 70.0) if threshold else 70.0
    low = getattr(threshold, "low", 80.0) if threshold else 80.0
    high = getattr(threshold, "high", 180.0) if threshold else 180.0
    crit_high = getattr(threshold, "critical_high", 250.0) if threshold else 250.0

    if glucose_mgdl < crit_low:
        return ("critical_hypoglycemia", "critical")
    elif glucose_mgdl < low:
        return ("low_glucose", "urgent")
    elif glucose_mgdl >= crit_high:
        return ("critical_hyperglycemia", "critical")
    elif glucose_mgdl >= high:
        return ("high_glucose", "watch")

    return None


def check_consecutive_highs(
    recent_readings: List[float],
    high_threshold: float,
    window: int = CONSECUTIVE_HIGH_WINDOW,
) -> bool:
    """
    Returns True if the last *window* readings are all strictly above the high threshold.
    Requires at least *window* readings to trigger.
    """
    if len(recent_readings) < window:
        return False
    return all(r >= high_threshold for r in recent_readings[:window])


async def _enqueue_escalation_timers(
    session: Any,
    risk_event_id: str,
    patient_id: str,
) -> None:
    """
    Atomically enqueues two Postgres outbox jobs — one per escalation tier —
    so the background sweeper can advance the state machine after T1 / T2.
    """
    from sqlalchemy import select
    from apps.api.app.models.entities import PatientThreshold
    from apps.api.app.core.jobs import enqueue_job

    th_stmt = select(PatientThreshold).where(PatientThreshold.patient_id == patient_id)
    th_res = await session.execute(th_stmt)
    threshold = th_res.scalar_one_or_none()
    timings = (
        threshold.escalation_timings
        if threshold and threshold.escalation_timings
        else {"t1_minutes": 15, "t2_minutes": 30}
    )
    t1 = timings.get("t1_minutes", 15)
    t2 = timings.get("t2_minutes", 30)

    now = datetime.now(timezone.utc)

    # Tier-2 timer: caregiver escalation check after T1
    await enqueue_job(
        session=session,
        job_type="escalation_check",
        payload={"risk_event_id": risk_event_id, "patient_id": patient_id},
        run_at=now + timedelta(minutes=t1),
        idempotency_key=f"esc_{risk_event_id}_t1",
    )

    # Tier-3 timer: doctor / emergency escalation check after T2
    await enqueue_job(
        session=session,
        job_type="escalation_check",
        payload={"risk_event_id": risk_event_id, "patient_id": patient_id},
        run_at=now + timedelta(minutes=t2),
        idempotency_key=f"esc_{risk_event_id}_t2",
    )


async def evaluate_and_record_risk(
    session: Any,
    patient_id: str,
    event_id: str,
    event_type: str,
    event_value: Dict[str, Any],
) -> Optional[Any]:
    """
    Runs deterministic checks and saves a RiskEvent if a breach is detected.

    Checks performed (in order):
    1. Single-reading threshold violation (synchronous).
    2. Consecutive-high window rule (requires recent glucose history).

    For critical / urgent events, escalation timer jobs are also persisted to
    the Postgres outbox so the background sweeper can advance the state machine.
    """
    if event_type != "glucose":
        return None

    glucose_val = float(event_value.get("mgdl", 0))
    if glucose_val <= 0:
        return None

    from sqlalchemy import select
    from apps.api.app.models.entities import PatientThreshold, RiskEvent, HealthEvent

    # --- Fetch per-patient thresholds (falls back to safe defaults) ---
    stmt = select(PatientThreshold).where(PatientThreshold.patient_id == patient_id)
    result = await session.execute(stmt)
    threshold = result.scalar_one_or_none()

    # --- Layer 1a: Critical acute emergencies ---
    risk_result = evaluate_glucose_reading(glucose_val, threshold)
    if risk_result and risk_result[1] in ("critical", "urgent"):
        risk_type, severity = risk_result
        risk_event = RiskEvent(
            patient_id=patient_id,
            type=risk_type,
            severity=severity,
            evidence_ids=[event_id],
            rule_version="1.0.0",
            status="active",
        )
        session.add(risk_event)
        await session.flush()
        await _enqueue_escalation_timers(session, risk_event.id, patient_id)
        return risk_event

    # --- Layer 1b: Consecutive-high window evaluation ---
    high_threshold = getattr(threshold, "high", 180.0) if threshold else 180.0
    recent_stmt = (
        select(HealthEvent)
        .where(HealthEvent.patient_id == patient_id, HealthEvent.type == "glucose")
        .order_by(HealthEvent.measured_at.desc())
        .limit(CONSECUTIVE_HIGH_WINDOW)
    )
    recent_res = await session.execute(recent_stmt)
    recent_events = recent_res.scalars().all()
    recent_readings = [float(e.value.get("mgdl", 0)) for e in recent_events if "mgdl" in e.value]

    if check_consecutive_highs(recent_readings, high_threshold):
        evidence_ids = [str(e.id) for e in recent_events[:CONSECUTIVE_HIGH_WINDOW]]
        consec_event = RiskEvent(
            patient_id=patient_id,
            type="consecutive_high",
            severity="urgent",
            evidence_ids=evidence_ids,
            rule_version="1.0.0",
            status="active",
        )
        session.add(consec_event)
        await session.flush()
        await _enqueue_escalation_timers(session, consec_event.id, patient_id)
        return consec_event

    # --- Layer 1c: Single-reading watch event (if single high but not consecutive) ---
    if risk_result:
        risk_type, severity = risk_result
        risk_event = RiskEvent(
            patient_id=patient_id,
            type=risk_type,
            severity=severity,
            evidence_ids=[event_id],
            rule_version="1.0.0",
            status="active",
        )
        session.add(risk_event)
        await session.flush()
        return risk_event

    return None

