from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.models.entities import Patient, HealthEvent, MedicationSchedule, RiskEvent, AuditLog, PatientThreshold
from apps.api.app.modules.trend.analytics import (
    calculate_glycemic_metrics,
    calculate_context_breakdowns,
    calculate_adherence_metrics,
)

async def generate_weekly_synthesis(
    db: AsyncSession,
    patient_id: str,
    days: int = 7,
) -> Dict[str, Any]:
    """
    Generates a structured, clinician-in-the-loop weekly summary for a patient.
    Defaults to unverified until approved by a Doctor.
    """
    # 1. Fetch Patient & Thresholds
    res_p = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = res_p.scalar_one_or_none()
    if not patient:
        return None

    res_th = await db.execute(select(PatientThreshold).where(PatientThreshold.patient_id == patient_id))
    threshold = res_th.scalar_one_or_none()
    crit_low = threshold.critical_low if threshold else 70.0
    crit_high = threshold.critical_high if threshold else 250.0
    high_th = threshold.high if threshold else 180.0

    # 2. Fetch Events for Period
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stmt_events = (
        select(HealthEvent)
        .where(HealthEvent.patient_id == patient_id, HealthEvent.measured_at >= cutoff)
        .order_by(HealthEvent.measured_at.asc())
    )
    res_events = await db.execute(stmt_events)
    events = res_events.scalars().all()

    # 3. Fetch Active Medications
    stmt_meds = select(MedicationSchedule).where(MedicationSchedule.patient_id == patient_id)
    res_meds = await db.execute(stmt_meds)
    schedules = res_meds.scalars().all()

    # 4. Fetch Risk Events
    stmt_risks = (
        select(RiskEvent)
        .where(RiskEvent.patient_id == patient_id, RiskEvent.created_at >= cutoff)
        .order_by(RiskEvent.created_at.desc())
    )
    res_risks = await db.execute(stmt_risks)
    risks = res_risks.scalars().all()

    # 5. Calculate Metrics
    glucose_vals = [float(e.value["mgdl"]) for e in events if e.type == "glucose" and "mgdl" in e.value]
    glycemic = calculate_glycemic_metrics(glucose_vals, critical_low=crit_low, high=high_th, critical_high=crit_high)
    contexts = calculate_context_breakdowns(events)
    adherence = calculate_adherence_metrics(events, schedules, days=days)

    # 6. Synthesize Clinical Highlights
    highlights = []
    if glycemic["total_readings"] > 0:
        highlights.append(f"Logged {glycemic['total_readings']} glucose readings (avg {glycemic['mean_glucose']} mg/dL).")
        highlights.append(f"Time-in-Range (70-180 mg/dL) at {glycemic['tir_percentage']}%.")
        if glycemic["tbr_percentage"] > 0:
            highlights.append(f"[Alert] {glycemic['tbr_percentage']}% of readings in hypoglycemia range (<{crit_low} mg/dL).")
    else:
        highlights.append("No glucose readings logged in this period.")

    if adherence["active_medication_count"] > 0:
        highlights.append(f"Medication adherence at {adherence['compliance_score_pct']}% across {adherence['active_medication_count']} prescribed medications.")

    if risks:
        crit_risks = [r for r in risks if r.severity == "critical"]
        highlights.append(f"Total {len(risks)} risk events flagged ({len(crit_risks)} critical).")

    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "age": patient.age,
        "period_days": days,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "unverified",
        "verified_by": None,
        "verified_at": None,
        "clinician_notes": None,
        "glycemic_metrics": glycemic,
        "context_breakdowns": contexts,
        "adherence_metrics": adherence,
        "risk_events_count": len(risks),
        "clinical_highlights": highlights,
        "doctor_action_recommendation": (
            "Review medication timing and hypoglycemia symptoms." if glycemic["tbr_percentage"] >= 4.0
            else "Maintain current regimen and encourage continued daily reporting." if glycemic["tir_percentage"] >= 70.0
            else "Assess postprandial glucose control and lifestyle modifications."
        ),
    }

async def verify_weekly_synthesis(
    db: AsyncSession,
    patient_id: str,
    clinician_id: str,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Records clinician sign-off on the weekly summary and logs an audit trail event.
    """
    summary = await generate_weekly_synthesis(db, patient_id)
    if not summary:
        return None

    now_utc = datetime.now(timezone.utc)
    summary["status"] = "verified"
    summary["verified_by"] = clinician_id
    summary["verified_at"] = now_utc.isoformat()
    summary["clinician_notes"] = notes or "Reviewed and approved by attending clinician."

    # Audit Log Entry
    audit = AuditLog(
        actor_id=clinician_id,
        action="verify_weekly_summary",
        target_type="patient",
        target_id=patient_id,
        details={"notes": summary["clinician_notes"], "verified_at": now_utc.isoformat()},
        created_at=now_utc,
    )
    db.add(audit)
    await db.flush()

    return summary
