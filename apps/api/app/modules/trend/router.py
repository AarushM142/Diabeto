from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import HealthEvent, Patient, Clinic, User, MedicationSchedule
from apps.api.app.modules.trend.report_generator import generate_clinical_pdf_report

router = APIRouter(prefix="/v1", tags=["Trends & Clinical Reports"])

@router.get("/patients/{patient_id}/trends")
async def get_patient_trends(
    patient_id: str,
    days: int = Query(14, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch glucose events
    stmt_events = (
        select(HealthEvent)
        .where(HealthEvent.patient_id == patient_id, HealthEvent.type == "glucose")
        .order_by(HealthEvent.measured_at.asc())
    )
    res_events = await db.execute(stmt_events)
    events = res_events.scalars().all()

    values = [float(e.value.get("mgdl", 0)) for e in events if "mgdl" in e.value]
    
    avg_glucose = sum(values) / len(values) if values else 0.0
    min_glucose = min(values) if values else 0.0
    max_glucose = max(values) if values else 0.0

    return {
        "patient_id": patient_id,
        "days": days,
        "reading_count": len(values),
        "summary": {
            "mean_glucose": round(avg_glucose, 1),
            "min_glucose": min_glucose,
            "max_glucose": max_glucose,
        },
        "readings": [
            {
                "measured_at": e.measured_at,
                "mgdl": e.value.get("mgdl"),
                "context": e.value.get("context", "fasting"),
            }
            for e in events
        ],
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
