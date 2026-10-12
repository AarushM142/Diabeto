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
    ConnectCaregiverRequest,
    PatientConnectCaregiverRequest,
    ConnectionCodeResponse,
    ClinicianPatientSummary,
)
from apps.api.app.modules.risk.engine import evaluate_and_record_risk
from apps.api.app.core.jobs import enqueue_job

router = APIRouter(prefix="/v1", tags=["Ingestion & Patients"])

from apps.api.app.core.auth import generate_patient_connection_code

def get_or_create_connection_code(patient: Patient) -> str:
    """Deterministic per-patient code using SHA-256."""
    flags = patient.consent_flags or {}
    if "connection_code" in flags and flags["connection_code"]:
        return str(flags["connection_code"])

    code = generate_patient_connection_code(patient.id, patient.name)
    return code


def find_patient_by_code(patients: list, code_clean: str):
    """Shared matcher for doctor + caregiver connect flows (code, id, or name)."""
    norm_code = code_clean.upper().replace("DIA-", "").strip()
    for p in patients:
        p_code = get_or_create_connection_code(p).upper()
        p_norm_code = p_code.replace("DIA-", "").strip()
        if (
            p_code == code_clean
            or p_norm_code == norm_code
            or p.id.upper() == code_clean
            or p.name.upper() == code_clean
            or p.name.upper().replace(" ", "") == code_clean.replace(" ", "")
        ):
            return p
    return None

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
        from apps.api.app.core.auth import ensure_db_patient
        patient = await ensure_db_patient(db=db, patient_id=patient_id)
        await db.commit()

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

    await db.commit()

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
        from apps.api.app.core.auth import ensure_db_patient
        patient = await ensure_db_patient(db=db, patient_id=patient_id)
        await db.commit()

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
        from apps.api.app.core.auth import ensure_db_patient
        patient = await ensure_db_patient(db=db, patient_id=patient_id)
        await db.commit()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    code = get_or_create_connection_code(patient)
    if not patient.consent_flags or "connection_code" not in patient.consent_flags:
        flags = dict(patient.consent_flags or {})
        flags["connection_code"] = code
        patient.consent_flags = flags
        await db.flush()
        await db.commit()

    doc_name = "Assigned Doctor"
    doc_connected = False
    if patient.clinician_of_record_id and patient.clinician_of_record_id != "pending_clinician_assignment":
        res_doc = await db.execute(select(User).where(User.id == patient.clinician_of_record_id))
        doc = res_doc.scalar_one_or_none()
        if doc:
            doc_name = doc.name
            doc_connected = True

    # Query caregiver linked via CareRelationship
    caregiver_id = None
    caregiver_name = None
    caregiver_phone = None
    caregiver_relation = "Primary Caregiver"
    caregiver_connected = False

    cg_stmt = (
        select(CareRelationship, User)
        .join(User, CareRelationship.user_id == User.id)
        .where(CareRelationship.patient_id == patient.id, CareRelationship.role == "caregiver")
    )
    cg_res = await db.execute(cg_stmt)
    cg_row = cg_res.first()
    if cg_row:
        caregiver_rel, caregiver_user = cg_row
        caregiver_id = caregiver_user.id
        caregiver_name = caregiver_user.name
        caregiver_phone = caregiver_user.phone
        caregiver_connected = True
        caregiver_relation = (caregiver_rel.permissions or {}).get("relation") or "Primary Caregiver"
        from apps.api.app.modules.auth.router import SAVED_USER_PROFILES
        for prof in SAVED_USER_PROFILES.values():
            if prof.get("id") == patient.id or prof.get("phone") == patient.phone:
                pp = prof.get("patient_profile") or {}
                if pp.get("caregiver_relation"):
                    caregiver_relation = pp.get("caregiver_relation")
                break
    else:
        # Fallback to patient profile in SAVED_USER_PROFILES
        from apps.api.app.modules.auth.router import SAVED_USER_PROFILES
        for prof in SAVED_USER_PROFILES.values():
            if prof.get("id") == patient.id or prof.get("phone") == patient.phone:
                pp = prof.get("patient_profile") or {}
                if pp.get("caregiver_name"):
                    caregiver_name = pp.get("caregiver_name")
                    caregiver_phone = pp.get("caregiver_phone")
                    caregiver_relation = pp.get("caregiver_relation") or "Primary Caregiver"
                    break

    invite_link = f"http://localhost:5173/?connect_code={code}"
    doctor_invite_link = f"http://localhost:5173/?role=clinician&connect_code={code}"
    caregiver_invite_link = f"http://localhost:5173/?role=caregiver&connect_code={code}"

    return ConnectionCodeResponse(
        patient_id=patient.id,
        patient_name=patient.name,
        connection_code=code,
        doctor_id=patient.clinician_of_record_id,
        doctor_name=doc_name,
        doctor_connected=doc_connected,
        caregiver_id=caregiver_id,
        caregiver_name=caregiver_name,
        caregiver_phone=caregiver_phone,
        caregiver_relation=caregiver_relation,
        caregiver_connected=caregiver_connected,
        invite_link=invite_link,
        doctor_invite_link=doctor_invite_link,
        caregiver_invite_link=caregiver_invite_link,
    )

