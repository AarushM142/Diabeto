from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import HealthEvent, Patient
from apps.api.app.schemas.schemas import HealthEventCreate, HealthEventResponse, PatientCreate, PatientResponse
from apps.api.app.modules.risk.engine import evaluate_and_record_risk
from apps.api.app.core.jobs import enqueue_job

router = APIRouter(prefix="/v1", tags=["Ingestion & Patients"])

@router.post("/patients", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: PatientCreate,
    db: AsyncSession = Depends(get_db),
):
    patient = Patient(
        clinic_id=payload.clinic_id,
        clinician_of_record_id=payload.clinician_of_record_id,
        name=payload.name,
        age=payload.age,
        gender=payload.gender,
        phone=payload.phone,
        language=payload.language,
        consent_flags=payload.consent_flags,
    )
    db.add(patient)
    await db.flush()
    await db.refresh(patient)
    return patient

@router.post("/patients/{patient_id}/events", response_model=HealthEventResponse, status_code=status.HTTP_201_CREATED)
async def log_health_event(
    patient_id: str,
    payload: HealthEventCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verify patient exists
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # Plausibility check for glucose
    if payload.type == "glucose":
        mgdl = payload.value.get("mgdl")
        if mgdl is None or mgdl < 20 or mgdl > 600:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Implausible glucose reading: {mgdl}. Acceptable range is 20-600 mg/dL.",
            )

    # Save immutable event
    event = HealthEvent(
        patient_id=patient_id,
        type=payload.type,
        value=payload.value,
        measured_at=payload.measured_at,
        reported_by=payload.reported_by,
        source_msg_id=payload.source_msg_id,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)

    # Synchronous Layer 1 Risk Engine Evaluation
    risk_event = await evaluate_and_record_risk(
        session=db,
        patient_id=patient_id,
        event_id=event.id,
        event_type=event.type,
        event_value=event.value,
    )

    # Enqueue async analytical trend job
    await enqueue_job(
        session=db,
        job_type="calculate_trends",
        payload={"patient_id": patient_id, "event_id": event.id},
    )

    risk_status = risk_event.severity if risk_event else "normal"
    
    return HealthEventResponse(
        id=event.id,
        patient_id=event.patient_id,
        type=event.type,
        value=event.value,
        measured_at=event.measured_at,
        received_at=event.received_at,
        reported_by=event.reported_by,
        risk_status=risk_status,
    )

@router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient_by_id(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient

@router.post("/patients/{patient_id}/consent", response_model=PatientResponse)
async def update_patient_consent(
    patient_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    current_flags = dict(patient.consent_flags or {})
    current_flags.update(payload)
    patient.consent_flags = current_flags

    from apps.api.app.core.permissions import log_audit_entry
    await log_audit_entry(
        db=db,
        actor_id="patient_portal",
        actor_role="patient",
        action="update_consent_flags",
        target_type="patient",
        target_id=patient_id,
        details=current_flags,
    )

    await db.flush()
    await db.refresh(patient)
    return patient

