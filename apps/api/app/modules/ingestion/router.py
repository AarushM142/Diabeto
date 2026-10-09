from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import HealthEvent, Patient, CareRelationship, User, RiskEvent, MedicationSchedule
from apps.api.app.schemas.schemas import (
    HealthEventCreate,
    HealthEventResponse,
    PatientCreate,
    PatientResponse,
    ConnectPatientRequest,
    ConnectionCodeResponse,
    ClinicianPatientSummary,
)
from apps.api.app.modules.risk.engine import evaluate_and_record_risk
from apps.api.app.core.jobs import enqueue_job

router = APIRouter(prefix="/v1", tags=["Ingestion & Patients"])

def get_or_create_connection_code(patient: Patient) -> str:
    flags = patient.consent_flags or {}
    if "connection_code" in flags and flags["connection_code"]:
        return str(flags["connection_code"])
    
    if patient.id == "pt_ramesh_001":
        code = "DIA-RAM789"
    elif patient.id == "pt_shanti_002":
        code = "DIA-SHA402"
    elif patient.id == "pt_ananya_003":
        code = "DIA-ANA303"
    else:
        prefix = (patient.name[:3] if len(patient.name) >= 3 else "DIA").upper()
        suffix = str(abs(hash(patient.id)))[:4]
        code = f"DIA-{prefix}{suffix}"
    return code

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

@router.get("/patients/{patient_id}/connection-code", response_model=ConnectionCodeResponse)
async def get_patient_connection_code(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    code = get_or_create_connection_code(patient)
    if not patient.consent_flags or "connection_code" not in patient.consent_flags:
        flags = dict(patient.consent_flags or {})
        flags["connection_code"] = code
        patient.consent_flags = flags
        await db.flush()

    doc_name = "Dr. Arvind Mehta"
    if patient.clinician_of_record_id:
        res_doc = await db.execute(select(User).where(User.id == patient.clinician_of_record_id))
        doc = res_doc.scalar_one_or_none()
        if doc:
            doc_name = doc.name

    return ConnectionCodeResponse(
        patient_id=patient.id,
        patient_name=patient.name,
        connection_code=code,
        doctor_id=patient.clinician_of_record_id,
        doctor_name=doc_name,
        invite_link=f"http://localhost:5173/?connect_code={code}",
    )

@router.post("/clinicians/connect-patient")
async def connect_patient_by_code(
    payload: ConnectPatientRequest,
    db: AsyncSession = Depends(get_db),
):
    code_clean = payload.connection_code.strip().upper()

    stmt = select(Patient)
    res = await db.execute(stmt)
    patients = res.scalars().all()

    matched_patient = None
    for p in patients:
        p_code = get_or_create_connection_code(p).upper()
        if p_code == code_clean or p.id.upper() == code_clean or p.name.upper() == code_clean:
            matched_patient = p
            break

    if not matched_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No patient found with Connection Code '{payload.connection_code}'. Please check code and try again.",
        )

    # Ensure clinician User record exists in Postgres to satisfy foreign key constraint
    from apps.api.app.core.auth import ensure_db_user
    await ensure_db_user(
        db=db,
        user_id=payload.doctor_id,
        role="clinician",
    )

    matched_patient.clinician_of_record_id = payload.doctor_id

    rel_stmt = select(CareRelationship).where(
        CareRelationship.patient_id == matched_patient.id,
        CareRelationship.user_id == payload.doctor_id,
        CareRelationship.role == "clinician",
    )
    rel_res = await db.execute(rel_stmt)
    rel = rel_res.scalar_one_or_none()
    if not rel:
        rel = CareRelationship(
            patient_id=matched_patient.id,
            user_id=payload.doctor_id,
            role="clinician",
            permissions={"view_adherence": True, "view_raw_glucose": True, "sign_off": True},
        )
        db.add(rel)

    from apps.api.app.core.permissions import log_audit_entry
    await log_audit_entry(
        db=db,
        actor_id=payload.doctor_id,
        actor_role="clinician",
        action="connect_patient_via_code",
        target_type="patient",
        target_id=matched_patient.id,
        details={"connection_code": code_clean, "patient_name": matched_patient.name},
    )

    await db.flush()
    await db.commit()

    return {
        "success": True,
        "message": f"Successfully connected to {matched_patient.name}!",
        "patient": {
            "id": matched_patient.id,
            "name": matched_patient.name,
            "age": matched_patient.age,
            "gender": matched_patient.gender,
            "phone": matched_patient.phone,
            "language": matched_patient.language,
            "connection_code": code_clean,
        },
    }

@router.get("/clinicians/{doctor_id}/patients", response_model=List[ClinicianPatientSummary])
async def get_clinician_patients_roster(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient)
    res = await db.execute(stmt)
    patients = res.scalars().all()

    from apps.api.app.modules.trend.analytics import calculate_glycemic_metrics, calculate_adherence_metrics

    roster: List[ClinicianPatientSummary] = []
    for p in patients:
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        stmt_ev = (
            select(HealthEvent)
            .where(HealthEvent.patient_id == p.id, HealthEvent.measured_at >= cutoff)
            .order_by(HealthEvent.measured_at.desc())
        )
        res_ev = await db.execute(stmt_ev)
        events = res_ev.scalars().all()

        glucose_vals = []
        latest_val = None
        latest_time = None
        for e in events:
            if e.type == "glucose" and isinstance(e.value, dict) and "mgdl" in e.value:
                try:
                    val = float(e.value["mgdl"])
                    glucose_vals.append(val)
                    if latest_val is None:
                        latest_val = val
                        latest_time = e.measured_at
                except (ValueError, TypeError):
                    pass

        res_meds = await db.execute(select(MedicationSchedule).where(MedicationSchedule.patient_id == p.id))
        schedules = res_meds.scalars().all()
        adherence = calculate_adherence_metrics(events, schedules, days=14)
        glycemic = calculate_glycemic_metrics(glucose_vals)

        res_risks = await db.execute(select(RiskEvent).where(RiskEvent.patient_id == p.id, RiskEvent.status == "open"))
        active_risks = res_risks.scalars().all()

        if len(active_risks) > 0 or glycemic.get("tbr_percentage", 0) >= 4.0 or (latest_val and latest_val < 70):
            severity = "critical"
        elif glycemic.get("tar_percentage", 0) >= 30.0 or (latest_val and latest_val > 200):
            severity = "watch"
        else:
            severity = "stable"

        diag = "Type 2 Diabetes"
        if p.id == "pt_shanti_002":
            diag = "Type 2 Diabetes (12 yrs, Mild Neuropathy)"
        elif p.id == "pt_ananya_003":
            diag = "Type 2 Diabetes + Hypo Unawareness"
        elif p.id == "pt_ramesh_001":
            diag = "Type 2 Diabetes (6 yrs)"

        code = get_or_create_connection_code(p)

        roster.append(
            ClinicianPatientSummary(
                id=p.id,
                name=p.name,
                age=p.age,
                gender=p.gender,
                phone=p.phone,
                language=p.language,
                diagnosis=diag,
                connection_code=code,
                severity=severity,
                latest_glucose=latest_val,
                latest_glucose_time=latest_time,
                tir_percentage=glycemic.get("tir_percentage"),
                adherence_score_pct=adherence.get("compliance_score_pct"),
                active_alerts_count=len(active_risks),
                clinician_of_record_id=p.clinician_of_record_id,
            )
        )

    severity_order = {"critical": 0, "watch": 1, "stable": 2}
    roster.sort(key=lambda x: (severity_order.get(x.severity, 2), -(x.active_alerts_count or 0)))

    return roster

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


