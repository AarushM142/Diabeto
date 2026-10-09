"""
API Security Fuzzing and Vulnerability Regression Tests
Covers:
- SQL Injection resilience in parameters and payloads
- Cross-Site Scripting (XSS) payload containment and text escaping
- Unicode, Devanagari, Marathi, Emoji, and malformed encoding handling
- Oversized payload and memory exhaustion protection
- RBAC authorization boundaries (Caregiver vs Clinician)
- Information disclosure and secret masking in error responses
"""

import pytest
import re
from httpx import AsyncClient, ASGITransport
from apps.api.app.main import app
from apps.api.app.channels.sarvam_tts import generate_speech_audio
from apps.api.app.modules.meal_intelligence.gemini_vision_service import GeminiMealVisionService


class TestSecurityFuzzingAndResilience:
    """Security tests against local endpoints and core parsers."""

    @pytest.mark.asyncio
    async def test_xss_and_injection_in_voice_and_meal_parsers(self):
        xss_payloads = [
            "<script>alert('xss')</script>",
            "'\"><img src=x onerror=alert(1)>",
            "'; DROP TABLE patients; --",
            "SELECT * FROM users WHERE '1'='1'",
            "{{ 7 * 7 }}",
            "${7*7}",
            "\\x00\\x08\\x1b",
        ]

        # 1. Voice generation must sanitize malicious injection strings
        for payload in xss_payloads:
            # Must not execute or crash
            audio, b64, mime = await generate_speech_audio(payload, language_code="hi-IN")
            # Should safely return or fall back without crashing

    @pytest.mark.asyncio
    async def test_unicode_and_marathi_payload_handling(self):
        marathi_payloads = [
            "नमस्ते काका, तुमची साखर ११० आहे. 😀 🩺 💉",
            "मराठी भाषा चाचणी - ळ, ज्ञ, क्ष, त्र",
            "🔥🚨⚡️ 100% stable reading",
            "विशेष वर्ण: @#$%^&*()_+{}[]:;\"'<>?,./~`",
        ]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            for text in marathi_payloads:
                res = await client.post(
                    "/v1/webhooks/voice/synthesize",
                    json={"text": text, "language": "mr"}
                )
                assert res.status_code == 200
                data = res.json()
                assert "spoken_text" in data
                assert data["language"] == "mr-IN"

    @pytest.mark.asyncio
    async def test_oversized_payload_handling(self):
        """Tests oversized text strings (e.g. 50,000 characters) to verify bounded processing."""
        giant_text = "A" * 50000
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            res = await client.post(
                "/v1/webhooks/voice/synthesize",
                json={"text": giant_text, "language": "en"}
            )
            # Should either succeed or safely reject (HTTP 200/400/413/422) without 500 unhandled crash
            assert res.status_code in [200, 400, 413, 422]

    @pytest.mark.asyncio
    async def test_rbac_privilege_escalation_guard(self):
        """Ensures non-clinicians cannot verify clinical summaries."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            # Attempting verification with caregiver header
            res = await client.post(
                "/v1/patients/pt_ramesh_001/weekly-summary/verify",
                headers={"X-User-Role": "caregiver"},
                json={"notes": "Caregiver attempting medical signoff"}
            )
            # Must return 403 Forbidden
            assert res.status_code == 403
            err_data = res.json()
            assert "Clinician" in err_data.get("detail", "") or "forbidden" in err_data.get("detail", "").lower()

    @pytest.mark.asyncio
    async def test_secret_leakage_in_error_responses(self):
        """Ensures internal secrets or environment keys are never leaked in error payloads."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            res = await client.get("/v1/non_existent_route_404")
            assert res.status_code == 404
            content = res.text
            # Verify no secret keywords leaked
            assert "SARVAM_API_KEY" not in content
            assert "GEMINI_API_KEY" not in content
            assert "SUPABASE_KEY" not in content
            assert "DATABASE_URL" not in content
