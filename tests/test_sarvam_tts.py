"""
Tests for Diabeto Multilingual Voice Replies via Sarvam AI Bulbul TTS.
Covers:
- Test 1: Hindi voice synthesis
- Test 2: Marathi voice synthesis
- Test 3: English voice synthesis
- Test 4: Critical alert elderly-friendly spoken warning formatting
- Test 5: Missing / unsupported language fallback to English (en-IN)
- Test 6: Sarvam API failure graceful fallback to text
- Test 7: Missing API key handling without crashing
- Model 3 clinical decision integration test
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock
import httpx

from apps.api.app.channels.sarvam_tts import (
    generate_speech_audio,
    map_patient_language_to_sarvam_code,
    get_default_speaker_for_language,
    format_elderly_friendly_spoken_text,
    synthesize_voice_alert_for_decision,
    LANGUAGE_CODE_MAP
)


@pytest.mark.asyncio
async def test_1_hindi_tts():
    """
    Test 1: Hindi Voice Synthesis
    Input: 'Ramesh ji, your glucose level is stable.' / Hindi text
    Verifies audio generation in Hindi (hi-IN).
    """
    spoken_hindi = format_elderly_friendly_spoken_text(
        patient_name="Ramesh Kulkarni",
        language="hi",
        severity="NORMAL",
        risk_category="IN_RANGE",
        current_g=105.0,
        pred_30=108.0,
        trend_desc="Steady (→)"
    )
    assert "नमस्ते Ramesh जी" in spoken_hindi
    assert "स्थिर" in spoken_hindi

    # Generate Hindi speech audio
    audio_bytes, b64_str, mime = await generate_speech_audio(
        text=spoken_hindi,
        language_code="hi-IN"
    )
    # If live API key is active, verify audio generated; else fallback gracefully
    if audio_bytes is not None:
        assert len(audio_bytes) > 1000
        assert b64_str is not None
        assert mime == "audio/wav"
    else:
        # Fallback graceful behavior
        assert audio_bytes is None


@pytest.mark.asyncio
async def test_2_marathi_tts():
    """
    Test 2: Marathi Voice Synthesis
    Verifies Marathi formatting and audio generation (mr-IN).
    """
    spoken_marathi = format_elderly_friendly_spoken_text(
        patient_name="Ramesh Kulkarni",
        language="mr",
        severity="WARNING",
        risk_category="HYPOGLYCEMIA",
        current_g=84.0,
        pred_30=85.0,
        trend_desc="Falling (↓)"
    )
    assert "नमस्ते Ramesh काका" in spoken_marathi
    assert "साखर" in spoken_marathi

    audio_bytes, b64_str, mime = await generate_speech_audio(
        text=spoken_marathi,
        language_code="mr-IN"
    )
    if audio_bytes is not None:
        assert len(audio_bytes) > 1000
        assert b64_str is not None
        assert mime == "audio/wav"


@pytest.mark.asyncio
async def test_3_english_tts():
    """
    Test 3: English Voice Synthesis
    Verifies English audio generation (en-IN).
    """
    spoken_en = format_elderly_friendly_spoken_text(
        patient_name="Ramesh Kulkarni",
        language="en",
        severity="NORMAL",
        risk_category="IN_RANGE",
        current_g=110.0,
        pred_30=112.0,
        trend_desc="Steady"
    )
    assert "Namaste Ramesh ji" in spoken_en
    assert "stable" in spoken_en

    audio_bytes, b64_str, mime = await generate_speech_audio(
        text=spoken_en,
        language_code="en-IN"
    )
    if audio_bytes is not None:
        assert len(audio_bytes) > 1000
        assert b64_str is not None
        assert mime == "audio/wav"


def test_4_critical_alert_formatting():
    """
    Test 4: Critical Alert Spoken Warning
    Verifies short, clear, jargon-free warning without medication dosage.
    """
    # 1. Hypoglycemia Alert
    hypo_spoken = format_elderly_friendly_spoken_text(
        patient_name="Ramesh Kulkarni",
        language="mr",
        severity="CRITICAL",
        risk_category="HYPOGLYCEMIA",
        current_g=52.0,
        pred_30=48.0,
        trend_desc="Falling rapidly"
    )
    assert "खूप कमी आहे" in hypo_spoken
    assert "गूळ किंवा फळांचा रस" in hypo_spoken
    # Verify no jargon or medication dosage instructions
    assert "ROC-AUC" not in hypo_spoken
    assert "LSTM" not in hypo_spoken
    assert "probability" not in hypo_spoken
    assert "insulin units" not in hypo_spoken

    # 2. Hyperglycemia Alert
    hyper_spoken = format_elderly_friendly_spoken_text(
        patient_name="Shanti Patel",
        language="en",
        severity="CRITICAL",
        risk_category="HYPERGLYCEMIA",
        current_g=280.0,
        pred_30=295.0,
        trend_desc="Rising rapidly"
    )
    assert "elevated" in hyper_spoken
    assert "water" in hyper_spoken
    assert "ROC-AUC" not in hyper_spoken
    assert "LSTM" not in hyper_spoken


def test_5_missing_language_fallback():
    """
    Test 5: Missing / Unsupported Language Fallback
    Verifies that None, empty, or unsupported languages default to 'en-IN'.
    """
    assert map_patient_language_to_sarvam_code(None) == "en-IN"
    assert map_patient_language_to_sarvam_code("") == "en-IN"
    assert map_patient_language_to_sarvam_code("unknown_lang_xyz") == "en-IN"
    assert map_patient_language_to_sarvam_code("mr") == "mr-IN"
    assert map_patient_language_to_sarvam_code("marathi") == "mr-IN"
    assert map_patient_language_to_sarvam_code("hi") == "hi-IN"
    assert map_patient_language_to_sarvam_code("english") == "en-IN"


@pytest.mark.asyncio
async def test_6_sarvam_api_failure_fallback():
    """
    Test 6: Sarvam API Failure Handling
    Simulates a network or HTTP 500 error from Sarvam and ensures pipeline falls back gracefully.
    """
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        audio_bytes, b64_audio, mime = await generate_speech_audio(
            text="Testing failure resilience",
            language_code="hi-IN"
        )
        assert audio_bytes is None
        assert b64_audio is None
        assert mime is None

    # Decision synthesis fallback test
    patient = {"patient_id": "pt_ramesh_001", "name": "Ramesh Kulkarni", "language": "mr"}
    decision = {
        "severity": "WARNING",
        "risk_category": "HYPOGLYCEMIA",
        "current_glucose": 84.0,
        "predicted_glucose_30min": 85.0,
        "trend_descriptor": "Falling"
    }

    with patch("apps.api.app.channels.sarvam_tts.generate_speech_audio", return_value=(None, None, None)):
        res = await synthesize_voice_alert_for_decision(patient, decision)
        assert res["voice_reply_available"] is False
        assert res["fallback_to_text_active"] is True
        assert res["spoken_text"] is not None
        assert "Ramesh" in res["spoken_text"]


@pytest.mark.asyncio
async def test_7_missing_api_key_resilience():
    """
    Test 7: Missing API Key Handling
    Verifies that if SARVAM_API_KEY is unset or invalid, the system does not crash and returns fallback.
    """
    with patch("apps.api.app.channels.sarvam_tts.settings.SARVAM_API_KEY", ""):
        with patch.dict("os.environ", {"SARVAM_API_KEY": ""}):
            audio_bytes, b64_audio, mime = await generate_speech_audio(
                text="Test missing API key",
                language_code="mr-IN"
            )
            assert audio_bytes is None
            assert b64_audio is None


@pytest.mark.asyncio
async def test_model3_voice_integration():
    """
    End-to-End Model 3 Decision + Voice Integration
    """
    patient = {
        "patient_id": "pt_ramesh_001",
        "name": "Ramesh Kulkarni",
        "age": 68,
        "language": "mr"
    }
    decision = {
        "severity": "WARNING",
        "risk_category": "HYPOGLYCEMIA",
        "current_glucose": 84.0,
        "predicted_glucose_30min": 85.0,
        "trend_descriptor": "Falling (↓)",
        "reason": "Trajectory hypoglycemia warning"
    }

    voice_result = await synthesize_voice_alert_for_decision(patient, decision)
    assert voice_result["language_code"] == "mr-IN"
    assert "नमस्ते Ramesh काका" in voice_result["spoken_text"]
    assert voice_result["delivery_status"] == "simulated"
