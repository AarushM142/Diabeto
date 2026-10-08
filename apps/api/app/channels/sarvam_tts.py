"""
Diabeto Platform — Sarvam AI Bulbul TTS Service
Provides accessible, multilingual text-to-speech voice replies for elderly diabetes patients
in Marathi, Hindi, and English using Sarvam AI Bulbul v3.
"""

import base64
import os
import re
from typing import Optional, Tuple, Dict, Any
import httpx

from apps.api.app.core.config import settings

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

# Centralized Language Code Mapping
LANGUAGE_CODE_MAP: Dict[str, str] = {
    "mr": "mr-IN",
    "marathi": "mr-IN",
    "mr-in": "mr-IN",
    "hi": "hi-IN",
    "hindi": "hi-IN",
    "hi-in": "hi-IN",
    "en": "en-IN",
    "english": "en-IN",
    "en-in": "en-IN",
    "gu": "gu-IN",
    "gujarati": "gu-IN",
    "ta": "ta-IN",
    "tamil": "ta-IN",
    "te": "te-IN",
    "telugu": "te-IN",
    "kn": "kn-IN",
    "kannada": "kn-IN",
    "bn": "bn-IN",
    "bengali": "bn-IN",
    "pa": "pa-IN",
    "punjabi": "pa-IN"
}

# Curated, warm, elderly-friendly speakers for Bulbul v3
DEFAULT_SPEAKERS: Dict[str, str] = {
    "mr-IN": "roopa",
    "hi-IN": "aditya",
    "en-IN": "ishita",
    "gu-IN": "pooja",
    "ta-IN": "gokul",
    "te-IN": "kavitha",
    "kn-IN": "chaitra",
    "bn-IN": "roopa",
    "pa-IN": "anand"
}


def map_patient_language_to_sarvam_code(lang: Optional[str]) -> str:
    """
    Maps a patient profile's language preference to Sarvam's BCP-47 language tag.
    Defaults to 'en-IN' if missing or unsupported.
    """
    if not lang or not isinstance(lang, str):
        return "en-IN"
    clean_lang = lang.strip().lower()
    return LANGUAGE_CODE_MAP.get(clean_lang, "en-IN")


def get_default_speaker_for_language(lang_code: str) -> str:
    """
    Returns the recommended voice speaker for the given language.
    """
    return DEFAULT_SPEAKERS.get(lang_code, "aditya")


