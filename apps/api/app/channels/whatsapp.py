import re
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from apps.api.app.core.config import settings
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import (
    Patient, HealthEvent, User, CareRelationship, RiskEvent, MessageLog, ConversationState
)
from apps.api.app.modules.risk.engine import evaluate_and_record_risk
from apps.api.app.modules.risk.escalation import (
    acknowledge_risk_event, trigger_immediate_0min_caregiver_alert, is_low_glucose_risk
)
from apps.api.app.channels.sarvam_stt import download_and_transcribe_media_url
from apps.api.app.channels.twilio_client import (
    send_whatsapp_message, send_sms_message
)
from apps.api.app.channels.template_manager import render_message
from apps.api.app.channels.number_parser import parse_glucose_reading
from apps.api.app.channels.twilio_validator import verify_twilio_request, signature_validation_enabled
from apps.api.app.channels.image_classifier import classify_and_read_image
from apps.api.app.channels.reply_intents import is_affirmative, is_negative, is_caregiver_ack

router = APIRouter(prefix="/v1/webhooks", tags=["WhatsApp Webhook"])

def _format_twiml_response(reply_msg: str) -> Response:
    escaped = (
        reply_msg.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escaped}</Message></Response>'
    return Response(content=twiml, media_type="application/xml")

async def _safe_db_add(db: Any, entity: Any) -> None:
    res = db.add(entity)
    if hasattr(res, "__await__"):
        await res

async def _safe_db_delete(db: Any, entity: Any) -> None:
    res = db.delete(entity)
    if hasattr(res, "__await__"):
        await res

async def _latest_active_risk_id_for_caregiver(db: AsyncSession, caregiver_id: str) -> Optional[str]:
    stmt = (
        select(RiskEvent)
        .join(CareRelationship, RiskEvent.patient_id == CareRelationship.patient_id)
        .where(CareRelationship.user_id == caregiver_id, RiskEvent.status == "active")
        .order_by(RiskEvent.created_at.desc())
    )
    res = await db.execute(stmt)
    latest = res.scalars().first()
    return latest.id if latest else None

