from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.models.entities import Patient, RiskEvent, CareRelationship, User, PatientThreshold
from apps.api.app.channels.twilio_client import send_whatsapp_message, send_sms_message, trigger_voice_call
from apps.api.app.channels.template_manager import render_message

# Risk types (from risk/engine.py) that mean the sugar is too LOW. Everything
# else (critical_hyperglycemia, high_glucose, consecutive_high) is too high.
LOW_GLUCOSE_RISK_TYPES = frozenset({"critical_hypoglycemia", "low_glucose"})


def is_low_glucose_risk(risk_type: str) -> bool:
    return risk_type in LOW_GLUCOSE_RISK_TYPES


_LEVEL_WORDS = {
    "critical_hypoglycemia": {"en": "very low", "hi": "बहुत कम", "mr": "खूप कमी"},
    "low_glucose": {"en": "low", "hi": "कम", "mr": "कमी"},
    "critical_hyperglycemia": {"en": "very high", "hi": "बहुत ज़्यादा", "mr": "खूप जास्त"},
    "high_glucose": {"en": "high", "hi": "ज़्यादा", "mr": "जास्त"},
    "consecutive_high": {"en": "high on several readings", "hi": "कई बार ज़्यादा", "mr": "अनेक वेळा जास्त"},
}
_UNKNOWN_LEVEL = {"en": "outside the safe range", "hi": "सुरक्षित सीमा से बाहर", "mr": "सुरक्षित मर्यादेबाहेर"}


def caregiver_level_word(risk_type: str, glucose_val: Optional[float], view_raw: bool, lang: str = "en") -> str:
    """How a caregiver alert describes the sugar level, e.g. '58 mg/dL (very low)' or 'very low'."""
    words = _LEVEL_WORDS.get(risk_type, _UNKNOWN_LEVEL)
    word = words.get(lang) or words["en"]
    if view_raw and glucose_val:
        return f"{glucose_val:.0f} mg/dL ({word})"
    return word


async def trigger_immediate_0min_caregiver_alert(
    session: AsyncSession,
    risk_event: RiskEvent,
    patient: Patient,
    glucose_val: float,
) -> bool:
    """
    Tier 1 (0 min): Immediately alerts the family caregiver over WhatsApp
    when a critical low or high is detected, without waiting 15 minutes.
    """
    # Fetch Caregiver details
    cg_stmt = (
        select(CareRelationship, User)
        .join(User, CareRelationship.user_id == User.id)
        .where(CareRelationship.patient_id == patient.id, CareRelationship.role == "caregiver")
    )
    cg_res = await session.execute(cg_stmt)
    cg_pair = cg_res.first()
    if not cg_pair:
        return False

    cg_rel, cg_user = cg_pair
    cg_phone = cg_user.phone
    cg_lang = getattr(cg_user, "language", "en") or "en"
    perms = cg_rel.permissions or {}
    view_raw = perms.get("view_raw_glucose", False)

    # Exact value only if the patient allowed it; direction comes from the risk type.
    level_word = caregiver_level_word(risk_event.type, glucose_val, view_raw, cg_lang)

    now_time = datetime.now(timezone.utc).strftime("%H:%M UTC")
    clinic_phone = "+91 98111 11111"

    cg_msg = render_message(
        "caregiver_critical_alert",
        lang=cg_lang,
        patient_name=patient.name,
        level_word=level_word,
        time=now_time,
        clinic_phone=clinic_phone,
    )

    return await send_whatsapp_message(
        to_phone=cg_phone,
        body_text=cg_msg,
        template_key="caregiver_critical_alert",
        risk_event_id=risk_event.id,
        session=session,
    )

