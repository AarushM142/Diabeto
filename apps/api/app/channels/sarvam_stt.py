import httpx
from typing import Optional, Tuple
from apps.api.app.core.config import settings

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"

async def transcribe_audio_file(
    audio_bytes: bytes,
    content_type: str = "audio/wav",
    language_code: str = "hi-IN", # hi-IN, mr-IN, en-IN, or unknown
) -> Tuple[str, str]:
    """
    Transcribes regional Indian voice notes using Sarvam AI Saaras v3 STT.
    Returns (transcript_text, detected_language).
    """
    if not settings.SARVAM_API_KEY:
        print("[Sarvam STT Warning] SARVAM_API_KEY not configured. Returning mock transcript.")
        return ("Fasting sugar 140", "en")

    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY,
    }

    files = {
        "file": ("audio.wav", audio_bytes, content_type)
    }
    data = {
        "model": "saaras:v3",
        "language_code": language_code,
        "with_diacritics": "false",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(SARVAM_STT_URL, headers=headers, files=files, data=data)
            if response.status_code == 200:
                res_data = response.json()
                transcript = res_data.get("transcript", "")
                detected_lang = res_data.get("language_code", language_code)
                return transcript, detected_lang
            else:
                print(f"[Sarvam STT Error] {response.status_code}: {response.text}")
                return ("", "unknown")
    except Exception as e:
        print(f"[Sarvam STT Exception] {e}")
        return ("", "unknown")

async def download_and_transcribe_media_url(
    media_url: str,
    auth: Optional[Tuple[str, str]] = None,
    language_code: str = "hi-IN",
) -> Tuple[str, str]:
    """
    Downloads audio from Twilio media URL and passes it to Sarvam STT.
    """
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Twilio media requires HTTP Basic auth if configured
            res = await client.get(media_url, auth=auth, follow_redirects=True)
            if res.status_code == 200:
                content_type = res.headers.get("content-type", "audio/ogg")
                return await transcribe_audio_file(res.content, content_type, language_code)
            else:
                print(f"[Media Download Error] Status {res.status_code}")
                return ("", "unknown")
    except Exception as e:
        print(f"[Media Download Exception] {e}")
        return ("", "unknown")
