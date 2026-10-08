"""
Risk & Escalation Router
========================
Exposes Phase-4 endpoints:

- GET  /v1/patients/{patient_id}/risks          — list active risk events
- POST /v1/escalations/{risk_event_id}/ack      — acknowledge a risk event
- PUT  /v1/patients/{patient_id}/thresholds     — upsert per-patient clinical thresholds
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from apps.api.app.core.database import get_db
from apps.api.app.core.auth import get_current_user, require_roles
from apps.api.app.models.entities import RiskEvent, PatientThreshold, Patient, AuditLog
from apps.api.app.schemas.schemas import (
    RiskEventResponse,
    PatientThresholdUpsert,
    PatientThresholdResponse,
)
from apps.api.app.modules.risk.escalation import acknowledge_risk_event

router = APIRouter(prefix="/v1", tags=["Risk & Escalation"])


@router.get(
    "/patients/{patient_id}/risks",
    response_model=List[RiskEventResponse],
    summary="List active risk events for a patient",
)
async def list_patient_risks(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Returns all non-resolved risk events for the given patient, newest first.
    """
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    risks_stmt = (
        select(RiskEvent)
        .where(
            RiskEvent.patient_id == patient_id,
            RiskEvent.status != "resolved",
        )
        .order_by(RiskEvent.created_at.desc())
    )
    result = await db.execute(risks_stmt)
    return result.scalars().all()


@router.post(
    "/escalations/{risk_event_id}/ack",
    status_code=status.HTTP_200_OK,
    summary="Acknowledge an active risk event",
)
async def acknowledge_risk(
    risk_event_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(
        require_roles(["caregiver", "coach", "clinician", "admin"])
    ),
):
    """
    Marks a risk event as acknowledged, stopping further escalation timer
    processing.  Records the action in the audit log.
    """
    acked = await acknowledge_risk_event(
        session=db,
        risk_event_id=risk_event_id,
        actor_id=user.get("id", "unknown"),
    )
    if not acked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk event not found or already resolved",
        )

    # Append-only audit record
    audit = AuditLog(
        actor_id=user.get("id", "unknown"),
        action="acknowledge_risk_event",
        target_type="risk_event",
        target_id=risk_event_id,
        details={"role": user.get("role")},
    )
    db.add(audit)
    await db.flush()

    return {
        "status": "acknowledged",
        "risk_event_id": risk_event_id,
        "acknowledged_by": user.get("name", user.get("id")),
    }


@router.put(
    "/patients/{patient_id}/thresholds",
    response_model=PatientThresholdResponse,
    summary="Upsert clinical thresholds for a patient (clinician only)",
)
async def upsert_patient_thresholds(
    patient_id: str,
    payload: PatientThresholdUpsert,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_roles(["clinician", "admin"])),
):
    """
    Creates or updates per-patient glucose thresholds and escalation timings.
    Restricted to the clinician-of-record role (or admin).

    Updating thresholds bumps the ``version`` counter and sets
    ``thresholds_reviewed_at`` on the patient record.
    """
    # Verify patient exists
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # Upsert PatientThreshold
    th_stmt = select(PatientThreshold).where(PatientThreshold.patient_id == patient_id)
    th_res = await db.execute(th_stmt)
    threshold = th_res.scalar_one_or_none()

    if threshold:
        # Update existing record and bump version
        threshold.critical_low = payload.critical_low
        threshold.low = payload.low
        threshold.high = payload.high
        threshold.critical_high = payload.critical_high
        if payload.escalation_timings:
            threshold.escalation_timings = payload.escalation_timings
        threshold.version = threshold.version + 1
    else:
        threshold = PatientThreshold(
            patient_id=patient_id,
            critical_low=payload.critical_low,
            low=payload.low,
            high=payload.high,
            critical_high=payload.critical_high,
            escalation_timings=payload.escalation_timings or {"t1_minutes": 15, "t2_minutes": 30},
        )
        db.add(threshold)

    # Record that a clinician has reviewed thresholds on this patient
    from datetime import datetime, timezone
    patient.thresholds_reviewed_at = datetime.now(timezone.utc)

    # Audit log
    audit = AuditLog(
        actor_id=user.get("id", "unknown"),
        action="update_patient_thresholds",
        target_type="patient_threshold",
        target_id=patient_id,
        details={
            "critical_low": payload.critical_low,
            "low": payload.low,
            "high": payload.high,
            "critical_high": payload.critical_high,
        },
    )
    db.add(audit)
    await db.flush()
    await db.refresh(threshold)
    return threshold
