import re
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.config import settings
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import Patient, HealthEvent
from apps.api.app.modules.risk.engine import evaluate_and_record_risk

router = APIRouter(prefix="/v1/webhooks", tags=["WhatsApp Webhook"])

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
async def handle_whatsapp_message(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handles inbound WhatsApp webhook messages (text or voice transcripts).
    """
    payload = await request.json()

    # Meta Cloud API extraction
    entry_list = payload.get("entry", [])
    if not entry_list:
        return {"status": "ignored", "reason": "no entries"}

    for entry in entry_list:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            for msg in messages:
                msg_id = msg.get("id")
                from_phone = msg.get("from")
                msg_type = msg.get("type")
                
                text_body = ""
                if msg_type == "text":
                    text_body = msg.get("text", {}).get("body", "")
                elif msg_type == "interactive":
                    # Button reply
                    text_body = msg.get("interactive", {}).get("button_reply", {}).get("title", "")

                # Parse glucose value if present (e.g., "140" or "Sugar 140")
                numbers = re.findall(r"\b\d{2,3}\b", text_body)
                if numbers:
                    glucose_val = float(numbers[0])
                    if 20 <= glucose_val <= 600:
                        # Find or create mock patient matching phone
                        stmt = select(Patient).where(Patient.phone.contains(from_phone[-10:]))
                        res = await db.execute(stmt)
                        patient = res.scalar_one_or_none()
                        
                        if patient:
                            event = HealthEvent(
                                patient_id=patient.id,
                                type="glucose",
                                value={"mgdl": glucose_val, "context": "whatsapp_text"},
                                measured_at=datetime.now(timezone.utc),
                                reported_by="patient",
                                source_msg_id=msg_id,
                            )
                            db.add(event)
                            await db.flush()
                            await evaluate_and_record_risk(
                                session=db,
                                patient_id=patient.id,
                                event_id=event.id,
                                event_type="glucose",
                                event_value={"mgdl": glucose_val},
                            )

    return {"status": "processed"}
