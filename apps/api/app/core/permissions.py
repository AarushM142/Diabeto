import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.models.entities import AuditLog, Patient

async def log_audit_entry(
    db: AsyncSession,
    actor_id: str,
    actor_role: str,
    action: str,
    target_type: str,
    target_id: str,
    details: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Appends an immutable audit log entry for clinical governance & compliance.
    """
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(audit)
    await db.commit()
    return audit

def check_patient_consent_scope(
    patient: Patient,
    user: dict,
) -> Dict[str, bool]:
    """
    Evaluates consent flags and relationship permissions for the user.
    """
    role = user.get("role")
    consent = patient.consent_flags or {}
    
    # Clinicians and Admins have full clinical access
    if role in ("clinician", "admin"):
        return {
            "can_view_raw_glucose": True,
            "can_modify_regimen": True,
            "can_verify_summary": True,
            "can_approve_nudges": True,
        }

    # Care Coaches have lifestyle access
    if role == "coach":
        return {
            "can_view_raw_glucose": True,
            "can_modify_regimen": False,
            "can_verify_summary": False,
            "can_approve_nudges": True,
        }

    # Caregivers are strictly consent-gated
    if role == "caregiver":
        view_raw = bool(consent.get("view_raw_glucose", True))
        return {
            "can_view_raw_glucose": view_raw,
            "can_modify_regimen": False,
            "can_verify_summary": False,
            "can_approve_nudges": False,
        }

    return {
        "can_view_raw_glucose": False,
        "can_modify_regimen": False,
        "can_verify_summary": False,
        "can_approve_nudges": False,
    }
