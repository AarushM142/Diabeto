from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.core.auth import get_current_user, require_role
from apps.api.app.models.entities import HealthEvent, Patient, PatientThreshold, MedicationSchedule
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

router = APIRouter(prefix="/v1", tags=["Trends & Analytics"])

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

    # Extract glucose values
    glucose_vals = [float(e.value["mgdl"]) for e in events if e.type == "glucose" and "mgdl" in e.value]

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

    readings = [
        {
            "measured_at": e.measured_at,
            "mgdl": float(e.value.get("mgdl", 0)) if (user_role != "caregiver" or view_raw) else 0.0,
            "context": str(e.value.get("context", "fasting")),
        }
        for e in events
        if e.type == "glucose" and "mgdl" in e.value
    ]

    return {
        "patient_id": patient_id,
        "days": days,
        "glycemic_metrics": glycemic,
        "context_breakdowns": contexts,
        "adherence_metrics": adherence,
        "readings": readings,
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

