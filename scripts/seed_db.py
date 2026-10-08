import sys
import os
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath("."))

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import async_session_factory, engine
from apps.api.app.models.entities import (
    Clinic, User, Patient, CareRelationship, PatientThreshold,
    MedicationSchedule, HealthEvent
)

async def seed_data():
    print("Reading data/seed_patients.json...")
    with open("data/seed_patients.json", "r", encoding="utf-8") as f:
        patients_data = json.load(f)

    async with async_session_factory() as session:
        # 1. Create Default Clinic
        clinic_id = "clinic_pune_central"
        stmt = select(Clinic).where(Clinic.id == clinic_id)
        res = await session.execute(stmt)
        clinic = res.scalar_one_or_none()
        if not clinic:
            clinic = Clinic(id=clinic_id, name="Pune Central Diabetes Clinic", address="FC Road, Pune")
            session.add(clinic)
            await session.flush()

        # 2. Create Default Clinician of Record
        doc_id = "doc_mehta_101"
        stmt = select(User).where(User.id == doc_id)
        res = await session.execute(stmt)
        doctor = res.scalar_one_or_none()
        if not doctor:
            doctor = User(
                id=doc_id,
                clinic_id=clinic_id,
                role="clinician",
                name="Dr. Arvind Mehta",
                phone="+919811111111",
                language="en",
            )
            session.add(doctor)
            await session.flush()

        # 3. Ingest Each Patient & Related Records
        for p in patients_data:
            patient_id = p["patient_id"]
            stmt = select(Patient).where(Patient.id == patient_id)
            res = await session.execute(stmt)
            existing_p = res.scalar_one_or_none()
            if not existing_p:
                patient = Patient(
                    id=patient_id,
                    clinic_id=clinic_id,
                    clinician_of_record_id=doc_id,
                    name=p["name"],
                    age=p["age"],
                    gender=p["gender"],
                    phone=p["phone"],
                    language=p.get("language", "hi"),
                    consent_flags={"consent_whatsapp": True, "consent_caregiver": True},
                )
                session.add(patient)
                await session.flush()

                # Add Thresholds
                th = p.get("thresholds", {})
                threshold = PatientThreshold(
                    patient_id=patient_id,
                    critical_low=th.get("critical_low", 70.0),
                    low=th.get("low", 80.0),
                    high=th.get("high", 180.0),
                    critical_high=th.get("critical_high", 250.0),
                )
                session.add(threshold)

                # Add Caregivers
                for cg in p.get("caregivers", []):
                    cg_user_id = cg["caregiver_id"]
                    cg_user = User(
                        id=cg_user_id,
                        role="caregiver",
                        name=cg["name"],
                        phone=cg["phone"],
                        language=p.get("language", "hi"),
                    )
                    session.add(cg_user)
                    await session.flush()

                    rel = CareRelationship(
                        patient_id=patient_id,
                        user_id=cg_user_id,
                        role="caregiver",
                        permissions=cg.get("permissions", {}),
                    )
                    session.add(rel)

                # Add Medications
                for med in p.get("medications", []):
                    med_sched = MedicationSchedule(
                        patient_id=patient_id,
                        drug_name=med["drug_name"],
                        dosage=med["dosage"],
                        scheduled_time=med["scheduled_time"],
                        instructions=med.get("instructions"),
                    )
                    session.add(med_sched)

                # Add 14-day history readings
                for day in p.get("history_14_days", []):
                    date_str = day["date"]
                    for reading in day.get("readings", []):
                        measured_time_str = f"{date_str}T{reading['time']}:00Z"
                        measured_dt = datetime.fromisoformat(measured_time_str.replace("Z", "+00:00"))
                        evt = HealthEvent(
                            patient_id=patient_id,
                            type=reading.get("type", "glucose"),
                            value={"mgdl": reading["value"], "context": reading.get("context", "fasting")},
                            measured_at=measured_dt,
                            reported_by=reading.get("reported_by", "patient"),
                        )
                        session.add(evt)

        await session.commit()
        print(" Seed data successfully loaded into Supabase!")
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_data())
