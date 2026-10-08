from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.models.entities import Patient, RiskEvent, CareRelationship, User, PatientThreshold
from apps.api.app.channels.twilio_client import send_whatsapp_message

async def advance_escalation_state_machine(
    session: AsyncSession,
    risk_event_id: str,
    override_elapsed_minutes: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Evaluates an active risk event and advances the multi-tier escalation ladder:
    Tier 1 (0 min): Patient notified (Immediate Protocol Msg)
    Tier 2 (T1 = 15 min without ack): Caregiver notified on WhatsApp
    Tier 3 (T2 = 30 min without ack): Clinician/Coach notified + Emergency 112/108 guidance
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

    if elapsed_minutes >= t2:
        # Tier 3: Escalate to Doctor / Emergency
        tier_reached = 3
        action_taken = "emergency_doctor_escalated"
        risk_event.status = "escalated_doctor"
        
        # Send emergency guidance to patient & caregiver
        emergency_msg = (
            f"🚨 URGENT NOTICE for {patient.name}: High risk level unacknowledged for {elapsed_minutes} minutes. "
            f"If experiencing symptoms, please call 112 or 108 immediately. Doctor Dr. Arvind Mehta has been alerted."
            if patient.language == "en" else
            f"🚨 आपातकालीन सूचना: {patient.name} जी की स्थिति पिछले {elapsed_minutes} मिनट से अनसुलझी है। "
            f"कृपया तुरंत 112 या 108 पर कॉल करें। डॉ. अरविंद मेहता को सूचित कर दिया गया है।"
        )
        await send_whatsapp_message(patient.phone, emergency_msg)
        if cg_phone:
            await send_whatsapp_message(cg_phone, emergency_msg)

    elif elapsed_minutes >= t1:
        # Tier 2: Escalate to Caregiver
        tier_reached = 2
        action_taken = "caregiver_escalated"
        risk_event.status = "escalated_caregiver"

        if cg_phone:
            cg_alert = (
                f"⚠️ Urgent Caregiver Alert: {patient.name} has an active risk alert ({risk_event.type.replace('_', ' ').title()}) "
                f"that has not been acknowledged for {elapsed_minutes} minutes. Please check on them immediately."
                if patient.language == "en" else
                f"⚠️ केयरगिवर सूचना: {patient.name} जी की ओर से पिछले {elapsed_minutes} मिनट से कोई जवाब नहीं आया है। "
                f"कृपया तुरंत उनसे संपर्क करें और स्थिति जांचें।"
            )
            await send_whatsapp_message(cg_phone, cg_alert)

    await session.flush()

    return {
        "risk_event_id": risk_event_id,
        "elapsed_minutes": elapsed_minutes,
        "tier": tier_reached,
        "action": action_taken,
        "status": risk_event.status,
    }

async def acknowledge_risk_event(session: AsyncSession, risk_event_id: str, actor_id: str) -> bool:
    """
    Marks an active risk event as acknowledged, stopping further escalation timers.
    """
    stmt = select(RiskEvent).where(RiskEvent.id == risk_event_id)
    res = await session.execute(stmt)
    risk_event = res.scalar_one_or_none()
    if not risk_event:
        return False

    risk_event.status = "acknowledged"
    await session.flush()
    return True
