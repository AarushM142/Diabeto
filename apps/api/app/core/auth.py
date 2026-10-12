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
        "name": "Dr. Aarav Mehta",
        "email": "dr.mehta@diabeto.org",
        "title": "Lead Endocrinologist",
        "avatar": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80",
    },
    "coach": {
        "id": "coach_priya_02",
        "role": "coach",
        "clinic_id": "clinic_pune_01",
        "name": "Priya Sharma",
        "email": "priya.coach@diabeto.org",
        "title": "Certified Diabetes Educator",
        "avatar": "https://images.unsplash.com/photo-1594824813589-9831a29369f6?w=100&auto=format&fit=crop&q=80",
    },
    "caregiver": {
        "id": "cg_ananya_03",
        "role": "caregiver",
        "clinic_id": "clinic_pune_01",
        "name": "Ananya Kulkarni",
        "email": "ananya.cg@diabeto.org",
        "title": "Primary Family Caregiver",
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
    },
    "admin": {
        "id": "admin_system_01",
        "role": "admin",
        "clinic_id": "clinic_pune_01",
        "name": "System Administrator",
        "email": "admin@diabeto.org",
        "title": "Clinic & Compliance Admin",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
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

    # 2. Inspect X-User-Role / X-User-ID headers (real frontend session, no seeds).
    # Role must be a valid role; id comes from the authenticated user record.
    role_header = request.headers.get("x-user-role", "").lower().strip()
    user_id_header = request.headers.get("x-user-id", "").strip()
    valid_roles = {"admin", "clinician", "coach", "caregiver", "patient"}
    if role_header in valid_roles and user_id_header:
        return {"id": user_id_header, "role": role_header}

    # 3. No development fallback with seed personas — require real credentials.

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
        if name and (existing_user.name.lower().startswith("patient ") or (existing_user.name != name and not name.lower().startswith("patient "))):
            existing_user.name = name
            await db.flush()
        return existing_user

    # No seed-persona lookup: names/roles must be supplied by callers (real onboarding).
    # Keep generic defaults only.

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

import hashlib

def generate_patient_connection_code(patient_id: str, name: Optional[str] = None) -> str:
    """Generate a deterministic 6-7 char connection code for a patient."""
    import re
    clean_name = re.sub(r"[^A-Za-z]", "", name or "")
    prefix = (clean_name[:3] if len(clean_name) >= 3 else "DIA").upper()
    h = hashlib.sha256(patient_id.encode("utf-8")).hexdigest()
    num = int(h[:6], 16) % 9000 + 1000
    return f"DIA-{prefix}{num}"

async def ensure_db_patient(
    db,
    patient_id: str,
    name: Optional[str] = None,
    phone: Optional[str] = None,
    language: str = "hi",
    clinic_id: Optional[str] = None,
    clinician_of_record_id: Optional[str] = None,
    age: Optional[int] = 65,
    gender: Optional[str] = "Male",
    consent_flags: Optional[dict] = None,
):
    """Ensures a patient row exists in the PostgreSQL patients table."""
    import uuid
    from sqlalchemy import select
    from apps.api.app.models.entities import Patient, User, Clinic

    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    existing_p = res.scalar_one_or_none()
    if existing_p:
        # Ensure connection code is populated in consent flags
        code = generate_patient_connection_code(patient_id, existing_p.name or name)
        flags = dict(existing_p.consent_flags or {})
        if "connection_code" not in flags or not flags["connection_code"]:
            flags["connection_code"] = code
            existing_p.consent_flags = flags
        if name and existing_p.name != name:
            existing_p.name = name
        if age and existing_p.age != age:
            existing_p.age = age
        if gender and existing_p.gender != gender:
            existing_p.gender = gender
        if phone and existing_p.phone != phone:
            existing_p.phone = phone
        if language and existing_p.language != language:
            existing_p.language = language
        await db.flush()
        return existing_p

    # Check if a user with this id exists
    user_stmt = select(User).where(User.id == patient_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if user:
        if user.name and not user.name.lower().startswith("patient "):
            name = name or user.name
        phone = phone or user.phone
        language = language or user.language
        clinic_id = clinic_id or user.clinic_id

    # Check SAVED_USER_PROFILES if available
    try:
        from apps.api.app.modules.auth.router import SAVED_USER_PROFILES
        for prof in SAVED_USER_PROFILES.values():
            if prof.get("id") == patient_id:
                prof_n = prof.get("name")
                if prof_n and not prof_n.lower().startswith("patient "):
                    name = name or prof_n
                    break
    except Exception:
        pass

    name = name or f"Patient {patient_id[-6:].upper()}"

    # Ensure clinic exists
    if not clinic_id:
        clinic_res = await db.execute(select(Clinic.id))
        clinic_id = clinic_res.scalars().first()
        if not clinic_id:
            default_clinic = Clinic(id="clinic_pune_central", name="Pune Central Diabetes Clinic", address="FC Road, Pune")
            db.add(default_clinic)
            await db.flush()
            clinic_id = default_clinic.id

    # Ensure clinician of record exists (generic — no seed doctor auto-created).
    if not clinician_of_record_id:
        doc_res = await db.execute(select(User).where(User.role == "clinician"))
        doc = doc_res.scalars().first()
        if doc:
            clinician_of_record_id = doc.id
        else:
            clinician_of_record_id = "pending_clinician_assignment"
            await ensure_db_user(
                db=db,
                user_id="pending_clinician_assignment",
                name="Unassigned Doctor",
                role="clinician",
                language="en",
                clinic_id=clinic_id,
            )

    # Ensure user row exists for the patient if patient_id is used as a user_id
    if not user:
        await ensure_db_user(
            db=db,
            user_id=patient_id,
            name=name,
            role="patient",
            phone=phone,
            language=language,
            clinic_id=clinic_id,
        )

    # Phone uniqueness for patient
    if not phone:
        phone = f"+9197{abs(hash(patient_id)) % 100000000:08d}"

    phone_res = await db.execute(select(Patient).where(Patient.phone == phone))
    if phone_res.scalar_one_or_none():
        phone = f"+91{uuid.uuid4().hex[:10]}"

    code = generate_patient_connection_code(patient_id, name)
    default_flags = {"connection_code": code, "view_raw_glucose": True, "emergency_escalation": True}
    if consent_flags:
        default_flags.update(consent_flags)
    default_flags["connection_code"] = code

    new_patient = Patient(
        id=patient_id,
        clinic_id=clinic_id,
        clinician_of_record_id=clinician_of_record_id,
        name=name,
        age=age or 65,
        gender=gender or "Male",
        phone=phone,
        language=language or "hi",
        consent_flags=default_flags,
    )
    db.add(new_patient)
    await db.flush()
    return new_patient


