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
    incoming_image_url = ""

    # 1. Parse Payload (Twilio vs. Meta)
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form_data = await request.form()
        from_phone = str(form_data.get("From", "")).replace("whatsapp:", "")
        incoming_text = str(form_data.get("Body", ""))
        source_msg_id = str(form_data.get("MessageSid", ""))
        media_type = str(form_data.get("MediaContentType0", ""))
        media_url = str(form_data.get("MediaUrl0", ""))
        num_media = int(form_data.get("NumMedia", 0) or 0)
        
        # If image is attached, process with Indian Meal Intelligence
        if num_media > 0 and media_url and ("image" in media_type or media_type.startswith("image/")):
            print(f"[Inbound Meal Photo] Analyzing meal image from {media_url}...")
            incoming_image_url = media_url
            if not incoming_text:
                incoming_text = "[Meal Photo]"
        
        # If voice note audio is attached, transcribe via Sarvam STT
        elif num_media > 0 and media_url:
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
                        elif msg_type == "image":
                            incoming_text = "[Meal Photo]"
                            incoming_image_url = msg.get("image", {}).get("link", "") or "meta_wa_image"
                        elif msg_type == "interactive":
                            incoming_text = msg.get("interactive", {}).get("button_reply", {}).get("title", "")
        except Exception as e:
            print(f"[Webhook JSON Parse Error] {e}")

    if not from_phone or (not incoming_text and not incoming_image_url):
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

    # --- INBOUND MEAL PHOTO ROUTING ---
    if incoming_image_url or (incoming_text and any(w in incoming_text.lower() for w in ["meal", "plate", "food", "khana", "jevan", "roti", "chapati", "thali", "lunch", "dinner", "nashta", "sabzi", "jamun"])):
        from apps.api.app.modules.meal_intelligence.gemini_vision_service import GeminiMealVisionService
        from apps.api.app.modules.meal_intelligence.cgm_correlator import correlate_meal_with_cgm
        from apps.api.app.modules.meal_intelligence.meal_history_service import record_meal_entry

        meal_service = GeminiMealVisionService()
        analysis = await meal_service.analyze_meal_image(
            image_input=incoming_image_url or incoming_text,
            patient_id=patient_id,
            context_hint=incoming_text if incoming_text != "[Meal Photo]" else None
        )
        cgm_corr = correlate_meal_with_cgm(analysis)
        record_meal_entry(analysis, cgm_corr)

        # Save HealthEvent in database
        event = HealthEvent(
            patient_id=patient_id,
            type="meal",
            value={
                "meal_id": analysis.meal_id,
                "meal_type": analysis.meal_type,
                "estimated_total_carbs_g": analysis.estimated_total_carbs_g,
                "carbohydrate_impact": analysis.carbohydrate_impact.value,
                "foods": [f.model_dump() for f in analysis.foods],
                "high_sugar_items": analysis.high_sugar_items,
                "confidence": analysis.confidence
            },
            measured_at=analysis.timestamp,
            reported_by="patient",
            source_msg_id=source_msg_id or None
        )
        db.add(event)
        await db.flush()

        foods_str = ", ".join([f.food for f in analysis.foods])
        reply_msg = (
            f"🍽️ {analysis.elderly_explanation}\n\n"
            f"📋 Estimated: {foods_str} (~{analysis.estimated_total_carbs_g:.0f}g carbs, Impact: {analysis.carbohydrate_impact.value})"
        )
        if analysis.sugar_warning:
            reply_msg += f"\n\n⚠️ {analysis.sugar_warning}"

        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{reply_msg}</Message></Response>'
            return Response(content=twiml, media_type="application/xml")
        await send_whatsapp_message(from_phone, reply_msg)
        return {
            "status": "meal_analyzed",
            "meal_id": analysis.meal_id,
            "estimated_carbs_g": analysis.estimated_total_carbs_g,
            "impact": analysis.carbohydrate_impact.value
        }

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

    # 5. Save Health Event in Database (Idempotent: skip duplicates if source_msg_id exists)
    if source_msg_id:
        existing_event = await db.execute(
            select(HealthEvent).where(HealthEvent.source_msg_id == source_msg_id)
        )
        if existing_event.scalar_one_or_none():
            return {"status": "duplicate_skipped", "source_msg_id": source_msg_id}

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


from pydantic import BaseModel
from apps.api.app.channels.sarvam_tts import (
    generate_speech_audio,
    map_patient_language_to_sarvam_code,
    format_elderly_friendly_spoken_text
)



class VoiceSynthesisRequest(BaseModel):
    text: str
    language: Optional[str] = "en"
    speaker: Optional[str] = None
    pace: Optional[float] = 0.95


class VoiceSynthesisResponse(BaseModel):
    voice_reply: bool
    language: str
    spoken_text: str
    audio_base64: Optional[str] = None
    audio_format: str = "audio/wav"
    audio_bytes_length: int = 0
    delivery_status: str = "simulated"
    fallback_to_text: bool = False


@router.post("/voice/synthesize", response_model=VoiceSynthesisResponse, tags=["Voice Synthesis"])
async def synthesize_voice_reply(payload: VoiceSynthesisRequest):
    """
    Synthesizes multilingual spoken voice audio using Sarvam AI Bulbul TTS (Bulbul v3).
    Supports Hindi ('hi'), Marathi ('mr'), and English ('en') with safe fallback.
    """
    target_lang = map_patient_language_to_sarvam_code(payload.language)
    audio_bytes, b64_audio, mime = await generate_speech_audio(
        text=payload.text,
        language_code=target_lang,
        speaker=payload.speaker,
        pace=payload.pace or 0.95
    )

    audio_success = audio_bytes is not None and len(audio_bytes) > 0
    return VoiceSynthesisResponse(
        voice_reply=audio_success,
        language=target_lang,
        spoken_text=payload.text,
        audio_base64=b64_audio if audio_success else None,
        audio_format=mime or "audio/wav",
        audio_bytes_length=len(audio_bytes) if audio_success else 0,
        delivery_status="simulated",
        fallback_to_text=not audio_success
    )

