import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.core.config import settings
from apps.api.app.models.entities import Patient, CareRelationship, User, RiskEvent, AuditLog

logger = logging.getLogger("diabeto.escalation")

# Emergency Guidance Templates (Spoken & SMS)
ESCALATION_TEMPLATES = {
    "en": {
        "ivr_message": (
            "Emergency medical alert from Diabeto. Patient {patient_name}'s blood sugar has dropped critically low "
            "to {glucose_mgdl} milligrams per deciliter. Please administer 3 teaspoons of sugar, honey, or fruit juice immediately. "
            "If the patient is unconscious or unable to swallow, do not give liquids and call emergency services at 1 0 8 or 1 1 2 immediately. "
            "Repeating: Please give 3 teaspoons of sugar or honey immediately."
        ),
        "sms_message": (
            "🚨 DIABETO EMERGENCY ALERT: {patient_name}'s blood sugar is {glucose_mgdl} mg/dL (Critical Low). "
            "ACTION NEEDED: Give 3 teaspoons of sugar/honey immediately. "
            "If unconscious, call 108/112. Acknowledge: https://diabeto.care/ack/{risk_event_id}"
        ),
        "ivr_gather_prompt": "Press 1 on your phone keypad to confirm you are attending to the patient.",
        "ivr_acknowledged_message": "Thank you. Your acknowledgment is recorded in the patient chart. Please stay with the patient.",
        "voice": "Polly.Aditi",
        "language": "en-IN",
    },
    "hi": {
        "ivr_message": (
            "डायबेटो से आपातकालीन मेडिकल अलर्ट। मरीज़ {patient_name} का ब्लड शुगर खतरनाक स्तर {glucose_mgdl} मिलीग्राम प्रति डेसीलीटर तक गिर गया है। "
            "कृपया उन्हें तुरंत 3 चम्मच चीनी, शहद या ग्लूकोज का पानी दें। "
            "यदि वे बेहोश हैं, तो उन्हें तरल पदार्थ न दें और तुरंत 1 0 8 या 1 1 2 पर कॉल करें। "
            "दोहराते हैं: कृपया तुरंत 3 चम्मच चीनी दें।"
        ),
        "sms_message": (
            "🚨 डायबेटो इमरजेंसी अलर्ट: {patient_name} का शुगर {glucose_mgdl} mg/dL (खतरनाक कम) है। "
            "तुरंत 3 चम्मच चीनी/शहद दें। बेहोश होने पर 108/112 पर कॉल करें। कन्फर्म करें: https://diabeto.care/ack/{risk_event_id}"
        ),
        "ivr_gather_prompt": "पुष्टि करने के लिए अपने फोन पर 1 दबाएं कि आप मरीज की देखभाल कर रहे हैं।",
        "ivr_acknowledged_message": "धन्यवाद। आपकी पुष्टि मेडिकल चार्ट में दर्ज कर ली गई है। कृपया मरीज के साथ रहें।",
        "voice": "Polly.Aditi",
        "language": "hi-IN",
    },
    "mr": {
        "ivr_message": (
            "डायबेटोकडून तातडीचा वैद्यकीय इशारा. रुग्ण {patient_name} यांची रक्तातील साखर अत्यंत कमी {glucose_mgdl} मिलीग्रॅम झाली आहे. "
            "कृपया त्यांना लगेच ३ चमचे साखर, मध किंवा ग्लुकोजचे पाणी द्या. "
            "रुग्ण बेशुद्ध असल्यास काहीही पाजू नका आणि ताबडतोब १०८ किंवा ११२ वर कॉल करा. "
            "पुन्हा सांगतो: कृपया ताबडतोब ३ चमचे साखर द्या."
        ),
        "sms_message": (
            "🚨 डायबेटो आणीबाणी इशारा: {patient_name} यांची साखर {glucose_mgdl} mg/dL (अत्यंत कमी) आहे. "
            "तातडीने ३ चमचे साखर/मध द्या. बेशुद्ध असल्यास १०८ किंवा ११२ वर कॉल करा. खात्री करा: https://diabeto.care/ack/{risk_event_id}"
        ),
        "ivr_gather_prompt": "तुम्ही रुग्णाजवळ आहात याची खात्री करण्यासाठी फोनवर १ दाबा.",
        "ivr_acknowledged_message": "धन्यवाद. तुमची नोंद मेडिकल चार्टमध्ये झाली आहे. कृपया रुग्णाजवळ राहा.",
        "voice": "Polly.Aditi",
        "language": "mr-IN",
    },
}