@router.post("/clinicians/connect-patient")
async def connect_patient_by_code(
    payload: ConnectPatientRequest,
    db: AsyncSession = Depends(get_db),
):
    code_clean = payload.connection_code.strip().upper()

    stmt = select(Patient)
    res = await db.execute(stmt)
    patients = list(res.scalars().all())

    matched_patient = find_patient_by_code(patients, code_clean)

    if not matched_patient:
        from apps.api.app.core.auth import ensure_db_patient
        user_stmt = select(User).where(User.role == "patient")
        u_res = await db.execute(user_stmt)
        patient_users = u_res.scalars().all()
        for u in patient_users:
            if u.id not in [p.id for p in patients]:
                ensured = await ensure_db_patient(db=db, patient_id=u.id, name=u.name, phone=u.phone, language=u.language)
                patients.append(ensured)
        matched_patient = find_patient_by_code(patients, code_clean)

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
            "connection_code": get_or_create_connection_code(matched_patient),
        },
    }


@router.post("/caregivers/connect-patient")
async def connect_caregiver_by_code(
    payload: ConnectCaregiverRequest,
    db: AsyncSession = Depends(get_db),
):
    """Caretaker → elder linking using the SAME connection-code system as doctors."""
    code_clean = payload.connection_code.strip().upper()

    stmt = select(Patient)
    res = await db.execute(stmt)
    patients = list(res.scalars().all())

    matched_patient = find_patient_by_code(patients, code_clean)

    if not matched_patient:
        from apps.api.app.core.auth import ensure_db_patient
        user_stmt = select(User).where(User.role == "patient")
        u_res = await db.execute(user_stmt)
        patient_users = u_res.scalars().all()
        for u in patient_users:
            if u.id not in [p.id for p in patients]:
                ensured = await ensure_db_patient(db=db, patient_id=u.id, name=u.name, phone=u.phone, language=u.language)
                patients.append(ensured)
        matched_patient = find_patient_by_code(patients, code_clean)

    if not matched_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No elder found with Connection Code '{payload.connection_code}'. Please check the code and try again.",
        )

    from apps.api.app.core.auth import ensure_db_user
    await ensure_db_user(
        db=db,
        user_id=payload.caregiver_id,
        role="caregiver",
    )

    rel_stmt = select(CareRelationship).where(
        CareRelationship.patient_id == matched_patient.id,
        CareRelationship.user_id == payload.caregiver_id,
        CareRelationship.role == "caregiver",
    )
    rel_res = await db.execute(rel_stmt)
    rel = rel_res.scalar_one_or_none()
    if not rel:
        rel = CareRelationship(
            patient_id=matched_patient.id,
            user_id=payload.caregiver_id,
            role="caregiver",
            permissions={"view_adherence": True, "view_raw_glucose": True, "emergency_escalation": True},
        )
        db.add(rel)

    from apps.api.app.core.permissions import log_audit_entry
    await log_audit_entry(
        db=db,
        actor_id=payload.caregiver_id,
        actor_role="caregiver",
        action="connect_caregiver_via_code",
        target_type="patient",
        target_id=matched_patient.id,
        details={"connection_code": code_clean, "patient_name": matched_patient.name},
    )

    await db.flush()
    await db.commit()

    return {
        "success": True,
        "message": f"Successfully linked to {matched_patient.name}!",
        "patient": {
            "id": matched_patient.id,
            "name": matched_patient.name,
            "age": matched_patient.age,
            "gender": matched_patient.gender,
            "phone": matched_patient.phone,
            "language": matched_patient.language,
            "connection_code": get_or_create_connection_code(matched_patient),
        },
    }


