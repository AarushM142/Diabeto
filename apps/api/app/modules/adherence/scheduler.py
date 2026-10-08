from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from apps.api.app.models.entities import Patient, MedicationSchedule, HealthEvent, RiskEvent, CareRelationship, User
from apps.api.app.channels.twilio_client import send_whatsapp_message
from apps.api.app.core.jobs import enqueue_job

async def check_and_send_medication_reminders(session: AsyncSession) -> List[Dict[str, Any]]:
    """
    Scans active medication schedules and triggers due dose reminders.
    """
    now = datetime.now(timezone.utc)
    current_time_str = now.strftime("%H:%M")

    # Find active schedules
    stmt = (
        select(MedicationSchedule, Patient)
        .join(Patient, MedicationSchedule.patient_id == Patient.id)
        .where(MedicationSchedule.is_active == True)
    )
    results = await session.execute(stmt)
    schedules = results.all()

    reminders_sent = []
    for med, patient in schedules:
        # Check if reminder message needs to be sent
        lang = patient.language or "hi"
        med_name = f"{med.drug_name} {med.dosage}"
        
        if lang == "en":
            body = f"Namaste {patient.name}! It is {med.scheduled_time}. Did you take your {med_name}? Please reply [YES] or [NO]."
        elif lang == "mr":
            body = f"नमस्ते {patient.name}! {med.scheduled_time} वाजले आहेत. तुम्ही तुमची {med_name} औषध घेतली का? कृपया [होय] किंवा [नाही] उत्तर द्या."
        else: # hi
            body = f"नमस्ते {patient.name} जी! {med.scheduled_time} का समय हो गया है। क्या आपने अपनी {med_name} ले ली है? कृपया [हाँ] या [नहीं] लिखकर बताएं।"

        await send_whatsapp_message(patient.phone, body)
        reminders_sent.append({
            "patient_id": patient.id,
            "medication": med_name,
            "scheduled_time": med.scheduled_time,
            "phone": patient.phone,
        })

    return reminders_sent

async def handle_medication_missed_escalation(
    session: AsyncSession,
    patient_id: str,
    medication_name: str,
    scheduled_time: str,
) -> Optional[RiskEvent]:
    """
    Triggered when all patient retry windows expire without dose confirmation.
    Logs a MedicationMissed risk event and alerts the family caregiver.
    """
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await session.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        return None

    # 1. Log Risk Event in database
    risk_event = RiskEvent(
        patient_id=patient_id,
        type="missed_dose",
        severity="urgent",
        evidence_ids=[f"med_{scheduled_time}"],
        rule_version="1.0.0",
        status="active",
    )
    session.add(risk_event)
    await session.flush()

    # 2. Find Registered Caregiver for this patient
    cg_stmt = (
        select(CareRelationship, User)
        .join(User, CareRelationship.user_id == User.id)
        .where(
            CareRelationship.patient_id == patient_id,
            CareRelationship.role == "caregiver"
        )
    )
    cg_res = await session.execute(cg_stmt)
    caregiver_pair = cg_res.first()

    if caregiver_pair:
        care_rel, caregiver_user = caregiver_pair
        cg_phone = caregiver_user.phone
        cg_lang = caregiver_user.language or "hi"

        if cg_lang == "en":
            cg_msg = f"⚠️ Caregiver Alert: {patient.name} has not confirmed taking their {medication_name} scheduled for {scheduled_time}. Please check in with them."
        elif cg_lang == "mr":
            cg_msg = f"⚠️ काळजीवाहू सूचना: {patient.name} यांनी {scheduled_time} ची {medication_name} औषध घेतल्याची पुष्टी केलेली नाही. कृपया त्यांच्याशी संपर्क साधा."
        else:
            cg_msg = f"⚠️ केयरगिवर सूचना: {patient.name} जी ने {scheduled_time} की {medication_name} की पुष्टि नहीं की है। कृपया उनसे संपर्क करें।"

        await send_whatsapp_message(cg_phone, cg_msg)

    return risk_event
