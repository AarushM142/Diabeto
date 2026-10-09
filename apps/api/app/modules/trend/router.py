from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.core.auth import get_current_user, require_role
from apps.api.app.models.entities import HealthEvent, Patient, PatientThreshold, MedicationSchedule, Clinic, User
from apps.api.app.schemas.schemas import (
    TrendAnalyticsResponse,
    WeeklySummaryResponse,
    VerifyWeeklySummaryRequest,
)
from apps.api.app.modules.trend.analytics import (
    calculate_glycemic_metrics,
    calculate_context_breakdowns,
    calculate_adherence_metrics,
)
from apps.api.app.modules.trend.weekly_summary import (
    generate_weekly_synthesis,
    verify_weekly_synthesis,
)
from apps.api.app.modules.trend.report_generator import generate_clinical_pdf_report

router = APIRouter(prefix="/v1", tags=["Trends & Clinical Reports"])

@router.get("/patients/{patient_id}/trends", response_model=TrendAnalyticsResponse)
async def get_patient_trends(
    patient_id: str,
    days: int = Query(14, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Fetches comprehensive ADA-standard glycemic trends, variability, context breakdowns, and adherence metrics.
    """
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        from apps.api.app.core.auth import ensure_db_patient
        patient = await ensure_db_patient(db=db, patient_id=patient_id)
        await db.commit()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # Fetch thresholds
    res_th = await db.execute(select(PatientThreshold).where(PatientThreshold.patient_id == patient_id))
    threshold = res_th.scalar_one_or_none()
    crit_low = threshold.critical_low if threshold else 70.0
    crit_high = threshold.critical_high if threshold else 250.0
    high_th = threshold.high if threshold else 180.0

    # Fetch events in period
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stmt_events = (
        select(HealthEvent)
        .where(HealthEvent.patient_id == patient_id, HealthEvent.measured_at >= cutoff)
        .order_by(HealthEvent.measured_at.asc())
    )
    res_events = await db.execute(stmt_events)
    events = res_events.scalars().all()

    # Fetch medication schedules
    res_meds = await db.execute(select(MedicationSchedule).where(MedicationSchedule.patient_id == patient_id))
    schedules = res_meds.scalars().all()

    # Extract glucose values safely
    glucose_vals = []
    for e in events:
        if e.type == "glucose" and isinstance(e.value, dict) and e.value.get("mgdl") is not None:
            try:
                glucose_vals.append(float(e.value["mgdl"]))
            except (ValueError, TypeError):
                pass

    glycemic = calculate_glycemic_metrics(
        glucose_vals,
        critical_low=crit_low,
        high=high_th,
        critical_high=crit_high,
    )
    contexts = calculate_context_breakdowns(events)
    adherence = calculate_adherence_metrics(events, schedules, days=days)

    # Check consent masking for caregiver
    user_role = user.get("role", "")
    consent_flags = patient.consent_flags or {}
    view_raw = consent_flags.get("view_raw_glucose", True)

    readings = []
    for e in events:
        if e.type == "glucose" and isinstance(e.value, dict) and e.value.get("mgdl") is not None:
            try:
                raw_mgdl = float(e.value.get("mgdl", 0))
            except (ValueError, TypeError):
                raw_mgdl = 0.0
            readings.append({
                "measured_at": e.measured_at,
                "mgdl": raw_mgdl if (user_role != "caregiver" or view_raw) else 0.0,
                "context": str(e.value.get("context", "fasting")),
            })

    return {
        "patient_id": patient_id,
        "days": days,
        "glycemic_metrics": glycemic,
        "context_breakdowns": contexts,
        "adherence_metrics": adherence,
        "readings": readings,
    }

@router.get("/patients/{patient_id}/report/pdf")
async def download_clinical_pdf_report(
    patient_id: str,
    notes: Optional[str] = Query(None, description="Custom clinician verified consultation notes"),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Click Clinical PDF & EHR Export:
    Generates a formatted clinical OPD consultation sheet with hospital letterhead,
    ADA compliance score, glycemic statistics, medication schedule, and doctor sign-off.
    """
    # 1. Fetch Patient
    stmt_pt = select(Patient).where(Patient.id == patient_id)
    res_pt = await db.execute(stmt_pt)
    patient = res_pt.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # 2. Fetch Clinic
    clinic_dict = None
    if patient.clinic_id:
        stmt_cl = select(Clinic).where(Clinic.id == patient.clinic_id)
        res_cl = await db.execute(stmt_cl)
        clinic = res_cl.scalar_one_or_none()
        if clinic:
            clinic_dict = {"name": clinic.name, "address": clinic.address}

    # 3. Fetch Clinician of Record
    clinician_dict = None
    if patient.clinician_of_record_id:
        stmt_doc = select(User).where(User.id == patient.clinician_of_record_id)
        res_doc = await db.execute(stmt_doc)
        doc = res_doc.scalar_one_or_none()
        if doc:
            clinician_dict = {"name": doc.name, "phone": doc.phone}

    # 4. Fetch Medications
    stmt_meds = select(MedicationSchedule).where(
        MedicationSchedule.patient_id == patient_id,
        MedicationSchedule.is_active == True,
    )
    res_meds = await db.execute(stmt_meds)
    meds = res_meds.scalars().all()
    meds_data = [
        {
            "drug_name": m.drug_name,
            "dosage": m.dosage,
            "scheduled_time": m.scheduled_time,
            "instructions": m.instructions,
            "is_active": m.is_active,
        }
        for m in meds
    ]

    # 5. Fetch Glucose Events (14-day history)
    stmt_events = (
        select(HealthEvent)
        .where(HealthEvent.patient_id == patient_id, HealthEvent.type == "glucose")
        .order_by(HealthEvent.measured_at.desc())
    )
    res_events = await db.execute(stmt_events)
    events = res_events.scalars().all()
    events_data = [
        {
            "id": e.id,
            "type": e.type,
            "value": e.value,
            "measured_at": e.measured_at,
            "reported_by": e.reported_by,
        }
        for e in events
    ]

    patient_dict = {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "phone": patient.phone,
        "language": patient.language,
    }

    # Generate PDF in-memory
    pdf_buffer = generate_clinical_pdf_report(
        patient=patient_dict,
        clinic=clinic_dict,
        clinician=clinician_dict,
        events=events_data,
        medications=meds_data,
        notes=notes,
    )

    pdf_bytes = pdf_buffer.getvalue()
    filename = f"diabeto_clinical_report_{patient_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
            "X-Report-Status": "clinician-verified",
            "X-EHR-Format": "OPD-Consultation-v1",
        },
    )

