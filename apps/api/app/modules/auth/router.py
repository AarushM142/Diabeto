from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from apps.api.app.core.database import get_db
from apps.api.app.core.auth import get_current_user, require_roles, create_access_token, PREDEFINED_PERSONAS
from apps.api.app.models.entities import AuditLog, Patient

router = APIRouter(prefix="/v1", tags=["Authentication & Audit"])

class TokenRequest(BaseModel):
    persona_key: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class ConsentUpdateRequest(BaseModel):
    view_raw_glucose: Optional[bool] = None
    emergency_escalation: Optional[bool] = None
    share_with_coach: Optional[bool] = None

@router.get("/auth/me")
async def get_my_persona(current_user: dict = Depends(get_current_user)):
    return {
        "user": current_user,
        "permissions": {
            "is_clinician": current_user.get("role") == "clinician",
            "is_coach": current_user.get("role") == "coach",
            "is_caregiver": current_user.get("role") == "caregiver",
            "is_admin": current_user.get("role") == "admin",
        }
    }

@router.get("/auth/personas")
async def list_predefined_personas():
    return list(PREDEFINED_PERSONAS.values())

@router.post("/auth/token", response_model=TokenResponse)
async def generate_persona_token(payload: TokenRequest):
    persona = PREDEFINED_PERSONAS.get(payload.persona_key)
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona '{payload.persona_key}' not found. Available: {list(PREDEFINED_PERSONAS.keys())}",
        )
    token = create_access_token(persona)
    return TokenResponse(access_token=token, user=persona)

@router.get("/audit/logs")
async def get_audit_trail(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(["clinician", "admin"])),
):
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "actor_id": l.actor_id,
            "actor_role": l.actor_role,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "details": l.details,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]

@router.post("/patients/{patient_id}/consent")
async def update_patient_consent(
    patient_id: str,
    payload: ConsentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    flags = dict(patient.consent_flags or {})
    if payload.view_raw_glucose is not None:
        flags["view_raw_glucose"] = payload.view_raw_glucose
    if payload.emergency_escalation is not None:
        flags["emergency_escalation"] = payload.emergency_escalation
    if payload.share_with_coach is not None:
        flags["share_with_coach"] = payload.share_with_coach

    patient.consent_flags = flags
    await db.commit()

    await log_audit_entry(
        db=db,
        actor_id=current_user.get("id", "unknown"),
        actor_role=current_user.get("role", "unknown"),
        action="patient_consent_updated",
        target_type="patient",
        target_id=patient_id,
        details={"updated_flags": flags},
    )

    return {"status": "success", "consent_flags": patient.consent_flags}
