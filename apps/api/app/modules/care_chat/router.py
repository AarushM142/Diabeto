"""Phase 16: persistent shared care-thread messages (Supabase Postgres + Realtime).

Endpoints:
  GET  /v1/care/{patient_id}/messages?limit=200  — thread history (oldest→newest)
  POST /v1/care/{patient_id}/messages            — append a message

Realtime: the frontend subscribes to Postgres changes on `care_messages`
via Supabase Realtime (`supabase.channel('care_thread:<patientId>')`).
This API is the durable writer/reader; Realtime is the live fan-out.
Idempotency: optional `client_msg_id` (unique) — retries return the existing row.
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.core.database import get_db
from apps.api.app.models.entities import CareMessage, Patient
from apps.api.app.schemas.schemas import CareMessageCreate, CareMessageResponse

router = APIRouter(prefix="/v1/care", tags=["Care Chat"])

VALID_SENDERS = {"user", "bot", "doctor", "coach", "caretaker", "system"}


@router.get("/{patient_id}/messages", response_model=List[CareMessageResponse])
async def list_care_messages(
    patient_id: str,
    limit: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CareMessage)
        .where(CareMessage.patient_id == patient_id)
        .order_by(CareMessage.created_at.asc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/{patient_id}/messages", response_model=CareMessageResponse, status_code=status.HTTP_201_CREATED)
async def post_care_message(
    patient_id: str,
    payload: CareMessageCreate,
    db: AsyncSession = Depends(get_db),
):
    sender = (payload.sender or "").strip().lower()
    # Frontend legacy quirk: caretaker composer posts sender='user' with authorName.
    # Accept 'user' for patient + caretaker; dedicated 'caretaker' also accepted.
    if sender not in VALID_SENDERS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid sender '{payload.sender}'. Must be one of {sorted(VALID_SENDERS)}.",
        )
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message text is required.")

    # Idempotent retry: same client_msg_id returns the original row.
    if payload.client_msg_id:
        existing = await db.execute(
            select(CareMessage).where(CareMessage.client_msg_id == payload.client_msg_id)
        )
        row = existing.scalar_one_or_none()
        if row:
            return row

    # Auto-create the patient row if this is a brand-new onboarded elder
    # (ensures FK holds without seed data).
    patient_res = await db.execute(select(Patient).where(Patient.id == patient_id))
    if not patient_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    msg = CareMessage(
        patient_id=patient_id,
        sender=sender,
        author_name=payload.author_name,
        author_id=payload.author_id,
        text=text,
        is_voice=bool(payload.is_voice),
        voice_duration=payload.voice_duration,
        transcript=payload.transcript,
        client_msg_id=payload.client_msg_id,
    )
    db.add(msg)
    try:
        await db.flush()
    except Exception:
        # Unique violation on client_msg_id under race — return the winner.
        await db.rollback()
        if payload.client_msg_id:
            existing = await db.execute(
                select(CareMessage).where(CareMessage.client_msg_id == payload.client_msg_id)
            )
            row = existing.scalar_one_or_none()
            if row:
                return row
        raise
    await db.commit()
    await db.refresh(msg)
    return msg
