from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import Recommendation, Approval
from apps.api.app.schemas.schemas import RecommendationResponse, ApprovalDecisionRequest
from apps.api.app.core.auth import get_current_user

router = APIRouter(prefix="/v1", tags=["Approvals Desk"])

@router.get("/approvals", response_model=List[RecommendationResponse])
async def list_pending_approvals(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    stmt = select(Recommendation).where(Recommendation.status == "pending_review")
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/approvals/{recommendation_id}/decision", status_code=status.HTTP_200_OK)
async def submit_approval_decision(
    recommendation_id: str,
    payload: ApprovalDecisionRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    stmt = select(Recommendation).where(Recommendation.id == recommendation_id)
    result = await db.execute(stmt)
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    rec.status = payload.decision
    if payload.edited_text:
        rec.message_text = payload.edited_text

    approval = Approval(
        recommendation_id=recommendation_id,
        approver_id=user.get("id", "usr_coach_01"),
        decision=payload.decision,
        feedback=payload.feedback,
    )
    db.add(approval)
    await db.flush()

    return {
        "status": "success",
        "recommendation_id": recommendation_id,
        "decision": payload.decision,
    }
