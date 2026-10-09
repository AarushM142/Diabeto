import httpx
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.config import settings
from apps.api.app.models.entities import MessageLog

def _get_public_base_url() -> str:
    return getattr(settings, "PUBLIC_BASE_URL", "http://localhost:8000") or "http://localhost:8000"

async def _log_message(
    session: Optional[AsyncSession],
    direction: str,
    phone: str,
    channel: str,
    body: Optional[str] = None,
    template_key: Optional[str] = None,
    twilio_sid: Optional[str] = None,
    status: str = "sent",
    risk_event_id: Optional[str] = None,
) -> Optional[str]:
    if not session:
        return None
    try:
        log_entry = MessageLog(
            direction=direction,
            phone=phone,
            channel=channel,
            template_key=template_key,
            twilio_sid=twilio_sid,
            status=status,
            related_risk_event_id=risk_event_id,
            created_at=datetime.now(timezone.utc),
        )
        add_res = session.add(log_entry)
        if hasattr(add_res, "__await__"):
            await add_res
        if hasattr(session, "flush"):
            flush_res = session.flush()
            if hasattr(flush_res, "__await__"):
                await flush_res
        return log_entry.id
    except Exception as e:
        print(f"[MessageLog] Failed to record message: {e}")
        return None

async def send_whatsapp_message(
    to_phone: str,
    body_text: str,
    template_key: Optional[str] = None,
    content_sid: Optional[str] = None,
    content_variables: Optional[Dict[str, str]] = None,
    risk_event_id: Optional[str] = None,
    session: Optional[AsyncSession] = None,
) -> bool:
    """
    Sends an outbound WhatsApp message using Twilio REST API.
    Supports both free-form session messages and Twilio ContentSid templates.
    """
    to_whatsapp = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
    from_whatsapp = settings.TWILIO_WHATSAPP_NUMBER or "whatsapp:+14155238886"

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        print(f"[Twilio Mock Outbound WhatsApp] To: {to_phone} | Template: {template_key} | Msg: {body_text}")
        await _log_message(
            session=session,
            direction="outbound",
            phone=to_phone,
            channel="whatsapp",
            body=body_text,
            template_key=template_key,
            twilio_sid="mock_sid_" + str(int(datetime.now(timezone.utc).timestamp())),
            status="delivered",
            risk_event_id=risk_event_id,
        )
        return True

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    status_callback = f"{_get_public_base_url()}/v1/webhooks/twilio/status"

    data = {
        "To": to_whatsapp,
        "From": from_whatsapp,
        "StatusCallback": status_callback,
    }

    if content_sid:
        data["ContentSid"] = content_sid
        if content_variables:
            data["ContentVariables"] = json.dumps(content_variables)
    else:
        data["Body"] = body_text

    auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data, auth=auth)
            if resp.status_code in (200, 201):
                sid = resp.json().get("sid")
                print(f"[Twilio WhatsApp Sent] SID: {sid}")
                await _log_message(
                    session=session,
                    direction="outbound",
                    phone=to_phone,
                    channel="whatsapp",
                    body=body_text,
                    template_key=template_key,
                    twilio_sid=sid,
                    status="sent",
                    risk_event_id=risk_event_id,
                )
                return True
            else:
                print(f"[Twilio WhatsApp Send Error] {resp.status_code}: {resp.text}")
                await _log_message(
                    session=session,
                    direction="outbound",
                    phone=to_phone,
                    channel="whatsapp",
                    body=body_text,
                    template_key=template_key,
                    status="failed",
                    risk_event_id=risk_event_id,
                )
                return False
    except Exception as e:
        print(f"[Twilio WhatsApp Send Exception] {e}")
        return False