def generate_twiml_ivr(
    patient_name: str,
    glucose_mgdl: float,
    risk_event_id: str,
    language: str = "en",
    callback_base_url: Optional[str] = None,
) -> str:
    """
    Constructs compliant Twilio Voice XML (TwiML) for automated emergency outbound calls.
    Includes spoken clinical rescue steps and a DTMF keypad Gather for 1-button confirmation.
    """
    lang_key = language.lower() if language.lower() in ESCALATION_TEMPLATES else "en"
    template = ESCALATION_TEMPLATES[lang_key]

    spoken_body = template["ivr_message"].format(
        patient_name=patient_name,
        glucose_mgdl=int(glucose_mgdl),
    )
    gather_prompt = template["ivr_gather_prompt"]
    voice = template["voice"]
    twiml_lang = template["language"]

    base_url = callback_base_url or "http://localhost:8000"
    callback_url = f"{base_url}/v1/escalations/twiml/callback?risk_event_id={risk_event_id}&lang={lang_key}"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Pause length="1"/>
    <Say voice="{voice}" language="{twiml_lang}">{spoken_body}</Say>
    <Pause length="1"/>
    <Gather numDigits="1" action="{callback_url}" method="POST" timeout="10">
        <Say voice="{voice}" language="{twiml_lang}">{gather_prompt}</Say>
    </Gather>
    <Say voice="{voice}" language="{twiml_lang}">{spoken_body}</Say>
    <Say voice="{voice}" language="{twiml_lang}">Diabeto Emergency System. Dispatched alert to clinic record. Goodbye.</Say>
