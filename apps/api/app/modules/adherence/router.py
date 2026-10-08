from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import MedicationSchedule, Patient
from apps.api.app.schemas.schemas import MedicationScheduleCreate, MedicationScheduleResponse

router = APIRouter(prefix="/v1", tags=["Medications & Adherence"])

@router.post("/patients/{patient_id}/medications", response_model=MedicationScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_medication_schedule(
    patient_id: str,
    payload: MedicationScheduleCreate,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    med = MedicationSchedule(
        patient_id=patient_id,
        drug_name=payload.drug_name,
        dosage=payload.dosage,
        scheduled_time=payload.scheduled_time,
        instructions=payload.instructions,
    )
    db.add(med)
    await db.flush()
    await db.refresh(med)
    return med

@router.get("/patients/{patient_id}/medications", response_model=List[MedicationScheduleResponse])
async def get_patient_medications(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(MedicationSchedule).where(MedicationSchedule.patient_id == patient_id)
    result = await db.execute(stmt)
    return result.scalars().all()
