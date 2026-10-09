from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from apps.api.app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_bearer = HTTPBearer(auto_error=False)

PREDEFINED_PERSONAS: Dict[str, dict] = {
    "clinician": {
        "id": "doc_mehta_101",
        "role": "clinician",
        "clinic_id": "clinic_pune_01",
        "name": "Dr. Arvind Mehta",
        "title": "Senior Diabetologist (Clinician of Record)",
        "email": "dr.mehta@diabeto.care",
        "avatar": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80",
    },
    "coach": {
        "id": "coach_kavita_02",
        "role": "coach",
        "clinic_id": "clinic_pune_01",
        "name": "Sister Kavita Deshmukh",
        "title": "Care Coordinator & Nutrition Coach",
        "email": "kavita.coach@diabeto.care",
        "avatar": "https://images.unsplash.com/photo-1594824813589-8d77c25091a1?w=100&auto=format&fit=crop&q=80",
    },
    "caregiver": {
        "id": "cg_ananya_03",
        "role": "caregiver",
        "clinic_id": "clinic_pune_01",
        "name": "Ananya Kulkarni",
        "title": "Primary Family Caregiver (Daughter)",
        "email": "ananya.k@example.com",
        "linked_patient_id": "pt_ramesh_001",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
    },
    "patient": {
        "id": "pt_ramesh_001",
        "role": "patient",
        "clinic_id": "clinic_pune_01",
        "name": "Ramesh Kulkarni",
        "title": "Senior Patient (Sanctuary)",
        "email": "ramesh.kulkarni@example.com",
        "linked_patient_id": "pt_ramesh_001",
        "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80",
    },
    "admin": {
        "id": "admin_pune_04",
        "role": "admin",
        "clinic_id": "clinic_pune_01",
        "name": "Clinic Administrator",
        "title": "Pune Central Clinic Admin",
        "email": "admin@diabeto.care",
        "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
    },
}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> dict:
    # 1. Inspect Bearer Token
    if credentials and credentials.credentials:
        try:
            return decode_access_token(credentials.credentials)
        except HTTPException:
            pass

    # 2. Inspect X-User-Role / Persona Header (for instant frontend multi-persona testing)
    role_header = request.headers.get("x-user-role", "").lower().strip()
    if role_header in PREDEFINED_PERSONAS:
        persona = PREDEFINED_PERSONAS[role_header].copy()
        user_id_header = request.headers.get("x-user-id")
        if user_id_header:
            persona["id"] = user_id_header
        return persona

    # 3. Development Fallback default (Clinician)
    if settings.ENVIRONMENT == "development":
        return PREDEFINED_PERSONAS["clinician"].copy()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication credentials",
    )

def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Role '{user_role}' is not authorized. Allowed roles: {allowed_roles}",
            )
        return current_user
    return role_checker

def require_role(*roles: str):
    return require_roles(list(roles))

async def ensure_db_user(
    db,
    user_id: str,
    name: Optional[str] = None,
    role: str = "clinician",
    phone: Optional[str] = None,
    language: str = "en",
    clinic_id: Optional[str] = None,
):
    """Ensures a user row exists in the PostgreSQL users table to satisfy foreign key constraints."""
    import uuid
    from sqlalchemy import select
    from apps.api.app.models.entities import User, Clinic

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()
    if existing_user:
        return existing_user

    # Find info from PREDEFINED_PERSONAS if available
    for p in PREDEFINED_PERSONAS.values():
        if p.get("id") == user_id:
            name = name or p.get("name")
            role = role or p.get("role", "clinician")
            phone = phone or p.get("phone")
            language = language or p.get("language", "en")
            break

    name = name or "Clinician"
    role = role or "clinician"
    language = language or "en"

    # Generate phone if not provided
    if not phone:
        phone = f"+9198{abs(hash(user_id)) % 100000000:08d}"

    # Verify phone uniqueness
    phone_res = await db.execute(select(User).where(User.phone == phone))
    if phone_res.scalar_one_or_none():
        phone = f"+91{uuid.uuid4().hex[:10]}"

    if not clinic_id:
        clinic_res = await db.execute(select(Clinic.id))
        clinic_id = clinic_res.scalars().first()
        if not clinic_id:
            default_clinic = Clinic(id="clinic_pune_central", name="Pune Central Diabetes Clinic", address="FC Road, Pune")
            db.add(default_clinic)
            await db.flush()
            clinic_id = default_clinic.id

    new_user = User(
        id=user_id,
        name=name,
        role=role,
        phone=phone,
        language=language,
        clinic_id=clinic_id,
    )
    db.add(new_user)
    await db.flush()
    return new_user

