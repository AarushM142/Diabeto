import json
import httpx
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.config import settings
from apps.api.app.models.entities import Patient, HealthEvent
from apps.api.app.channels.sarvam_tts import generate_speech_audio, map_patient_language_to_sarvam_code

ELDER_COMPANION_SYSTEM_PROMPT = """You are 'Diabeto Saathi', a warm, respectful, and compassionate AI health companion designed specifically for elderly diabetes patients in India (like Ramesh Kulkarni, a 68-year-old retired senior in Pune).

PERSONA & TONE:
1. Address the elder with deep respect using Indian honorifics (e.g., 'Namaste Ramesh ji 🙏', 'नमस्ते रमेश जी 🙏', 'नमस्कार रमेश काका 🙏').
2. Be empathetic, encouraging, reassuring, and gentle (like a caring doctor's assistant or knowledgeable family member).
3. Always respond in the SAME language or requested language:
   - Hindi (Devanagari script, natural conversational Hindi)
   - Marathi (Devanagari script, natural Pune/Maharashtra conversational Marathi)
   - English (Warm Indian English)

CLINICAL & SAFETY GUARDRAILS (CRITICAL):
1. NEVER change, increase, or cancel prescribed medicines (Metformin, Glimepiride, Teneligliptin). Always tell them to follow Dr. Arvind Mehta's exact prescription.
2. For severe symptoms (blood sugar < 70, chakkar/dizziness, confusion, sweating, chest pain), immediately advise 3 spoons of sugar/juice or calling 112 / family, and reassure them the care team is alerted.
3. For food queries (e.g. mango, sweets, rice, roti, poha), give practical Indian portion-control tips (e.g. 1 small slice of mango with salad, prefer whole grains, add sprouts) rather than harsh restrictions.
4. Keep the answer concise: 2 to 4 gentle sentences max so it is easy for seniors to read or listen to as a voice note.
5. Never use complex medical jargon. Use simple everyday words.
"""