async def _caregiver_owns_risk_event(db: AsyncSession, caregiver_id: str, risk_event_id: str) -> bool:
    """True only if the alert belongs to one of this caregiver's patients."""
    stmt = (
        select(RiskEvent.id)
        .join(CareRelationship, RiskEvent.patient_id == CareRelationship.patient_id)
        .where(CareRelationship.user_id == caregiver_id, RiskEvent.id == risk_event_id)
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none() is not None

async def _handle_caregiver_message(
    db: AsyncSession,
    caregiver_user: User,
    from_phone: str,
    incoming_text: str,
    button_payload: str,
    is_form: bool,
):
    """
    Acknowledges an alert only for the "I've checked" button (ack:<risk_event_id>)
    or a reply that is *entirely* an acknowledgement ("OK", "checked", "देख लिया").
    Anything else gets an info reply — never treated as a reading or patient command.
    """
    risk_id: Optional[str] = None
    via = "whatsapp_button"
    if button_payload.startswith("ack:"):
        candidate = button_payload[len("ack:"):].strip()
        if candidate and await _caregiver_owns_risk_event(db, caregiver_user.id, candidate):
            risk_id = candidate
    elif is_caregiver_ack(incoming_text):
        risk_id = await _latest_active_risk_id_for_caregiver(db, caregiver_user.id)
        via = "whatsapp_text"

    if risk_id:
        await acknowledge_risk_event(db, risk_id, actor_id=caregiver_user.id, via=via)
        ack_reply = "Thank you, we've noted that you have checked on them. The alert is now acknowledged. ✅"
        if is_form:
            return _format_twiml_response(ack_reply)
        await send_whatsapp_message(from_phone, ack_reply)
        return {"status": "acknowledged", "risk_event_id": risk_id}

    info_reply = render_message("caregiver_info_reply", lang=caregiver_user.language or "en")
    if is_form:
        return _format_twiml_response(info_reply)
    await send_whatsapp_message(from_phone, info_reply)
    return {"status": "caregiver_message_not_actioned"}

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
    Unified Inbound WhatsApp Webhook (Twilio Form and Meta JSON).
    Handles identity, opt-in/STOP, glucose readings with echo-back confirmation,
    meter vs meal photo classification, caregiver alert acknowledgements, and voice notes.
    """
    content_type = request.headers.get("content-type", "")
    from_phone = ""
    incoming_text = ""
    incoming_image_url = ""
    source_msg_id = ""
    button_payload = ""
    media_type = ""
    media_url = ""
    is_form = "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type

    # 1. Parse Payload (Twilio Form vs Meta JSON)
    if is_form:
        form_data = await request.form()
        params = dict(form_data)

        # Reject unsigned or wrongly signed requests (a missing header is rejected too).
        verify_twilio_request(request, params)

        from_phone = str(form_data.get("From", "")).replace("whatsapp:", "").strip()
        incoming_text = str(form_data.get("Body", "")).strip()
        source_msg_id = str(form_data.get("MessageSid", "")).strip()
        media_type = str(form_data.get("MediaContentType0", "")).strip()
        media_url = str(form_data.get("MediaUrl0", "")).strip()
        num_media = int(form_data.get("NumMedia", 0) or 0)
        button_payload = str(form_data.get("ButtonPayload", "")).strip()

        # Voice note transcription via Sarvam STT
        if num_media > 0 and media_url and ("audio" in media_type or media_type.startswith("audio/")):
            auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN) if settings.TWILIO_ACCOUNT_SID else None
            transcript, detected_lang = await download_and_transcribe_media_url(media_url, auth=auth)
            if transcript:
                incoming_text = transcript

        # Image attached
        elif num_media > 0 and media_url and ("image" in media_type or media_type.startswith("image/")):
            incoming_image_url = media_url

    else:
        # Meta Cloud API JSON payload. It carries no Twilio signature, so while
        # signature checks are on it must not become a way around them.
        if signature_validation_enabled():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unsigned JSON webhooks are disabled while Twilio signature validation is on",
            )
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
                            incoming_image_url = msg.get("image", {}).get("link", "") or "meta_image"
                        elif msg_type == "interactive":
                            interactive_data = msg.get("interactive", {})
                            btn_reply = interactive_data.get("button_reply", {})
                            incoming_text = btn_reply.get("title", "")
                            button_payload = btn_reply.get("id", "")
        except Exception as e:
            print(f"[Webhook JSON Parse Error] {e}")

    if not from_phone or (not incoming_text and not incoming_image_url and not button_payload):
        return {"status": "ignored", "reason": "no message content"}

    # 2. Idempotency Check (Skip duplicate MessageSid)
    if source_msg_id:
        existing_event = await db.execute(
            select(HealthEvent).where(HealthEvent.source_msg_id == source_msg_id)
        )
        if existing_event.scalar_one_or_none():
            return {"status": "duplicate_skipped", "source_msg_id": source_msg_id}

    # 3. Lookup Sender Identity
    phone_clean = re.sub(r"\D", "", from_phone)[-10:]
    
    # Check if patient
    res_pt = await db.execute(select(Patient).where(Patient.phone.contains(phone_clean)))
    patient = res_pt.scalar_one_or_none()

    # Check if caregiver / user
    res_cg = await db.execute(select(User).where(User.phone.contains(phone_clean)))
    caregiver_user = res_cg.scalar_one_or_none()

    # Unknown number handling (Gap 1):
    # Unless explicit demo fallback is enabled, unregistered numbers receive a polite error
    allow_demo_fallback = getattr(settings, "ALLOW_DEMO_UNKNOWN_SENDER_FALLBACK", False)
    if not patient and not caregiver_user:
        if allow_demo_fallback:
            res_fb = await db.execute(select(Patient).where(Patient.id == "pt_ramesh_001"))
            patient = res_fb.scalar_one_or_none()
        else:
            unreg_msg = render_message("unregistered_sender", lang="en")
            if is_form:
                return _format_twiml_response(unreg_msg)
            await send_whatsapp_message(from_phone, unreg_msg)
            return {"status": "unregistered_sender", "phone": from_phone}

    # 4. Caregiver Inbound Handling (Alert Acknowledgement)
    # Caregivers are one-way: their messages are never treated as a patient's.
    if caregiver_user and not patient:
        return await _handle_caregiver_message(db, caregiver_user, from_phone, incoming_text, button_payload, is_form)

    if not patient:
        # Demo fallback found no demo patient: never write to a default record.
        unreg_msg = render_message("unregistered_sender", lang="en")
        if is_form:
            return _format_twiml_response(unreg_msg)
        await send_whatsapp_message(from_phone, unreg_msg)
        return {"status": "unregistered_sender", "phone": from_phone}

    patient_id = patient.id
    patient_name = patient.name
    patient_lang = patient.language or "hi"

    # 5. Universal Keywords: HELP, STOP, START (§3.7)
    norm_lower = incoming_text.lower().strip()
    if norm_lower in ("stop", "unsubscribe", "band karo"):
        patient.whatsapp_opted_out_at = datetime.now(timezone.utc)
        await db.flush()
        stop_reply = render_message("opt_out_success", lang=patient_lang)
        if is_form:
            return _format_twiml_response(stop_reply)
        await send_whatsapp_message(from_phone, stop_reply)
        return {"status": "opted_out", "patient_id": patient_id}

    if norm_lower in ("start", "unstop", "shuru"):
        patient.whatsapp_opted_out_at = None
        patient.whatsapp_opt_in_at = datetime.now(timezone.utc)
        patient.whatsapp_opt_in_method = "whatsapp_reply"
        await db.flush()
        start_reply = render_message("opt_in_success", lang=patient_lang)
        if is_form:
            return _format_twiml_response(start_reply)
        await send_whatsapp_message(from_phone, start_reply)
        return {"status": "opted_in", "patient_id": patient_id}

    if norm_lower in ("help", "madad", "मदद", "मदत"):
        help_reply = render_message("help_message", lang=patient_lang, clinic_phone="+91 98111 11111")
        if is_form:
            return _format_twiml_response(help_reply)
        await send_whatsapp_message(from_phone, help_reply)
        return {"status": "help_sent", "patient_id": patient_id}

    # 6. Button Payload Routing (§3.2, §4, §6.1)
    if button_payload:
        if button_payload.startswith("dose_taken:"):
            sched_id = button_payload.replace("dose_taken:", "")
            ev = HealthEvent(
                patient_id=patient_id,
                type="adherence",
                value={"status": "taken", "schedule_id": sched_id},
                measured_at=datetime.now(timezone.utc),
                reported_by="patient",
                source_msg_id=source_msg_id or None,
            )
            await _safe_db_add(db, ev)
            await db.flush()
            dose_reply = "Thank you! Your dose has been recorded as taken. ✅"
            if is_form:
                return _format_twiml_response(dose_reply)
            await send_whatsapp_message(from_phone, dose_reply)
            return {"status": "dose_logged", "schedule_id": sched_id}

        if button_payload.startswith("dose_not_yet:"):
            delay_reply = "Okay, I'll remind you again in 30 minutes. Please take your medication on time."
            if is_form:
                return _format_twiml_response(delay_reply)
            await send_whatsapp_message(from_phone, delay_reply)
            return {"status": "dose_delayed"}

        if button_payload == "opt_in_yes":
            patient.whatsapp_opt_in_at = datetime.now(timezone.utc)
            patient.whatsapp_opt_in_method = "whatsapp_button"
            await db.flush()
            opt_reply = render_message("opt_in_success", lang=patient_lang)
            if is_form:
                return _format_twiml_response(opt_reply)
            await send_whatsapp_message(from_phone, opt_reply)
            return {"status": "opted_in", "patient_id": patient_id}

        if button_payload == "opt_in_no":
            patient.whatsapp_opted_out_at = datetime.now(timezone.utc)
            await db.flush()
            return {"status": "opted_out", "patient_id": patient_id}

    # 7. Check Active Conversation State (Echo Confirmation Step, §3.3)
    res_state = await db.execute(
        select(ConversationState).where(ConversationState.patient_id == patient_id)
    )
    conv_state = res_state.scalar_one_or_none()

    now_utc = datetime.now(timezone.utc)
    if conv_state and conv_state.expires_at > now_utc and conv_state.state == "awaiting_reading_confirmation":
        payload = conv_state.payload or {}
        val = float(payload.get("mgdl", 0))
        ctx = payload.get("context", "fasting")

        # A message with a number in it is a corrected reading, not a yes/no:
        # it falls through to step 9 and replaces the pending value.
        has_new_number = parse_glucose_reading(incoming_text) is not None

        # Positive Confirmation (Save reading). Whole-message match only, so
        # "nahi", "change" or "sugar 150 hai" can never count as yes.
        is_confirm = button_payload == "confirm_reading" or (not has_new_number and is_affirmative(incoming_text))
        if is_confirm:
            # Delete pending conversation state
            await _safe_db_delete(db, conv_state)
            await db.flush()

            # Persist reading to HealthEvent
            event = HealthEvent(
                patient_id=patient_id,
                type="glucose",
                value={"mgdl": val, "context": ctx, "source": payload.get("source", "text"), "transcript": payload.get("transcript", incoming_text)},
                measured_at=datetime.now(timezone.utc),
                reported_by="patient",
                source_msg_id=source_msg_id or None,
            )
            await _safe_db_add(db, event)
            await db.flush()

            # Run deterministic zero-AI risk engine
            risk_event = await evaluate_and_record_risk(
                session=db,
                patient_id=patient_id,
                event_id=event.id,
                event_type="glucose",
                event_value={"mgdl": val},
            )

            if risk_event and risk_event.severity in ("critical", "urgent"):
                # Immediately alert caregiver at 0 minutes! (Gap 3)
                await trigger_immediate_0min_caregiver_alert(db, risk_event, patient, val)

                if is_low_glucose_risk(risk_event.type):
                    low_template = "critical_hypo_emergency" if risk_event.severity == "critical" else "low_glucose_warning"
                    saved_reply = render_message(low_template, lang=patient_lang, glucose_val=f"{val:.0f}")
                else:
                    saved_reply = render_message("high_glucose_warning", lang=patient_lang, glucose_val=f"{val:.0f}")
            else:
                saved_reply = render_message("reading_saved_normal", lang=patient_lang, patient_name=patient_name, glucose_val=f"{val:.0f}")

            if is_form:
                return _format_twiml_response(saved_reply)
            await send_whatsapp_message(from_phone, saved_reply)
            return {
                "status": "reading_confirmed_and_saved",
                "glucose_mgdl": val,
                "risk_status": risk_event.severity if risk_event else "normal",
            }

        # Negative Confirmation (Change reading)
        is_change = button_payload == "change_reading" or (not has_new_number and is_negative(incoming_text))
        if is_change:
            await _safe_db_delete(db, conv_state)
            await db.flush()
            ask_again_reply = "Please send your glucose reading again, like 140." if patient_lang == "en" else "कृपया अपनी शुगर का नंबर दोबारा भेजें, जैसे 140।"
            if is_form:
                return _format_twiml_response(ask_again_reply)
            await send_whatsapp_message(from_phone, ask_again_reply)
            return {"status": "reading_discarded_waiting_new"}

    # 8. Inbound Image Classification (Glucometer display vs Meal photo, Gap 6 & 7)
    if incoming_image_url:
        classification = await classify_and_read_image(incoming_image_url, context_hint=incoming_text)
        if classification.kind == "glucometer" and classification.glucose_value:
            val = classification.glucose_value
            if val < 20 or val > 600:
                err_msg = f"⚠️ Meter reading of {val:.0f} mg/dL looks unusual. Please re-check and type your number."
                if is_form:
                    return _format_twiml_response(err_msg)
                await send_whatsapp_message(from_phone, err_msg)
                return {"status": "implausible_reading", "value": val}

            # Echo confirmation for photo reading
            if conv_state:
                conv_state.state = "awaiting_reading_confirmation"
                conv_state.payload = {"mgdl": val, "context": "fasting", "source": "photo"}
                conv_state.expires_at = now_utc + timedelta(minutes=30)
            else:
                conv_state = ConversationState(
                    patient_id=patient_id,
                    state="awaiting_reading_confirmation",
                    payload={"mgdl": val, "context": "fasting", "source": "photo"},
                    expires_at=now_utc + timedelta(minutes=30),
                )
                await _safe_db_add(db, conv_state)
            await db.flush()

            echo_reply = render_message("echo_confirmation", lang=patient_lang, glucose_val=f"{val:.0f}", context="meter display")
            if is_form:
                return _format_twiml_response(echo_reply)
            await send_whatsapp_message(from_phone, echo_reply)
            return {"status": "echo_confirmation_sent", "glucose_candidate": val, "source": "photo"}

        # Route to Meal Intelligence
        from apps.api.app.modules.meal_intelligence.gemini_vision_service import GeminiMealVisionService
        from apps.api.app.modules.meal_intelligence.cgm_correlator import correlate_meal_with_cgm
        from apps.api.app.modules.meal_intelligence.meal_history_service import record_meal_entry

        meal_service = GeminiMealVisionService()
        analysis = await meal_service.analyze_meal_image(
            image_input=incoming_image_url,
            patient_id=patient_id,
            context_hint=incoming_text if incoming_text != "[Meal Photo]" else None
        )
        cgm_corr = correlate_meal_with_cgm(analysis)
        record_meal_entry(analysis, cgm_corr)

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
        await _safe_db_add(db, event)
        await db.flush()

        foods_str = ", ".join([f.food for f in analysis.foods])
        reply_msg = (
            f"🍽️ {analysis.elderly_explanation}\n\n"
            f"📋 Estimated: {foods_str} (~{analysis.estimated_total_carbs_g:.0f}g carbs, Impact: {analysis.carbohydrate_impact.value})"
        )
        if analysis.sugar_warning:
            reply_msg += f"\n\n⚠️ {analysis.sugar_warning}"

        if is_form:
            return _format_twiml_response(reply_msg)
        await send_whatsapp_message(from_phone, reply_msg)
        return {
            "status": "meal_analyzed",
            "meal_id": analysis.meal_id,
            "estimated_carbs_g": analysis.estimated_total_carbs_g,
        }

    # 9. Glucose Reading Parsing (Digits or Spoken Words in hi/mr/en)
    parsed = parse_glucose_reading(incoming_text)
    if parsed:
        val = parsed.value
        ctx = parsed.context

        # Plausibility check: 20 - 600 mg/dL (§3.3)
        if not parsed.is_valid_range:
            err_msg = (
                f"⚠️ Reading of {val:.0f} mg/dL seems unusual. Please re-check your glucometer and send again."
                if patient_lang == "en" else
                f"⚠️ {val:.0f} mg/dL की रीडिंग असामान्य लग रही है। कृपया मीटर दोबारा जांचें और फिर से भेजें।"
            )
            if is_form:
                return _format_twiml_response(err_msg)
            await send_whatsapp_message(from_phone, err_msg)
            return {"status": "implausible_reading", "value": val}

        # Set conversation state awaiting confirmation
        if conv_state:
            conv_state.state = "awaiting_reading_confirmation"
            conv_state.payload = {"mgdl": val, "context": ctx, "source": "text", "transcript": incoming_text}
            conv_state.expires_at = now_utc + timedelta(minutes=30)
        else:
            conv_state = ConversationState(
                patient_id=patient_id,
                state="awaiting_reading_confirmation",
                payload={"mgdl": val, "context": ctx, "source": "text", "transcript": incoming_text},
                expires_at=now_utc + timedelta(minutes=30),
            )
            await _safe_db_add(db, conv_state)
        await db.flush()

        echo_reply = render_message(
            "echo_confirmation",
            lang=patient_lang,
            glucose_val=f"{val:.0f}",
            context=ctx.replace("_", " ")
        )
        if is_form:
            return _format_twiml_response(echo_reply)
        await send_whatsapp_message(from_phone, echo_reply)
        return {
            "status": "echo_confirmation_sent",
            "glucose_candidate": val,
            "context": ctx,
        }

    # 10. Conversational Elder Companion Fallback
    from apps.api.app.modules.ai_gateway.elder_companion import generate_elder_companion_response
    companion_resp = await generate_elder_companion_response(
        query_text=incoming_text,
        patient_id=patient_id,
        patient_name=patient_name,
        patient_lang=patient_lang,
        session=db,
        is_voice=(media_type != "")
    )
    reply_msg = companion_resp.get("reply_text", "")

    if is_form:
        return _format_twiml_response(reply_msg)
    await send_whatsapp_message(from_phone, reply_msg)
    return {
        "status": "answered_by_companion",
        "reply": reply_msg,
    }


# ============================================================================
# Additional Webhooks: Status, Voice Call, Voice Gather, SMS (§7.1)
# ============================================================================

@router.post("/twilio/status")
async def handle_twilio_delivery_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Delivery status callback for outbound messages.
    If a caregiver WhatsApp message fails or is undelivered for a critical alert,
    triggers immediate SMS fallback (§5).
    """
    form_data = await request.form()
    verify_twilio_request(request, dict(form_data))
    message_sid = str(form_data.get("MessageSid", ""))
    message_status = str(form_data.get("MessageStatus", "")).lower() # queued, sent, delivered, read, failed, undelivered
    error_code = form_data.get("ErrorCode")

    if not message_sid:
        return {"status": "ignored"}

    # Update MessageLog
    stmt = select(MessageLog).where(MessageLog.twilio_sid == message_sid)
    res = await db.execute(stmt)
    log_entry = res.scalar_one_or_none()
    if log_entry:
        log_entry.status = message_status
        if error_code:
            log_entry.error_code = str(error_code)
        log_entry.status_updated_at = datetime.now(timezone.utc)
        await db.flush()

        # Immediate SMS escalation if WhatsApp delivery failed on critical alert
        if message_status in ("failed", "undelivered") and log_entry.channel == "whatsapp" and log_entry.related_risk_event_id:
            sms_text = render_message(
                "sms_critical_alert",
                lang="en",
                patient_name="Patient",
                level_word="critically abnormal",
                clinic_phone="+91 98111 11111",
            )
            await send_sms_message(log_entry.phone, sms_text, risk_event_id=log_entry.related_risk_event_id, session=db)
            return {"status": "status_updated", "sms_fallback_triggered": True}

    return {"status": "status_updated", "message_status": message_status}


@router.post("/twilio/voice")
async def handle_twilio_voice_call(
    request: Request,
    risk_event_id: str = Query(..., description="ID of risk event to acknowledge"),
    lang: str = Query("hi", description="Language code for speech"),
):
    """
    TwiML generation for automated caregiver emergency voice call.
    Uses <Gather numDigits="1"> to collect 'press 1 to acknowledge' (§6.4).
    """
    form_data = await request.form()
    verify_twilio_request(request, dict(form_data))

    public_url = (settings.PUBLIC_BASE_URL or "http://localhost:8000").rstrip("/")
    action_url = f"{public_url}/v1/webhooks/twilio/voice/gather?risk_event_id={quote(risk_event_id, safe='')}"

    say_script = render_message(
        "voice_call_script",
        lang=lang,
        patient_name="your family member",
        level_word="critically abnormal",
    )

    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'  <Gather numDigits="1" action="{action_url}" method="POST" timeout="10">\n'
        f'    <Say language="hi-IN">{say_script}</Say>\n'
        '  </Gather>\n'
        '  <Say>We did not receive your confirmation. Please check on your family member immediately. Goodbye.</Say>\n'
        '</Response>'
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/twilio/voice/gather")
async def handle_twilio_voice_gather(
    request: Request,
    risk_event_id: str = Query(..., description="Risk event ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Collects IVR keypress from caregiver. Pressing '1' acknowledges the alert.
    """
    form_data = await request.form()
    verify_twilio_request(request, dict(form_data))
    digits = str(form_data.get("Digits", "")).strip()

    if digits == "1":
        await acknowledge_risk_event(db, risk_event_id, actor_id="caregiver_call", via="call")
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            '  <Say>Thank you. Your confirmation has been recorded and your care team is updated.</Say>\n'
            '</Response>'
        )
        return Response(content=twiml, media_type="application/xml")
    
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        '  <Say>Thank you. Goodbye.</Say>\n'
        '</Response>'
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/twilio/sms")
async def handle_twilio_sms_reply(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Inbound SMS reply endpoint. Replying 'OK', '1', or 'YES' acknowledges any pending risk alert.
    """
    form_data = await request.form()
    verify_twilio_request(request, dict(form_data))
    from_phone = str(form_data.get("From", "")).strip()
    body = str(form_data.get("Body", ""))

    # Whole-message match: "is she ok?" must not acknowledge the alert.
    if is_caregiver_ack(body):
        phone_clean = re.sub(r"\D", "", from_phone)[-10:]
        res_u = await db.execute(select(User).where(User.phone.contains(phone_clean)))
        cg_user = res_u.scalar_one_or_none()
        if cg_user:
            stmt_active = (
                select(RiskEvent)
                .join(CareRelationship, RiskEvent.patient_id == CareRelationship.patient_id)
                .where(CareRelationship.user_id == cg_user.id, RiskEvent.status == "active")
                .order_by(RiskEvent.created_at.desc())
            )
            res_act = await db.execute(stmt_active)
            latest_risk = res_act.scalars().first()
            if latest_risk:
                await acknowledge_risk_event(db, latest_risk.id, actor_id=cg_user.id, via="sms")
                return Response(
                    content='<?xml version="1.0" encoding="UTF-8"?><Response><Message>Diabeto: Alert acknowledged. Thank you.</Message></Response>',
                    media_type="application/xml"
                )

    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="application/xml"
    )
