from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import Recommendation, Approval, Patient
from apps.api.app.schemas.schemas import RecommendationResponse, ApprovalDecisionRequest
from apps.api.app.core.auth import get_current_user
from apps.api.app.channels.twilio_client import send_whatsapp_message
from apps.api.app.modules.ai_gateway.llm_client import create_and_queue_recommendation

router = APIRouter(prefix="/v1", tags=["Approvals Desk"])

@router.post("/patients/{patient_id}/generate-nudge", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
async def trigger_nudge_generation(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Manually triggers AI lifestyle nudge generation for a patient and places it in the Coach Approval queue.
    """
    rec = await create_and_queue_recommendation(db, patient_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Patient not found or insufficient history")
    return rec

@router.get("/approvals", response_model=List[RecommendationResponse])
async def list_pending_approvals(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Fetches all AI-generated lifestyle nudges awaiting Coach / Clinician approval.
    """
    stmt = (
        select(Recommendation)
        .where(Recommendation.status == "pending_review")
        .order_by(Recommendation.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/approvals/{recommendation_id}/decision", status_code=status.HTTP_200_OK)
async def submit_approval_decision(
    recommendation_id: str,
    payload: ApprovalDecisionRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Records a human Coach / Doctor review decision:
    - 'approved': Dispatches message to senior's WhatsApp.
    - 'edited': Updates copy with coach improvements and dispatches to WhatsApp.
    - 'rejected': Discards recommendation.
    """
    stmt = select(Recommendation, Patient).join(Patient, Recommendation.patient_id == Patient.id).where(Recommendation.id == recommendation_id)
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    rec, patient = row

    rec.status = payload.decision
    final_text_to_send = rec.message_text
    if payload.edited_text:
        rec.message_text = payload.edited_text
        final_text_to_send = payload.edited_text

    # Log Approval decision
    approval = Approval(
        recommendation_id=recommendation_id,
        approver_id=user.get("id", "usr_coach_01"),
        decision=payload.decision,
        feedback=payload.feedback,
    )
    db.add(approval)
    await db.flush()

    # If approved or edited, dispatch directly to Senior via WhatsApp
    if payload.decision in ("approved", "edited"):
        coach_badge = f"\n\n— Verified by Care Coach ({user.get('name', 'Care Team')})"
        await send_whatsapp_message(patient.phone, f"{final_text_to_send}{coach_badge}")
        rec.status = "sent_to_patient"

    return {
        "status": "success",
        "recommendation_id": recommendation_id,
        "decision": payload.decision,
        "dispatched_to_whatsapp": payload.decision in ("approved", "edited"),
        "patient": patient.name,
    }