async def generate_elder_companion_response(
    query_text: str,
    patient_id: str,
    patient_name: str,
    patient_lang: str = "hi",
    session: Optional[AsyncSession] = None,
    is_voice: bool = False
) -> Dict[str, Any]:
    """
    Intelligently answers elder health, diet, symptom, and lifestyle queries via LLM (Gemini / Groq)
    and generates an elderly-friendly spoken voice reply via Sarvam AI TTS.
    """
    clean_query = query_text.strip()
    
    # 1. Gather Clinical Context if DB session available
    recent_events_summary = ""
    if session:
        try:
            stmt = select(HealthEvent).where(HealthEvent.patient_id == patient_id).order_by(HealthEvent.measured_at.desc()).limit(5)
            res = await session.execute(stmt)
            events = res.scalars().all()
            if events:
                recent_events_summary = "Recent Logs: " + "; ".join([f"{e.type}: {e.value}" for e in events])
        except Exception as e:
            print(f"[Context Fetch Note] {e}")

    user_prompt = f"""Patient Name: {patient_name}
Preferred Language: {patient_lang}
Attending Doctor: Dr. Arvind Mehta (Senior Diabetologist, Pune)
Current Medications: Metformin 500mg (Morning), Teneligliptin 20mg (Lunch), Glimepiride 1mg (Dinner)
{recent_events_summary}

Elder's WhatsApp Message: "{clean_query}"

Respond gently and helpfully in {patient_lang} according to the system rules."""

    reply_text = ""

    # 2. Try Google Gemini API first if key available
    gemini_key = settings.effective_gemini_api_key
    if gemini_key and not gemini_key.startswith("your-"):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"{ELDER_COMPANION_SYSTEM_PROMPT}\n\n{user_prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 300
                }
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            reply_text = parts[0].get("text", "").strip()
        except Exception as e:
            print(f"[Gemini Companion Error] {e}")

    # 3. Try Groq API as secondary fast LLM
    if not reply_text and settings.GROQ_API_KEY and settings.GROQ_API_KEY.startswith("gsk_"):
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            body = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": ELDER_COMPANION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 250
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=body)
                if res.status_code == 200:
                    data = res.json()
                    reply_text = data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"[Groq Companion Error] {e}")

    # 4. Culturally rich rule-based fallback if no LLM key configured
    if not reply_text:
        lower_q = clean_query.lower()
        if any(w in lower_q for w in ["aam", "mango", "sweet", "mithai", "fruit", "khana"]):
            if patient_lang == "mr":
                reply_text = f"नमस्कार {patient_name} काका! 🥭 आंब्यामध्ये नैसर्गिक साखर जास्त असते. तुम्ही दुपारच्या जेवणासोबत १-२ लहान फोडी खाऊ शकता, पण एकाच वेळी पूर्ण आंबा खाणे टाळा. जेवणानंतर १० मिनिटे शतपावली नक्की करा."
            elif patient_lang == "hi":
                reply_text = f"नमस्ते {patient_name} जी! 🥭 आम में प्राकृतिक मिठास अधिक होती है। आप दोपहर के भोजन के साथ १-२ छोटे टुकड़े ले सकते हैं, लेकिन पूरा आम एक बार में न खाएं। भोजन के बाद हल्की सैर जरूर करें।"
            else:
                reply_text = f"Namaste {patient_name} ji! 🥭 Mango has high natural sugars. You may enjoy 1-2 small slices alongside your lunch, but avoid having a whole mango at once. A gentle 10-minute stroll afterwards will help!"
        elif any(w in lower_q for w in ["chakkar", "dizzy", "shaky", "kamzori", "weak", "low", "54", "60", "70"]):
            if patient_lang == "mr":
                reply_text = f"🚨 तातडीची सूचना {patient_name} काका! चक्कर किंवा थरकाप जाणवत असल्यास त्वरित ३ चमचे साखर, गूळ किंवा फळांचा रस घ्या. आराम करा, आम्ही डॉक्टर आणि कुटुंबीयांना सूचित केले आहे."
            elif patient_lang == "hi":
                reply_text = f"🚨 आपातकालीन सूचना {patient_name} जी! चक्कर या कंपकंपी महसूस होने पर तुरंत ३ चम्मच चीनी, गुड़ या फलों का जूस लें। आराम से बैठें, आपकी केयर टीम को सूचित कर दिया गया है।"
            else:
                reply_text = f"🚨 ALERT {patient_name} ji! If you feel dizzy or shaky, please take 3 spoons of sugar, jaggery, or fruit juice immediately. Please sit down; we have notified your caregiver."
        elif any(w in lower_q for w in ["walk", "sair", "chalo", "paon", "pain", "knee", "ghutna"]):
            if patient_lang == "mr":
                reply_text = f"नमस्कार {patient_name} काका! गुडघे दुखत असल्यास वेगाने चालणे टाळा. घरातच हळूहळू ५ मिनिटे फेऱ्या मारा किंवा बसून पायांचे हलके व्यायाम करा. जास्त ताण घेऊ नका."
            elif patient_lang == "hi":
                reply_text = f"नमस्ते {patient_name} जी! अगर घुटनों में दर्द है तो तेज न चलें। घर में ही धीरे-धीरे ५ मिनट टहलें या बैठकर पैरों का हल्का व्यायाम करें। सेहत का ध्यान रखें।"
            else:
                reply_text = f"Namaste {patient_name} ji! If your knees hurt, do not push for a brisk walk. A slow 5-minute indoor stroll or seated leg stretches are completely fine."
        else:
            if patient_lang == "mr":
                reply_text = f"नमस्कार {patient_name} काका! तुमचा संदेश मिळाला आहे. डॉ. अरविंद मेहता यांच्या सल्ल्यानुसार औषधे वेळेवर घेत राहा आणि भरपूर पाणी प्या. आपण काहीही विचारू शकता!"
            elif patient_lang == "hi":
                reply_text = f"नमस्ते {patient_name} जी! आपका संदेश प्राप्त हुआ। डॉ. अरविंद मेहता के निर्देशानुसार दवाइयां समय पर लें और पानी पीते रहें। आप कोई भी सवाल पूछ सकते हैं!"
            else:
                reply_text = f"Namaste {patient_name} ji! Message received. Please keep up your scheduled routine with Dr. Arvind Mehta, stay hydrated, and feel free to ask anytime!"

    # 5. Synthesize Audio Voice Note with Sarvam AI Bulbul TTS
    target_lang_code = map_patient_language_to_sarvam_code(patient_lang)
    audio_bytes, b64_audio, mime = await generate_speech_audio(
        text=reply_text,
        language_code=target_lang_code,
        pace=0.92  # Gentle, relaxed pace for seniors
    )

    return {
        "reply_text": reply_text,
        "language": patient_lang,
        "voice_audio_base64": b64_audio,
        "voice_audio_format": mime or "audio/wav",
        "has_voice_audio": audio_bytes is not None and len(audio_bytes) > 0,
        "is_voice_inbound": is_voice
    }