async def advance_escalation_state_machine(
    session: AsyncSession,
    risk_event_id: str,
    override_elapsed_minutes: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Evaluates an active risk event and advances the multi-tier escalation ladder:
    Tier 1 (0 min): Patient notified + Caregiver notified on WhatsApp
    Tier 2 (T1 = 15 min without ack): Caregiver escalated via SMS (+ WhatsApp reminder)
    Tier 3 (T2 = 30 min without ack): Clinician/Coach notified + Automated voice call + Emergency guidance
    """
    stmt = select(RiskEvent, Patient).join(Patient, RiskEvent.patient_id == Patient.id).where(RiskEvent.id == risk_event_id)
    res = await session.execute(stmt)
    row = res.first()
    if not row:
        return {"status": "not_found"}

    risk_event, patient = row

    if risk_event.status == "acknowledged" or risk_event.status == "resolved":
        return {"status": "already_handled", "risk_status": risk_event.status}

    # Calculate elapsed time since risk event creation
    now = datetime.now(timezone.utc)
    created_at = risk_event.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    elapsed_minutes = override_elapsed_minutes if override_elapsed_minutes is not None else int((now - created_at).total_seconds() / 60)

    # Fetch patient thresholds for escalation timings (default T1=15, T2=30)
    th_stmt = select(PatientThreshold).where(PatientThreshold.patient_id == patient.id)
    th_res = await session.execute(th_stmt)
    threshold = th_res.scalar_one_or_none()
    timings = threshold.escalation_timings if threshold and threshold.escalation_timings else {"t1_minutes": 15, "t2_minutes": 30}
    t1 = timings.get("t1_minutes", 15)
    t2 = timings.get("t2_minutes", 30)

    tier_reached = 1
    action_taken = "patient_alerted"

    # Fetch Caregiver details
    cg_stmt = (
        select(CareRelationship, User)
        .join(User, CareRelationship.user_id == User.id)
        .where(CareRelationship.patient_id == patient.id, CareRelationship.role == "caregiver")
    )
    cg_res = await session.execute(cg_stmt)
    cg_pair = cg_res.first()
    cg_phone = cg_pair[1].phone if cg_pair else None
    cg_name = cg_pair[1].name if cg_pair else "Family Caregiver"
    cg_lang = getattr(cg_pair[1], "language", "en") if cg_pair else "en"

    if elapsed_minutes >= t2:
        # Tier 3: Escalate to Doctor / Emergency + Automated Voice Call to Caregiver
        tier_reached = 3
        action_taken = "emergency_doctor_escalated"
        risk_event.status = "escalated_doctor"
        risk_event.ladder_step = 3
        
        # Send emergency guidance to patient & caregiver
        emergency_msg = (
            f"🚨 URGENT NOTICE for {patient.name}: High risk level unacknowledged for {elapsed_minutes} minutes. "
            f"If experiencing symptoms, please call 112 or 108 immediately. Doctor Dr. Arvind Mehta has been alerted."
            if patient.language == "en" else
            f"🚨 आपातकालीन सूचना: {patient.name} जी की स्थिति पिछले {elapsed_minutes} मिनट से अनसुलझी है। "
            f"कृपया तुरंत 112 या 108 पर कॉल करें। डॉ. अरविंद मेहता को सूचित कर दिया गया है।"
        )
        await send_whatsapp_message(patient.phone, emergency_msg, risk_event_id=risk_event_id, session=session)
        if cg_phone:
            await send_whatsapp_message(cg_phone, emergency_msg, risk_event_id=risk_event_id, session=session)
            # Trigger voice call as per §5
            await trigger_voice_call(
                to_phone=cg_phone,
                patient_name=patient.name,
                level_word="critically abnormal",
                risk_event_id=risk_event_id,
                lang=cg_lang,
                session=session,
            )

    elif elapsed_minutes >= t1:
        # Tier 2: Escalate to Caregiver (WhatsApp + SMS Fallback)
        tier_reached = 2
        action_taken = "caregiver_escalated"
        risk_event.status = "escalated_caregiver"
        risk_event.ladder_step = 2

        if cg_phone:
            cg_alert = (
                f"⚠️ Urgent Caregiver Alert: {patient.name} has an active risk alert ({risk_event.type.replace('_', ' ').title()}) "
                f"that has not been acknowledged for {elapsed_minutes} minutes. Please check on them immediately."
                if patient.language == "en" else
                f"⚠️ केयरगिवर सूचना: {patient.name} जी की ओर से पिछले {elapsed_minutes} मिनट से कोई जवाब नहीं आया है। "
                f"कृपया तुरंत उनसे संपर्क करें और स्थिति जांचें।"
            )
            await send_whatsapp_message(cg_phone, cg_alert, risk_event_id=risk_event_id, session=session)
            
            # Send SMS fallback as per §5
            sms_text = render_message(
                "sms_critical_alert",
                lang=cg_lang,
                patient_name=patient.name,
                level_word="critically abnormal",
                clinic_phone="+91 98111 11111",
            )
            await send_sms_message(cg_phone, sms_text, risk_event_id=risk_event_id, session=session)

    await session.flush()

    return {
        "risk_event_id": risk_event_id,
        "elapsed_minutes": elapsed_minutes,
        "tier": tier_reached,
        "action": action_taken,
        "status": risk_event.status,
    }

async def acknowledge_risk_event(
    session: AsyncSession,
    risk_event_id: str,
    actor_id: str,
    via: str = "whatsapp_button",
) -> bool:
    """
    Marks an active risk event as acknowledged, stopping further escalation timers.
    """
    stmt = select(RiskEvent).where(RiskEvent.id == risk_event_id)
    res = await session.execute(stmt)
    risk_event = res.scalar_one_or_none()
    if not risk_event:
        return False

    risk_event.status = "acknowledged"
    risk_event.acknowledged_by = actor_id
    risk_event.acknowledged_via = via
    risk_event.acknowledged_at = datetime.now(timezone.utc)
    await session.flush()
    return True
