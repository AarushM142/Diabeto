import hmac
import hashlib
import base64
from datetime import datetime, timezone, time
from typing import Dict, Any, Optional
from fastapi import HTTPException, Request, status
from apps.api.app.core.config import settings

def validate_twilio_signature(
    url: str,
    params: Dict[str, Any],
    signature: Optional[str],
    auth_token: Optional[str],
) -> bool:
    """
    Validates Twilio webhook authenticity using HMAC-SHA1.
    A missing signature or auth token never validates; callers decide when
    validation applies (see verify_twilio_request).
    """
    if not auth_token or not signature:
        return False

    try:
        # 1. Start with exact full URL
        data = url
        # 2. Sort parameter keys alphabetically and concatenate key + value
        for key in sorted(params.keys()):
            data += f"{key}{params[key]}"

        computed = base64.b64encode(
            hmac.new(auth_token.encode("utf-8"), data.encode("utf-8"), hashlib.sha1).digest()
        ).decode("utf-8")

        return hmac.compare_digest(computed, signature)
    except Exception as e:
        print(f"[TwilioSignatureValidator] Error validating signature: {e}")
        return False

def _configured_auth_token() -> Optional[str]:
    """The Twilio auth token, or None if unset or still the .env.example placeholder."""
    token = (settings.TWILIO_AUTH_TOKEN or "").strip()
    if not token or token.lower().startswith("your"):
        return None
    return token

def signature_validation_enabled() -> bool:
    return bool(settings.TWILIO_VALIDATE_SIGNATURE) and _configured_auth_token() is not None

def public_request_url(request: Request) -> str:
    """The URL Twilio signed: PUBLIC_BASE_URL + path + query when set (e.g. behind ngrok)."""
    base = (settings.PUBLIC_BASE_URL or "").rstrip("/")
    if not base:
        return str(request.url)
    url = base + request.url.path
    if request.url.query:
        url += "?" + request.url.query
    return url

def verify_twilio_request(request: Request, params: Dict[str, Any]) -> None:
    """
    Rejects a Twilio webhook unless it carries a valid X-Twilio-Signature.
    A missing header is rejected too — omitting it must not skip the check.
    """
    if not signature_validation_enabled():
        return
    signature = request.headers.get("X-Twilio-Signature")
    if not validate_twilio_signature(public_request_url(request), params, signature, _configured_auth_token()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing Twilio signature")

def is_in_quiet_hours(
    start_str: str = "21:30",
    end_str: str = "07:00",
    check_time: Optional[datetime] = None,
) -> bool:
    """
    Returns True if check_time falls within quiet hours (e.g. 21:30 to 07:00).
    Critical alerts ignore quiet hours.
    """
    now = check_time or datetime.now(timezone.utc)
    t = now.time()

    try:
        s_h, s_m = map(int, start_str.split(":"))
        e_h, e_m = map(int, end_str.split(":"))
        start_time = time(s_h, s_m)
        end_time = time(e_h, e_m)

        if start_time > end_time:
            # Over midnight (e.g. 21:30 to 07:00)
            return t >= start_time or t < end_time
        else:
            return start_time <= t < end_time
    except Exception:
        return False
