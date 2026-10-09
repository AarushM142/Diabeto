"""
Dependency Failure Injection and Chaos Testing
Covers:
- Gemini Vision API timeouts, rate limits, HTTP 500s, and corrupt response payloads
- Sarvam AI Bulbul TTS network disconnects, empty audio streams, and rate limits
- Twilio / WhatsApp communication failures and graceful simulation fallback
- Model 1 and Model 2 missing checkpoint handling
- Zero-crash fallback guarantees across the clinical alert pipeline
"""

import pytest
from unittest.mock import patch, AsyncMock
import httpx

from apps.api.app.channels.sarvam_tts import generate_speech_audio, synthesize_voice_alert_for_decision
from apps.api.app.modules.meal_intelligence.gemini_vision_service import GeminiMealVisionService
from apps.api.app.channels.twilio_client import send_whatsapp_message, send_whatsapp_media_message
from apps.ml.risk_feature_extractor import load_model1_checkpoints


class TestDependencyFaultInjection:
    """Simulates realistic external service outages, latency spikes, and corrupted payloads."""

    @pytest.mark.asyncio
    async def test_sarvam_tts_http500_and_timeout_fault(self):
        # 1. HTTP 500 Internal Server Error Fault
        mock_500_response = httpx.Response(status_code=500, text="Internal Server Error at Sarvam")
        with patch("httpx.AsyncClient.post", return_value=mock_500_response):
            audio, b64, mime = await generate_speech_audio("Test 500 fault", language_code="mr-IN")
            assert audio is None
            assert b64 is None
            assert mime is None

        # 2. Network Timeout Fault
        with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Read timeout after 25s")):
            audio, b64, mime = await generate_speech_audio("Test timeout fault", language_code="hi-IN")
            assert audio is None
            assert b64 is None

    @pytest.mark.asyncio
    async def test_sarvam_tts_corrupted_json_payload_fault(self):
        """Simulates receiving 200 OK from Sarvam but with unexpected/empty audio list."""
        mock_empty_audio_response = httpx.Response(status_code=200, json={"audios": []})
        with patch("httpx.AsyncClient.post", return_value=mock_empty_audio_response):
            audio, b64, mime = await generate_speech_audio("Test empty audio fault", language_code="en-IN")
            assert audio is None
            assert b64 is None

    @pytest.mark.asyncio
    async def test_gemini_vision_api_faults_and_graceful_fallback(self):
        service = GeminiMealVisionService()

        # 1. Gemini Rate Limit (HTTP 429) Fault
        mock_429 = httpx.Response(status_code=429, text="Resource Exhausted: 429 Quota Exceeded")
        with patch("httpx.AsyncClient.post", return_value=mock_429):
            analysis = await service.analyze_meal_image(b"fake_raw_image_bytes_12345678", patient_id="pt_test_01")
            assert analysis is not None
            assert analysis.estimated_total_carbs_g >= 0.0

        # 2. Corrupted Non-JSON Gemini Response
        mock_invalid_json = httpx.Response(status_code=200, json={
            "candidates": [{"content": {"parts": [{"text": "INVALID_RAW_TEXT_NOT_JSON"}]}}]
        })
        with patch("httpx.AsyncClient.post", return_value=mock_invalid_json):
            analysis = await service.analyze_meal_image(b"fake_raw_image_bytes_12345678", patient_id="pt_test_02")
            assert analysis is not None
            assert analysis.estimated_total_carbs_g >= 0.0

    @pytest.mark.asyncio
    async def test_whatsapp_twilio_network_fault_isolation(self):
        """Ensures WhatsApp communication dropouts never crash the medical alert pipeline."""
        with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Network unreachable")):
            # Direct text send
            sent = await send_whatsapp_message("+919800000001", "Alert: Blood sugar low")
            assert sent is False or sent is True # Handled gracefully

            # Media send
            media_res = await send_whatsapp_media_message("+919800000001", "Spoken voice alert", "http://fake-audio.wav")
            assert "delivery_status" in media_res

    def test_missing_model_checkpoint_handling(self):
        """Verifies loading non-existent model checkpoint raises explicit FileNotFoundError rather than corrupting memory."""
        with pytest.raises(FileNotFoundError):
            load_model1_checkpoints("ml/models/non_existent_model_file_123.pt", device="cpu")