@router.post("/patients/{patient_id}/connect-caregiver")
async def connect_caregiver_from_patient(
    patient_id: str,
    payload: PatientConnectCaregiverRequest,
    db: AsyncSession = Depends(get_db),
):
    """Allows elder to directly link/invite their caretaker from the Patient Portal."""
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        from apps.api.app.core.auth import ensure_db_patient
        patient = await ensure_db_patient(db=db, patient_id=patient_id)
        await db.commit()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    clean_phone = payload.caregiver_phone.strip()
    clean_name = payload.caregiver_name.strip()
    if not clean_name or not clean_phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Caregiver name and phone are required")

    # Find or create User with role='caregiver'
    cg_user_stmt = select(User).where(User.phone == clean_phone)
    cg_res = await db.execute(cg_user_stmt)
    caregiver_user = cg_res.scalar_one_or_none()
    if not caregiver_user:
        caregiver_user = User(
            name=clean_name,
            phone=clean_phone,
            role="caregiver",
            language=patient.language or "en",
        )
        db.add(caregiver_user)
        await db.flush()
    else:
        caregiver_user.name = clean_name

    # Create or update CareRelationship
    rel_stmt = select(CareRelationship).where(
        CareRelationship.patient_id == patient.id,
        CareRelationship.user_id == caregiver_user.id,
        CareRelationship.role == "caregiver",
    )
    rel_res = await db.execute(rel_stmt)
    rel = rel_res.scalar_one_or_none()
    perms = dict(payload.permissions or {"view_adherence": True, "view_raw_glucose": True, "emergency_escalation": True})
    if payload.relation:
        perms["relation"] = payload.relation
    if not rel:
        rel = CareRelationship(
            patient_id=patient.id,
            user_id=caregiver_user.id,
            role="caregiver",
            permissions=perms,
        )
        db.add(rel)
    else:
        existing_perms = dict(rel.permissions or {})
        existing_perms.update(perms)
        rel.permissions = existing_perms

    # Sync patient profile in SAVED_USER_PROFILES so it reflects across the app
    from apps.api.app.modules.auth.router import SAVED_USER_PROFILES, _save_profiles
    for email, prof in SAVED_USER_PROFILES.items():
        if prof.get("id") == patient.id or prof.get("phone") == patient.phone:
            if "patient_profile" not in prof:
                prof["patient_profile"] = {}
            prof["patient_profile"]["caregiver_name"] = clean_name
            prof["patient_profile"]["caregiver_phone"] = clean_phone
            prof["patient_profile"]["caregiver_relation"] = payload.relation or "Family Caregiver"
            SAVED_USER_PROFILES[email] = prof
            _save_profiles(SAVED_USER_PROFILES)
            break

    from apps.api.app.core.permissions import log_audit_entry
    await log_audit_entry(
        db=db,
        actor_id=patient.id,
        actor_role="patient",
        action="connect_caregiver_from_patient",
        target_type="patient",
        target_id=patient.id,
        details={
            "caregiver_id": caregiver_user.id,
            "caregiver_name": clean_name,
            "caregiver_phone": clean_phone,
            "relation": payload.relation,
        },
    )

    await db.flush()
    await db.commit()

    return {
        "success": True,
        "message": f"Successfully linked {clean_name} as your caretaker!",
        "caregiver": {
            "id": caregiver_user.id,
            "name": clean_name,
            "phone": clean_phone,
            "relation": payload.relation or "Family Caregiver",
            "connected": True,
        },
    }


@router.get("/caregivers/{caregiver_id}/patients", response_model=List[ClinicianPatientSummary])
async def get_caregiver_patients_roster(
    caregiver_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Elders linked to a caretaker via connection code (CareRelationship role=caregiver)."""
    rel_res = await db.execute(
        select(CareRelationship).where(
            CareRelationship.user_id == caregiver_id,
        )
    )
    linked_ids = [r.patient_id for r in rel_res.scalars().all()]
    if not linked_ids:
        # Fallback: check if the user has a patient_name in profile that matches an existing patient
        user_res = await db.execute(select(User).where(User.id == caregiver_id))
        user_row = user_res.scalar_one_or_none()
        from apps.api.app.modules.auth.router import SAVED_USER_PROFILES
        for prof in SAVED_USER_PROFILES.values():
            if prof.get("id") == caregiver_id and prof.get("caregiver_profile"):
                pname = prof["caregiver_profile"].get("patient_name")
                if pname:
                    p_match_res = await db.execute(select(Patient).where(Patient.name.ilike(f"%{pname}%")))
                    for pm in p_match_res.scalars().all():
                        if pm.id not in linked_ids:
                            linked_ids.append(pm.id)

    if not linked_ids:
        return []

    stmt = select(Patient).where(Patient.id.in_(linked_ids))
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
    return roster

@router.get("/clinicians/{doctor_id}/patients", response_model=List[ClinicianPatientSummary])
async def get_clinician_patients_roster(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
):
    from apps.api.app.core.auth import ensure_db_patient
    # Auto-sync patients registered as Users into Patient table
    user_stmt = select(User).where(User.role == "patient")
    u_res = await db.execute(user_stmt)
    patient_users = u_res.scalars().all()

    stmt = select(Patient)
    res = await db.execute(stmt)
    patients = list(res.scalars().all())

    existing_patient_ids = {p.id for p in patients}
    synced_any = False
    for u in patient_users:
        if u.id not in existing_patient_ids:
            ensured = await ensure_db_patient(db=db, patient_id=u.id, name=u.name, phone=u.phone, language=u.language)
            patients.append(ensured)
            existing_patient_ids.add(u.id)
            synced_any = True
    if synced_any:
        await db.commit()

    # Find care relationships for this clinician
    rel_stmt = select(CareRelationship).where(CareRelationship.user_id == doctor_id)
    rel_res = await db.execute(rel_stmt)
    linked_patient_ids = {r.patient_id for r in rel_res.scalars().all()}

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
    # Prioritize patients assigned to this doctor (clinician_of_record_id or linked CareRelationship)
    roster.sort(
        key=lambda x: (
            0 if (x.clinician_of_record_id == doctor_id or x.id in linked_patient_ids) else 1,
            severity_order.get(x.severity, 2),
            -(x.active_alerts_count or 0),
        )
    )

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


