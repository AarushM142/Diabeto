from typing import Optional, Dict, Any, Tuple

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

async def evaluate_and_record_risk(
    session: Any,
    patient_id: str,
    event_id: str,
    event_type: str,
    event_value: Dict[str, Any],
) -> Optional[Any]:
    """
    Runs deterministic checks and saves a RiskEvent if breach is detected.
    """
    if event_type != "glucose":
        return None

    glucose_val = float(event_value.get("mgdl", 0))
    if glucose_val <= 0:
        return None

    from sqlalchemy import select
    from apps.api.app.models.entities import PatientThreshold, RiskEvent

    # Fetch patient specific thresholds
    stmt = select(PatientThreshold).where(PatientThreshold.patient_id == patient_id)
    result = await session.execute(stmt)
    threshold = result.scalar_one_or_none()

    risk_result = evaluate_glucose_reading(glucose_val, threshold)
    if not risk_result:
        return None

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