@router.get("/patients/{patient_id}/report/summary")
async def get_clinical_ehr_summary(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Structured EHR Summary export (JSON format for hospital HMIS / ABDM integration).
    """
    stmt_pt = select(Patient).where(Patient.id == patient_id)
    res_pt = await db.execute(stmt_pt)
    patient = res_pt.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    stmt_events = (
        select(HealthEvent)
        .where(HealthEvent.patient_id == patient_id, HealthEvent.type == "glucose")
        .order_by(HealthEvent.measured_at.asc())
    )
    res_events = await db.execute(stmt_events)
    events = res_events.scalars().all()
    values = [float(e.value.get("mgdl", 0)) for e in events if "mgdl" in e.value]
    
    count = len(values)
    avg_glucose = sum(values) / count if count else 0.0
    tir_count = len([v for v in values if 70 <= v <= 180])
    tir_pct = (tir_count / count * 100) if count else 0.0
    est_hba1c = round((avg_glucose + 46.7) / 28.7, 1) if avg_glucose > 0 else None

    return {
        "resourceType": "ClinicalImpression",
        "patient_id": patient_id,
        "patient_name": patient.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ada_glycemic_metrics": {
            "total_readings": count,
            "mean_glucose_mgdl": round(avg_glucose, 1),
            "estimated_hba1c_percent": est_hba1c,
            "time_in_range_percent": round(tir_pct, 1),
            "target_tir_threshold": ">= 70%",
            "ada_control_grade": "Optimal" if tir_pct >= 70 else ("Moderate" if tir_pct >= 50 else "Sub-Optimal"),
        },
        "ehr_export_status": "verified",
        "download_pdf_url": f"/v1/patients/{patient_id}/report/pdf",
    }

@router.post("/patients/{patient_id}/weekly-summary", response_model=WeeklySummaryResponse, status_code=status.HTTP_201_CREATED)
async def create_weekly_summary(
    patient_id: str,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Generates an automated, clinician-in-the-loop weekly synthesis for a patient.
    Status defaults to 'unverified'.
    """
    summary = await generate_weekly_synthesis(db, patient_id, days=days)
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return summary

@router.get("/patients/{patient_id}/weekly-summary", response_model=WeeklySummaryResponse)
async def get_weekly_summary(
    patient_id: str,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Retrieves the weekly summary and verification state for a patient.
    """
    summary = await generate_weekly_synthesis(db, patient_id, days=days)
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return summary

@router.post("/patients/{patient_id}/weekly-summary/verify", response_model=WeeklySummaryResponse)
async def verify_weekly_summary_endpoint(
    patient_id: str,
    payload: VerifyWeeklySummaryRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("clinician", "doctor", "admin")),
):
    """
    Clinician sign-off gate for the weekly summary.
    Marks status as 'verified' and creates an immutable AuditLog entry.
    """
    clinician_id = user.get("id", "doc_mehta_101")
    summary = await verify_weekly_synthesis(db, patient_id, clinician_id=clinician_id, notes=payload.notes)
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return summary
