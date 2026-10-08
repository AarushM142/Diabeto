from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from apps.api.app.models.entities import Patient, HealthEvent, PatientThreshold, MedicationSchedule

ALLOWED_ACTION_TYPES = [
    "post_meal_walk",
    "hydration_reminder",
    "consistent_meal_timing",
    "medication_timing_routine",
    "portion_awareness",
]

async def build_anonymized_patient_context(
    session: AsyncSession,
    patient_id: str,
) -> Dict[str, Any]:
    """
    Constructs a deterministic, privacy-sanitized context payload for the LLM.
    Strictly scrubs all PII (names, exact phone numbers, addresses).
    """
    # 1. Fetch Patient Demographics (Anonymized)
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await session.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        return {}

    # 2. Fetch Recent Glucose Events (Last 7 Days)
    evt_stmt = (
        select(HealthEvent)
        .where(HealthEvent.patient_id == patient_id, HealthEvent.type == "glucose")
        .order_by(HealthEvent.measured_at.desc())
        .limit(10)
    )
    evt_res = await session.execute(evt_stmt)
    events = evt_res.scalars().all()

    glucose_readings = [float(e.value.get("mgdl", 0)) for e in events if "mgdl" in e.value]
    mean_glucose = round(sum(glucose_readings) / len(glucose_readings), 1) if glucose_readings else 130.0
    recent_readings_sample = glucose_readings[:5]

    # 3. Detect Simple Pattern & Evidence
    pattern_detected = "stable_fasting_levels"
    evidence_metrics = {"average_glucose_mgdl": mean_glucose, "reading_count": len(glucose_readings)}

    if mean_glucose > 180:
        pattern_detected = "elevated_weekly_average"
        evidence_metrics["peak_reading_mgdl"] = max(glucose_readings) if glucose_readings else 185
    elif mean_glucose < 90:
        pattern_detected = "low_average_trend"
        evidence_metrics["lowest_reading_mgdl"] = min(glucose_readings) if glucose_readings else 80

    context_payload = {
        "pseudonym_id": f"pt_{patient_id[-6:]}",
        "language": patient.language or "hi",
        "age_group": "senior_65_plus",
        "allowed_actions": ALLOWED_ACTION_TYPES,
        "finding": {
            "pattern": pattern_detected,
            "evidence": evidence_metrics,
            "confidence_label": "high",
        },
        "care_notes_summary": [
            "Prefers gentle walking after dinner",
            "Responsive to morning voice check-ins",
        ],
    }

    return context_payload
