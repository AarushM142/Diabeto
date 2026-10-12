import sys
import os
import json
import re
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath("."))

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import async_session_factory, engine
from apps.api.app.models.entities import (
    Clinic, User, Patient, CareRelationship, PatientThreshold,
    MedicationSchedule, HealthEvent
)


def compute_code(name: str, pid: str) -> str:
    clean_name = re.sub(r"[^A-Za-z]", "", name or "")
    prefix = (clean_name[:3] if len(clean_name) >= 3 else "DIA").upper()
    suffix = str(abs(hash(pid)))[:4]
    return f"DIA-{prefix}{suffix}"


async def seed_data():
    print("[+] Seeding realistic clinical patient data into Supabase...")

    json_path = "data/seed_patients.json"
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            patients_data = json.load(f)
    else:
        patients_data = []

    # Fallback seed patients if file is short or missing
    if not patients_data:
        patients_data = [
            {
                "patient_id": "pt_ramesh_001",
                "name": "Ramesh Kulkarni",
                "age": 68,
                "gender": "male",
                "language": "mr",
                "phone": "+919820100001",
                "thresholds": {"critical_low": 70, "low": 80, "high": 180, "critical_high": 250},
                "medications": [
                    {"drug_name": "Metformin", "dosage": "500mg", "scheduled_time": "08:30", "instructions": "After breakfast"},
                    {"drug_name": "Glimepiride", "dosage": "1mg", "scheduled_time": "20:30", "instructions": "Before dinner"}
                ]
            },
            {
                "patient_id": "pt_shanti_002",
                "name": "Shanti Devi",
                "age": 72,
                "gender": "female",
                "language": "hi",
                "phone": "+919820100002",
                "thresholds": {"critical_low": 70, "low": 80, "high": 180, "critical_high": 240},
                "medications": [
                    {"drug_name": "Vildagliptin", "dosage": "50mg", "scheduled_time": "09:00", "instructions": "Morning"},
                    {"drug_name": "Telmisartan", "dosage": "40mg", "scheduled_time": "08:00", "instructions": "Blood pressure"}
                ]
            },
            {
                "patient_id": "pt_ananya_003",
                "name": "Ananya Patil",
                "age": 64,
                "gender": "female",
                "language": "mr",
                "phone": "+919820100003",
                "thresholds": {"critical_low": 70, "low": 80, "high": 170, "critical_high": 230},
                "medications": [
                    {"drug_name": "Metformin SR", "dosage": "500mg", "scheduled_time": "20:00", "instructions": "With dinner"}
                ]
            }
        ]

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

        # 3. Seed Each Patient & Associated Records
        seeded_count = 0
        for p in patients_data:
            patient_id = p["patient_id"]
            code = compute_code(p["name"], patient_id)
            
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
                    consent_flags={
                        "consent_whatsapp": True,
                        "consent_caregiver": True,
                        "connection_code": code
                    },
                )
                session.add(patient)
                await session.flush()
                seeded_count += 1

                # Thresholds
                th = p.get("thresholds", {})
                threshold = PatientThreshold(
                    patient_id=patient_id,
                    critical_low=th.get("critical_low", 70.0),
                    low=th.get("low", 80.0),
                    high=th.get("high", 180.0),
                    critical_high=th.get("critical_high", 250.0),
                )
                session.add(threshold)

                # Caregivers
                for cg in p.get("caregivers", []):
                    cg_user_id = cg["caregiver_id"]
                    cg_stmt = select(User).where(User.id == cg_user_id)
                    cg_res = await session.execute(cg_stmt)
                    cg_user = cg_res.scalar_one_or_none()
                    if not cg_user:
                        cg_user = User(
                            id=cg_user_id,
                            clinic_id=clinic_id,
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
                        permissions=cg.get("permissions", {"view_adherence": True, "view_alerts": True}),
                    )
                    session.add(rel)

                # Doctor Care Relationship
                doc_rel = CareRelationship(
                    patient_id=patient_id,
                    user_id=doc_id,
                    role="clinician",
                    permissions={"view_adherence": True, "view_alerts": True, "view_raw_glucose": True, "manage_prescriptions": True}
                )
                session.add(doc_rel)

                # Medications
                for med in p.get("medications", []):
                    med_sched = MedicationSchedule(
                        patient_id=patient_id,
                        drug_name=med["drug_name"],
                        dosage=med["dosage"],
                        scheduled_time=med["scheduled_time"],
                        instructions=med.get("instructions"),
                    )
                    session.add(med_sched)

                # 14-day history readings
                for day in p.get("history_14_days", []):
                    date_str = day["date"]
                    for reading in day.get("readings", []):
                        measured_time_str = f"{date_str}T{reading['time']}:00Z"
                        try:
                            measured_dt = datetime.fromisoformat(measured_time_str.replace("Z", "+00:00"))
                        except Exception:
                            measured_dt = datetime.now(timezone.utc)

                        evt = HealthEvent(
                            patient_id=patient_id,
                            type=reading.get("type", "glucose"),
                            value={"mgdl": reading["value"], "context": reading.get("context", "fasting")},
                            measured_at=measured_dt,
                            reported_by=reading.get("reported_by", "patient"),
                        )
                        session.add(evt)
            else:
                # Make sure connection_code is populated
                flags = dict(existing_p.consent_flags or {})
                if "connection_code" not in flags or not flags["connection_code"]:
                    flags["connection_code"] = code
                    existing_p.consent_flags = flags
                    await session.flush()

        await session.commit()
        print(f"[SUCCESS] Successfully seeded {seeded_count} patient(s) with full clinical histories & connection codes!")
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_data())