async def send_sms_message(
    to_phone: str,
    body_text: str,
    template_key: Optional[str] = None,
    risk_event_id: Optional[str] = None,
    session: Optional[AsyncSession] = None,
) -> bool:
    """
    Sends an outbound SMS message for escalation fallback.
    """
    to_clean = to_phone.replace("whatsapp:", "")
    from_sms = getattr(settings, "TWILIO_SMS_SENDER_ID", None) or getattr(settings, "TWILIO_PHONE_NUMBER", "+14155238886")

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        print(f"[Twilio Mock Outbound SMS] To: {to_clean} | Msg: {body_text}")
        await _log_message(
            session=session,
            direction="outbound",
            phone=to_clean,
            channel="sms",
            body=body_text,
            template_key=template_key,
            twilio_sid="mock_sms_sid_" + str(int(datetime.now(timezone.utc).timestamp())),
            status="delivered",
            risk_event_id=risk_event_id,
        )
        return True

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    status_callback = f"{_get_public_base_url()}/v1/webhooks/twilio/status"
    data = {
        "To": to_clean,
        "From": from_sms,
        "Body": body_text,
        "StatusCallback": status_callback,
    }
    auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data, auth=auth)
            if resp.status_code in (200, 201):
                sid = resp.json().get("sid")
                print(f"[Twilio SMS Sent] SID: {sid}")
                await _log_message(
                    session=session,
                    direction="outbound",
                    phone=to_clean,
                    channel="sms",
                    body=body_text,
                    template_key=template_key,
                    twilio_sid=sid,
                    status="sent",
                    risk_event_id=risk_event_id,
                )
                return True
            else:
                print(f"[Twilio SMS Send Error] {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        print(f"[Twilio SMS Send Exception] {e}")
        return False

async def trigger_voice_call(
    to_phone: str,
    patient_name: str,
    level_word: str,
    risk_event_id: str,
    lang: str = "hi",
    session: Optional[AsyncSession] = None,
) -> bool:
    """
    Triggers an automated outbound phone call with IVR gather ("Press 1 to acknowledge").
    """
    to_clean = to_phone.replace("whatsapp:", "")
    from_voice = getattr(settings, "TWILIO_VOICE_FROM", None) or getattr(settings, "TWILIO_PHONE_NUMBER", "+14155238886")

    call_url = f"{_get_public_base_url()}/v1/webhooks/twilio/voice?risk_event_id={risk_event_id}&lang={lang}"

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        print(f"[Twilio Mock Outbound Call] To: {to_clean} | Url: {call_url}")
        await _log_message(
            session=session,
            direction="outbound",
            phone=to_clean,
            channel="voice",
            twilio_sid="mock_call_sid_" + str(int(datetime.now(timezone.utc).timestamp())),
            status="initiated",
            risk_event_id=risk_event_id,
        )
        return True

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Calls.json"
    data = {
        "To": to_clean,
        "From": from_voice,
        "Url": call_url,
    }
    auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data, auth=auth)
            if resp.status_code in (200, 201):
                sid = resp.json().get("sid")
                print(f"[Twilio Voice Call Initiated] SID: {sid}")
                await _log_message(
                    session=session,
                    direction="outbound",
                    phone=to_clean,
                    channel="voice",
                    twilio_sid=sid,
                    status="in-progress",
                    risk_event_id=risk_event_id,
                )
                return True
            else:
                print(f"[Twilio Voice Call Error] {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        print(f"[Twilio Voice Call Exception] {e}")
        return False

async def send_whatsapp_media_message(
    to_phone: str,
    body_text: str,
    media_url: str,
) -> Dict[str, Any]:
    """
    Sends an outbound WhatsApp message with an audio/media attachment.
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        print(f"[Twilio Mock Outbound Audio] To: {to_phone} | Media: {media_url} | Text: {body_text}")
        return {
            "sent": True,
            "delivery_status": "simulated",
            "to": to_phone,
            "media_url": media_url
        }

    to_whatsapp = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
    from_whatsapp = settings.TWILIO_WHATSAPP_NUMBER or "whatsapp:+14155238886"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    data = {
        "To": to_whatsapp,
        "From": from_whatsapp,
        "Body": body_text,
        "MediaUrl": media_url,
    }
    auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data, auth=auth)
            if resp.status_code in (200, 201):
                sid = resp.json().get("sid")
                return {"sent": True, "delivery_status": "delivered", "sid": sid}
            else:
                return {"sent": False, "delivery_status": "failed", "error": resp.text}
    except Exception as e:
        return {"sent": False, "delivery_status": "error", "error": str(e)}
