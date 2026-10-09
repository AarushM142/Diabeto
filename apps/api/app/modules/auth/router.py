import uuid
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

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None
    role: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = "clinician"
    profile: Optional[Dict[str, Any]] = None

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None
    patient_profile: Optional[Dict[str, Any]] = None
    caregiver_profile: Optional[Dict[str, Any]] = None
    clinician_profile: Optional[Dict[str, Any]] = None
    coach_profile: Optional[Dict[str, Any]] = None

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "clinician"
    clinic_id: Optional[str] = "clinic_pune_01"

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
            "is_patient": current_user.get("role") == "patient",
            "is_admin": current_user.get("role") == "admin",
        }
    }

@router.get("/auth/personas")
async def list_predefined_personas():
    return list(PREDEFINED_PERSONAS.values())

@router.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    email_clean = payload.email.lower().strip()
    
    # Check predefined personas by email or role
    matched_persona = None
    for p in PREDEFINED_PERSONAS.values():
        if p.get("email", "").lower() == email_clean or p.get("role") == email_clean:
            matched_persona = p.copy()
            break
            
    if not matched_persona:
        role = payload.role or "clinician"
        matched_persona = {
            "id": f"usr_{uuid.uuid4().hex[:8]}",
            "role": role,
            "clinic_id": "clinic_pune_01",
            "name": email_clean.split("@")[0].capitalize(),
            "email": email_clean,
            "title": f"Verified {role.capitalize()}",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        }

    token = create_access_token(matched_persona)
    return TokenResponse(access_token=token, user=matched_persona)

@router.post("/auth/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest):
    email = payload.email or "user@gmail.com"
    name = payload.name or email.split("@")[0].replace(".", " ").title()
    role = payload.role or "clinician"

    matched_persona = None
    for p in PREDEFINED_PERSONAS.values():
        if p.get("email", "").lower() == email.lower():
            matched_persona = p.copy()
            break

    if not matched_persona:
        matched_persona = {
            "id": f"goog_{uuid.uuid4().hex[:8]}",
            "role": role,
            "clinic_id": "clinic_pune_01",
            "name": name,
            "email": email,
            "title": f"Google Authenticated ({role.capitalize()})",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        }

    if payload.profile:
        matched_persona["patient_profile"] = payload.profile
        if payload.profile.get("name"):
            matched_persona["name"] = payload.profile["name"]
        if payload.profile.get("age"):
            matched_persona["age"] = payload.profile["age"]
        if payload.profile.get("language"):
            matched_persona["language"] = payload.profile["language"]
        if payload.profile.get("phone"):
            matched_persona["phone"] = payload.profile["phone"]

    token = create_access_token(matched_persona)
    return TokenResponse(access_token=token, user=matched_persona)

@router.post("/auth/profile", response_model=Dict[str, Any])
async def update_user_profile(
    payload: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    updated_user = current_user.copy()
    if payload.name:
        updated_user["name"] = payload.name
    if payload.age is not None:
        updated_user["age"] = payload.age
    if payload.gender:
        updated_user["gender"] = payload.gender
    if payload.phone:
        updated_user["phone"] = payload.phone
    if payload.language:
        updated_user["language"] = payload.language
    if payload.patient_profile:
        updated_user["patient_profile"] = payload.patient_profile
    if payload.caregiver_profile:
        updated_user["caregiver_profile"] = payload.caregiver_profile
    if payload.clinician_profile:
        updated_user["clinician_profile"] = payload.clinician_profile
    if payload.coach_profile:
        updated_user["coach_profile"] = payload.coach_profile

    new_token = create_access_token(updated_user)
    return {"status": "ok", "user": updated_user, "access_token": new_token}

@router.post("/auth/signup", response_model=TokenResponse)
async def signup(payload: SignupRequest):
    email_clean = payload.email.lower().strip()
    role = payload.role or "clinician"
    
    new_user = {
        "id": f"usr_{uuid.uuid4().hex[:8]}",
        "role": role,
        "clinic_id": payload.clinic_id or "clinic_pune_01",
        "name": payload.name,
        "email": email_clean,
        "title": f"Registered {role.capitalize()}",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    }
    token = create_access_token(new_user)
    return TokenResponse(access_token=token, user=new_user)

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

from apps.api.app.core.permissions import log_audit_entry

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
            "actor_role": (l.details.get("actor_role") if isinstance(l.details, dict) else None) or "system",
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "details": l.details if isinstance(l.details, dict) else {},
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
