import httpx
from typing import Optional, Dict, Any
from apps.api.app.core.config import settings

async def send_whatsapp_message(
    to_phone: str,
    body_text: str,
) -> bool:
    """
    Sends an outbound WhatsApp message using Twilio REST API.
    to_phone: E.164 phone number (e.g., '+919800000001' or 'whatsapp:+919800000001')
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        print(f"[Twilio Mock Outbound] To: {to_phone} | Message: {body_text}")
        return True

    # Ensure format 'whatsapp:+91...'
    to_whatsapp = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
    from_whatsapp = settings.TWILIO_WHATSAPP_NUMBER or "whatsapp:+14155238886"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    data = {
        "To": to_whatsapp,
        "From": from_whatsapp,
        "Body": body_text,
    }
    auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data, auth=auth)
            if resp.status_code in (200, 201):
                print(f"[Twilio Message Sent] SID: {resp.json().get('sid')}")
                return True
            else:
                print(f"[Twilio Send Error] {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        print(f"[Twilio Send Exception] {e}")
        return False


async def send_whatsapp_media_message(
    to_phone: str,
    body_text: str,
    media_url: str,
) -> Dict[str, Any]:
    """
    Sends an outbound WhatsApp message with an audio/media attachment.
    Falls back to simulated delivery if live credentials or public URL are unavailable.
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
                print(f"[Twilio Media Message Sent] SID: {sid}")
                return {"sent": True, "delivery_status": "delivered", "sid": sid}
            else:
                print(f"[Twilio Media Send Error] {resp.status_code}: {resp.text}")
                return {"sent": False, "delivery_status": "failed", "error": resp.text}
    except Exception as e:
        print(f"[Twilio Media Send Exception] {e}")
        return {"sent": False, "delivery_status": "error", "error": str(e)}

