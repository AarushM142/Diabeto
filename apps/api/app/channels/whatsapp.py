import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.config import settings
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import Patient, HealthEvent
from apps.api.app.modules.risk.engine import evaluate_and_record_risk
from apps.api.app.channels.sarvam_stt import download_and_transcribe_media_url
from apps.api.app.channels.twilio_client import send_whatsapp_message

router = APIRouter(prefix="/v1/webhooks", tags=["WhatsApp Webhook"])

@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """
    Meta WhatsApp Cloud API Webhook Verification.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.META_WA_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    return Response(content="Verification failed", status_code=status.HTTP_403_FORBIDDEN)

@router.post("/whatsapp")
async def handle_whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Unified Inbound WhatsApp Webhook (handles both Twilio Form and Meta JSON).
    Supports text messages and voice audio notes in Hindi, Marathi, and English.
    """
    content_type = request.headers.get("content-type", "")
    from_phone = ""
    incoming_text = ""
    source_msg_id = ""
    media_url = ""

    # 1. Parse Payload (Twilio vs. Meta)
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form_data = await request.form()
        from_phone = str(form_data.get("From", "")).replace("whatsapp:", "")
        incoming_text = str(form_data.get("Body", ""))
        source_msg_id = str(form_data.get("MessageSid", ""))
        media_url = str(form_data.get("MediaUrl0", ""))
        num_media = int(form_data.get("NumMedia", 0) or 0)
        
        # If voice note audio is attached, transcribe via Sarvam STT
        if num_media > 0 and media_url:
            print(f"[Inbound Voice Note] Downloading audio from {media_url}...")
            auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN) if settings.TWILIO_ACCOUNT_SID else None
            transcript, detected_lang = await download_and_transcribe_media_url(media_url, auth=auth)
            print(f"[Sarvam AI Transcript] '{transcript}' (Lang: {detected_lang})")
            if transcript:
                incoming_text = transcript

    else:
        # Meta Cloud API JSON payload
        try:
            payload = await request.json()
            entry_list = payload.get("entry", [])
            for entry in entry_list:
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    messages = value.get("messages", [])
                    for msg in messages:
                        source_msg_id = msg.get("id", "")
                        from_phone = msg.get("from", "")
                        msg_type = msg.get("type", "")
                        if msg_type == "text":
                            incoming_text = msg.get("text", {}).get("body", "")
                        elif msg_type == "interactive":
                            incoming_text = msg.get("interactive", {}).get("button_reply", {}).get("title", "")
        except Exception as e:
            print(f"[Webhook JSON Parse Error] {e}")

    if not from_phone or not incoming_text:
        return {"status": "ignored", "reason": "no message content"}

    # 2. Lookup Patient by Phone (last 10 digits)
    phone_clean = re.sub(r"\D", "", from_phone)[-10:]
    stmt = select(Patient).where(Patient.phone.contains(phone_clean))
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()

    # Fallback to Ramesh if testing from unrecognized number
    if not patient:
        stmt_fallback = select(Patient).where(Patient.id == "pt_ramesh_001")
        res_fb = await db.execute(stmt_fallback)
        patient = res_fb.scalar_one_or_none()

    patient_name = patient.name if patient else "Valued Senior"
    patient_id = patient.id if patient else "pt_ramesh_001"
    patient_lang = patient.language if patient else "hi"

    # 3. Parse Numerical Glucose Reading
    numbers = re.findall(r"\b\d{2,3}\b", incoming_text)
    if not numbers:
        # Generic reply if no number found
        reply_msg = (
            f"Namaste {patient_name}! Please send your blood glucose reading (e.g., '140' or a voice note in Hindi/Marathi)."
            if patient_lang == "en" else
            f"नमस्ते {patient_name} जी! कृपया अपना शुगर स्तर बताएं (जैसे '140' या बोलकर रिकॉर्ड करें)।"
        )
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{reply_msg}</Message></Response>'
            return Response(content=twiml, media_type="application/xml")
        await send_whatsapp_message(from_phone, reply_msg)
        return {"status": "prompted_for_reading"}

    glucose_val = float(numbers[0])

    # 4. Plausibility Validation (20 - 600 mg/dL)
    if glucose_val < 20 or glucose_val > 600:
        err_msg = (
            f"⚠️ Reading of {glucose_val} mg/dL seems unusual. Please re-check your glucometer and send again."
            if patient_lang == "en" else
            f"⚠️ {glucose_val} mg/dL की रीडिंग असामान्य लग रही है। कृपया मीटर दोबारा जांचें और फिर से भेजें।"
        )
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{err_msg}</Message></Response>'
            return Response(content=twiml, media_type="application/xml")
        await send_whatsapp_message(from_phone, err_msg)
        return {"status": "implausible_reading", "value": glucose_val}

    # 5. Save Health Event in Database
    event = HealthEvent(
        patient_id=patient_id,
        type="glucose",
        value={"mgdl": glucose_val, "context": "fasting", "transcript": incoming_text},
        measured_at=datetime.now(timezone.utc),
        reported_by="patient",
        source_msg_id=source_msg_id or None,
    )
    db.add(event)
    await db.flush()

    # 6. Evaluate Deterministic Risk Engine (Zero-AI)
    risk_event = await evaluate_and_record_risk(
        session=db,
        patient_id=patient_id,
        event_id=event.id,
        event_type="glucose",
        event_value={"mgdl": glucose_val},
    )

    # 7. Construct Immediate WhatsApp Response
    if risk_event and risk_event.severity == "critical":
        if risk_event.type == "critical_hypoglycemia":
            response_text = (
                f"🚨 EMERGENCY: Your glucose is {glucose_val} mg/dL (Critically Low). Consume 3 spoons of sugar or fruit juice immediately. If dizzy, call 112 or 108. We have alerted your family."
                if patient_lang == "en" else
                f"🚨 आपातकालीन सूचना: आपकी शुगर {glucose_val} mg/dL (बहुत कम) है। तुरंत 3 चम्मच चीनी या फलों का जूस लें। चक्कर आने पर 112 या 108 पर कॉल करें।"
            )
        else:
            response_text = (
                f"⚠️ URGENT: Your glucose is {glucose_val} mg/dL (Very High). Please drink water. Your care team has been notified."
                if patient_lang == "en" else
                f"⚠️ सूचना: आपकी शुगर {glucose_val} mg/dL (अधिक) है। कृपया पानी पिएं। आपकी केयर टीम को सूचित कर दिया गया है।"
            )
    else:
        # Normal or Watch confirmation
        response_text = (
            f"✅ Namaste {patient_name}! Your glucose reading of {glucose_val} mg/dL has been recorded. Keep up the good work!"
            if patient_lang == "en" else
            f"✅ नमस्ते {patient_name} जी! आपकी शुगर {glucose_val} mg/dL दर्ज कर ली गई है।"
        )

    # If inbound is from Twilio Form, reply directly via TwiML XML (no ContentSid restriction)
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{response_text}</Message></Response>'
        return Response(content=twiml, media_type="application/xml")

    await send_whatsapp_message(from_phone, response_text)

    return {
        "status": "success",
        "glucose_mgdl": glucose_val,
        "risk_status": risk_event.severity if risk_event else "normal",
        "patient": patient_name,
    }