async def generate_speech_audio(
    text: str,
    language_code: Optional[str] = "en-IN",
    speaker: Optional[str] = None,
    pace: float = 0.95,  # Slightly relaxed pace for elderly clarity
    loudness: float = 1.5,
    speech_sample_rate: int = 8000,
    model: str = "bulbul:v3"
) -> Tuple[Optional[bytes], Optional[str], Optional[str]]:
    """
    Synthesizes speech audio from text using Sarvam AI Bulbul v3 TTS.
    
    Returns:
        (audio_bytes, base64_audio_str, content_type)
        If synthesis fails, returns (None, None, None) without crashing.
    """
    if not text or not text.strip():
        print("[Sarvam TTS Warning] Empty text passed for speech synthesis.")
        return None, None, None

    api_key = getattr(settings, "SARVAM_API_KEY", None) or os.environ.get("SARVAM_API_KEY")
    if not api_key or api_key.startswith("your-") or api_key == "mock_key":
        print("[Sarvam TTS Notice] SARVAM_API_KEY not configured or in test mode. Falling back gracefully.")
        return None, None, None

    target_lang = map_patient_language_to_sarvam_code(language_code)
    chosen_speaker = speaker or get_default_speaker_for_language(target_lang)

    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }

    # Clean text of markdown asterisks or technical formatting before speaking
    clean_text = re.sub(r"[\*\_#`]", "", text).strip()

    body = {
        "inputs": [clean_text],
        "target_language_code": target_lang,
        "speaker": chosen_speaker,
        "pitch": 0,
        "pace": pace,
        "loudness": loudness,
        "speech_sample_rate": speech_sample_rate,
        "enable_preprocessing": True,
        "model": model
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(SARVAM_TTS_URL, headers=headers, json=body)
            if response.status_code == 200:
                data = response.json()
                audios = data.get("audios", [])
                if audios and isinstance(audios[0], str):
                    b64_str = audios[0]
                    audio_bytes = base64.b64decode(b64_str)
                    return audio_bytes, b64_str, "audio/wav"
                else:
                    print("[Sarvam TTS Error] No audio payload in response.")
                    return None, None, None
            else:
                print(f"[Sarvam TTS Error] HTTP {response.status_code}: {response.text}")
                return None, None, None
    except Exception as e:
        print(f"[Sarvam TTS Exception] {e}")
        return None, None, None


def format_elderly_friendly_spoken_text(
    patient_name: str,
    language: str,
    severity: str,
    risk_category: str,
    current_g: float,
    pred_30: float,
    trend_desc: str
) -> str:
    """
    Formats natural, warm, jargon-free spoken copy for elderly patients in Marathi, Hindi, or English.
    """
    first_name = patient_name.split()[0] if patient_name else "ji"
    lang_clean = (language or "hi").lower()

    # 1. Marathi Spoken Response
    if lang_clean in ["mr", "marathi", "mr-in"]:
        if severity in ["CRITICAL", "URGENT"]:
            if risk_category == "HYPOGLYCEMIA":
                return (
                    f"नमस्ते {first_name} काका! तुमची साखर सध्या {current_g:.0f} आहे, जी खूप कमी आहे. "
                    f"कृपया त्वरित १५ ग्रॅम गूळ किंवा फळांचा रस घ्या आणि १५ मिनिटांत पुन्हा साखर तपासा."
                )
            else:
                return (
                    f"नमस्ते {first_name} काका! तुमची साखर सध्या {current_g:.0f} आहे, जी खूप जास्त आहे. "
                    f"कृपया भरपूर पाणी प्या आणि तुमच्या डॉक्टरांच्या सल्ल्याचे पालन करा."
                )
        elif severity == "WARNING":
            if risk_category == "HYPOGLYCEMIA":
                return (
                    f"नमस्ते {first_name} काका! तुमची साखर खाली जात असून पुढील ३० मिनिटांत {pred_30:.0f} पर्यंत जाऊ शकते. "
                    f"हलका नाश्ता जवळ ठेवा आणि आराम करा."
                )
            else:
                return (
                    f"नमस्ते {first_name} काका! तुमची साखर {current_g:.0f} आहे आणि थोडी वाढत आहे. "
                    f"कृपया पाणी प्या आणि हलकी विश्रांती घ्या."
                )
        else: # NORMAL / WATCH
            return (
                f"नमस्ते {first_name} काका! तुमची साखर पातळी {current_g:.0f} असून सध्या पूर्णपणे स्थिर आणि सुरक्षित आहे. "
                f"तुमचा दिवस आनंदी जावो!"
            )

    # 2. Hindi Spoken Response
    elif lang_clean in ["hi", "hindi", "hi-in"]:
        if severity in ["CRITICAL", "URGENT"]:
            if risk_category == "HYPOGLYCEMIA":
                return (
                    f"नमस्ते {first_name} जी! आपकी शुगर अभी {current_g:.0f} है, जो बहुत कम है। "
                    f"कृपया तुरंत ३ चम्मच चीनी या फलों का जूस लें और १५ मिनट बाद दोबारा शुगर जांचें।"
                )
            else:
                return (
                    f"नमस्ते {first_name} जी! आपकी शुगर अभी {current_g:.0f} है, जो काफी अधिक है। "
                    f"कृपया पर्याप्त पानी पिएं और डॉक्टर के निर्देशों का पालन करें।"
                )
        elif severity == "WARNING":
            if risk_category == "HYPOGLYCEMIA":
                return (
                    f"नमस्ते {first_name} जी! आपकी शुगर नीचे की ओर जा रही है और ३० मिनट में {pred_30:.0f} तक पहुंच सकती है। "
                    f"कृपया हल्का नाश्ता लें और आराम करें।"
                )
            else:
                return (
                    f"नमस्ते {first_name} जी! आपकी शुगर {current_g:.0f} है और हल्की बढ़ रही है। "
                    f"कृपया पर्याप्त पानी पिएं।"
                )
        else: # NORMAL / WATCH
            return (
                f"नमस्ते {first_name} जी! आपका शुगर स्तर {current_g:.0f} है और बिल्कुल स्थिर व सामान्य है। "
                f"अपनी दिनचर्या इसी प्रकार बनाए रखें।"
            )

    # 3. English Spoken Response (Default Fallback)
    else:
        if severity in ["CRITICAL", "URGENT"]:
            if risk_category == "HYPOGLYCEMIA":
                return (
                    f"Namaste {first_name} ji! Your blood sugar is currently {current_g:.0f}, which is critically low. "
                    f"Please have 15 grams of fast-acting sugar or juice immediately and recheck in 15 minutes."
                )
            else:
                return (
                    f"Namaste {first_name} ji! Your blood sugar is currently {current_g:.0f}, which is elevated. "
                    f"Please drink plenty of water and follow your care team's guidelines."
                )
        elif severity == "WARNING":
            return (
                f"Namaste {first_name} ji! Your blood sugar is trending downward to approximately {pred_30:.0f} mg/dL. "
                f"Please keep a light snack handy and stay comfortably seated."
            )
        else: # NORMAL / WATCH
            return (
                f"Namaste {first_name} ji! Your glucose level is {current_g:.0f} mg/dL and currently stable within target. "
                f"Keep up the great routine."
            )


async def synthesize_voice_alert_for_decision(
    patient_profile: Dict[str, Any],
    decision: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Synthesizes a spoken voice reply for a Model 3 clinical decision object.
    Never alters or overrides ML predictions.
    """
    patient_name = patient_profile.get("name", "Patient")
    lang = patient_profile.get("language", "en")
    target_lang_code = map_patient_language_to_sarvam_code(lang)

    severity = decision.get("severity", "NORMAL")
    risk_cat = decision.get("risk_category", "IN_RANGE")
    current_g = float(decision.get("current_glucose", 110.0))
    pred_30 = float(decision.get("predicted_glucose_30min", current_g))
    trend_desc = str(decision.get("trend_descriptor", "Steady"))

    # Generate elderly-friendly natural copy
    spoken_text = format_elderly_friendly_spoken_text(
        patient_name=patient_name,
        language=lang,
        severity=severity,
        risk_category=risk_cat,
        current_g=current_g,
        pred_30=pred_30,
        trend_desc=trend_desc
    )

    # Call Sarvam Bulbul v3 TTS
    audio_bytes, b64_audio, mime_type = await generate_speech_audio(
        text=spoken_text,
        language_code=target_lang_code
    )

    audio_generated = audio_bytes is not None and len(audio_bytes) > 0

    return {
        "voice_reply_available": audio_generated,
        "language_code": target_lang_code,
        "spoken_text": spoken_text,
        "audio_base64": b64_audio if audio_generated else None,
        "audio_bytes_length": len(audio_bytes) if audio_generated else 0,
        "audio_format": mime_type or "audio/wav",
        "delivery_status": "simulated",
        "fallback_to_text_active": not audio_generated
    }
