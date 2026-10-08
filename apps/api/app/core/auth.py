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
        "title": "MD Diabetologist (Clinician of Record)",
    },
    "coach": {
        "id": "coach_kavita_02",
        "role": "coach",
        "clinic_id": "clinic_pune_01",
        "name": "Sister Kavita R.",
        "title": "Diabetes Care Coach",
    },
    "caregiver": {
        "id": "cg_ananya_03",
        "role": "caregiver",
        "clinic_id": "clinic_pune_01",
        "name": "Ananya Kulkarni",
        "title": "Daughter / Primary Caregiver",
        "linked_patient_id": "pt_ramesh_001",
    },
    "admin": {
        "id": "admin_pune_04",
        "role": "admin",
        "clinic_id": "clinic_pune_01",
        "name": "Clinic Administrator",
        "title": "Pune Central Clinic Admin",
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