</Response>"""
    return twiml.strip()

def check_active_cooldown(
    last_escalation_time: Optional[datetime],
    cooldown_minutes: int = 15,
) -> bool:
    """
    Checks if an emergency escalation was triggered within the active cooldown window.
    """
    if not last_escalation_time:
        return False
    now = datetime.now(timezone.utc)
    # Ensure timezone awareness
    if last_escalation_time.tzinfo is None:
        last_escalation_time = last_escalation_time.replace(tzinfo=timezone.utc)
    return (now - last_escalation_time) < timedelta(minutes=cooldown_minutes)

async def find_patient_caregivers(
    db: AsyncSession,
    patient_id: str,
) -> List[Dict[str, Any]]:
    """
    Finds all active caregivers mapped to the patient via care_relationships.
    Falls back to clinician of record if no caregiver is mapped.
    """
    stmt = (
        select(User, CareRelationship.role)
        .join(CareRelationship, CareRelationship.user_id == User.id)
        .where(
            CareRelationship.patient_id == patient_id,
            CareRelationship.role == "caregiver",
        )
    )
    res = await db.execute(stmt)
    rows = res.all()

    caregivers = []
    for user, role in rows:
        caregivers.append({
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "language": user.language or "en",
            "role": role,
        })

    # If no caregivers found, retrieve primary clinician as safety fallback
    if not caregivers:
        stmt_pt = select(Patient).where(Patient.id == patient_id)
        pt_res = await db.execute(stmt_pt)
        pt = pt_res.scalar_one_or_none()
        if pt and pt.clinician_of_record_id:
            stmt_doc = select(User).where(User.id == pt.clinician_of_record_id)
            doc_res = await db.execute(stmt_doc)
            doc = doc_res.scalar_one_or_none()
            if doc:
                caregivers.append({
                    "id": doc.id,
                    "name": doc.name,
                    "phone": doc.phone,
                    "language": doc.language or "en",
                    "role": "clinician_fallback",
                })

    return caregivers

async def dispatch_emergency_escalation(
    db: AsyncSession,
    patient_id: str,
    glucose_mgdl: float,
    risk_event_id: Optional[str] = None,
    reason: Optional[str] = None,
    force_dispatch: bool = False,
    callback_base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Dispatches automated Twilio IVR phone call and high-priority SMS alerts to family caregivers.
    Implements rate limiting, cooldown protection, and full database audit logging.
    """
    # 1. Fetch Patient
    stmt_pt = select(Patient).where(Patient.id == patient_id)
    res_pt = await db.execute(stmt_pt)
    patient = res_pt.scalar_one_or_none()
    if not patient:
        return {"status": "error", "message": "Patient not found"}

    # 2. Check Cooldown Window (15 minutes)
    stmt_recent = (
        select(AuditLog)
        .where(
            AuditLog.target_type == "patient",
            AuditLog.target_id == patient_id,
            AuditLog.action == "emergency_escalation_dispatched",
        )
        .order_by(AuditLog.created_at.desc())
    )
    res_recent = await db.execute(stmt_recent)
    last_log = res_recent.scalars().first()

    if not force_dispatch and last_log and check_active_cooldown(last_log.created_at, cooldown_minutes=15):
        logger.info(f"Emergency escalation suppressed by cooldown for patient {patient_id}")
        return {
            "status": "suppressed_cooldown",
            "message": "Emergency escalation was already dispatched within the 15-minute cooldown window.",
            "patient_id": patient_id,
            "glucose_mgdl": glucose_mgdl,
            "last_dispatched_at": last_log.created_at.isoformat(),
        }

    # 3. Locate Caregivers / Emergency Contacts
    caregivers = await find_patient_caregivers(db, patient_id)
    if not caregivers:
        logger.warning(f"No caregivers or emergency contacts found for patient {patient_id}")
        # Use patient's own phone as emergency recipient
        caregivers = [{
            "id": patient.id,
            "name": f"Family of {patient.name}",
            "phone": patient.phone,
            "language": patient.language or "en",
            "role": "primary_contact",
        }]

    # 4. Formulate Alerts
    # Use patient's preferred language if caregiver has none specified
    pref_lang = patient.language or "en"
    tpl = ESCALATION_TEMPLATES.get(pref_lang, ESCALATION_TEMPLATES["en"])
    
    event_id = risk_event_id or f"risk_{uuid.uuid4().hex[:12]}"
    sms_text = tpl["sms_message"].format(
        patient_name=patient.name,
        glucose_mgdl=int(glucose_mgdl),
        risk_event_id=event_id,
    )
    twiml_content = generate_twiml_ivr(
        patient_name=patient.name,
        glucose_mgdl=glucose_mgdl,
        risk_event_id=event_id,
        language=pref_lang,
        callback_base_url=callback_base_url,
    )

    # 5. Dispatch via Twilio (Real or Graceful Simulated Mode)
    twilio_ready = bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and not settings.TWILIO_ACCOUNT_SID.startswith("YOUR_")
    )

    twilio_client = None
    if twilio_ready:
        try:
            from twilio.rest import Client
            twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")
            twilio_client = None

    dispatch_results = []
    from_number = settings.TWILIO_PHONE_NUMBER or "+14155238886"

    for cg in caregivers:
        cg_phone = cg["phone"].strip()
        call_sid = None
        sms_sid = None
        call_status = "simulated"
        sms_status = "simulated"

        if twilio_client:
            # A. Dispatch Twilio Outbound Voice Call (IVR)
            try:
                call = twilio_client.calls.create(
                    to=cg_phone,
                    from_=from_number,
                    twiml=twiml_content,
                )
                call_sid = call.sid
                call_status = call.status or "queued"
            except Exception as e:
                logger.error(f"Twilio call failed to {cg_phone}: {e}")
                call_sid = f"CA_err_{uuid.uuid4().hex[:12]}"
                call_status = f"failed: {str(e)[:50]}"

            # B. Dispatch Twilio Outbound SMS
            try:
                msg = twilio_client.messages.create(
                    to=cg_phone,
                    from_=from_number,
                    body=sms_text,
                )
                sms_sid = msg.sid
                sms_status = msg.status or "queued"
            except Exception as e:
                logger.error(f"Twilio SMS failed to {cg_phone}: {e}")
                sms_sid = f"SM_err_{uuid.uuid4().hex[:12]}"
                sms_status = f"failed: {str(e)[:50]}"
        else:
            # Simulated IDs for development / test environments
            call_sid = f"CA_sim_{uuid.uuid4().hex[:16]}"
            sms_sid = f"SM_sim_{uuid.uuid4().hex[:16]}"
            call_status = "simulated_dispatched"
            sms_status = "simulated_dispatched"

        dispatch_results.append({
            "recipient_id": cg["id"],
            "recipient_name": cg["name"],
            "recipient_phone": cg_phone,
            "role": cg["role"],
            "call_sid": call_sid,
            "call_status": call_status,
            "sms_sid": sms_sid,
            "sms_status": sms_status,
        })

    # 6. Audit Logging & DB State Updates
    audit_entry = AuditLog(
        actor_id="system_emergency_service",
        action="emergency_escalation_dispatched",
        target_type="patient",
        target_id=patient_id,
        details={
            "glucose_mgdl": glucose_mgdl,
            "risk_event_id": event_id,
            "reason": reason or "Critical hypoglycemia breach (< 70 mg/dL)",
            "language": pref_lang,
            "dispatches": dispatch_results,
            "is_real_twilio": twilio_ready and (twilio_client is not None),
        },
    )
    db.add(audit_entry)

    # 7. Create or update RiskEvent status to 'escalated'
    if risk_event_id:
        stmt_risk = select(RiskEvent).where(RiskEvent.id == risk_event_id)
        res_risk = await db.execute(stmt_risk)
        risk_obj = res_risk.scalar_one_or_none()
        if risk_obj:
            risk_obj.status = "escalated"
    else:
        risk_obj = RiskEvent(
            id=event_id,
            patient_id=patient_id,
            type="critical_hypoglycemia",
            severity="critical",
            evidence_ids=[],
            rule_version="1.0.0",
            status="escalated",
        )
        db.add(risk_obj)

    await db.flush()

    return {
        "status": "dispatched",
        "patient_id": patient_id,
        "patient_name": patient.name,
        "glucose_mgdl": glucose_mgdl,
        "risk_event_id": event_id,
        "language": pref_lang,
        "emergency_sms_preview": sms_text,
        "recipients_notified": len(dispatch_results),
        "dispatches": dispatch_results,
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "mode": "live_twilio" if (twilio_ready and twilio_client) else "simulated_twilio",
    }

async def acknowledge_emergency(
    db: AsyncSession,
    risk_event_id: str,
    acknowledged_by: str,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Caregiver or clinician acknowledgment of a critical hypoglycemic emergency.
    """
    stmt = select(RiskEvent).where(RiskEvent.id == risk_event_id)
    res = await db.execute(stmt)
    risk_event = res.scalar_one_or_none()
    patient_id_for_ack = risk_event.patient_id if risk_event else "unknown"

    if risk_event:
        risk_event.status = "acknowledged"

    # Audit log acknowledgment
    audit = AuditLog(
        actor_id=acknowledged_by,
        action="emergency_acknowledged",
        target_type="risk_event",
        target_id=risk_event_id,
        details={
            "acknowledged_by": acknowledged_by,
            "notes": notes or "Caregiver confirmed sugar administered.",
            "acknowledged_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    db.add(audit)
    await db.flush()

    return {
        "status": "acknowledged",
        "risk_event_id": risk_event_id,
        "patient_id": patient_id_for_ack,
        "acknowledged_by": acknowledged_by,
        "acknowledged_at": datetime.now(timezone.utc).isoformat(),
    }
