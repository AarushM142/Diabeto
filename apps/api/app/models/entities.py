from datetime import datetime, timezone
import uuid
from typing import Optional, Any
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Index, Text, Enum
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from apps.api.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Clinic(Base):
    __tablename__ = "clinics"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    clinic_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("clinics.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False) # admin, clinician, coach, caregiver, patient
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    phone_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    clinic_id: Mapped[str] = mapped_column(String, ForeignKey("clinics.id"), nullable=False, index=True)
    clinician_of_record_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    language: Mapped[str] = mapped_column(String(10), default="hi") # hi, mr, en
    consent_flags: Mapped[dict] = mapped_column(JSONB, default=dict)
    thresholds_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class CareRelationship(Base):
    __tablename__ = "care_relationships"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False) # caregiver, coach, clinician
    permissions: Mapped[dict] = mapped_column(JSONB, default=dict) # e.g. {"view_adherence": true, "view_raw_glucose": false}
    consent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class PatientThreshold(Base):
    __tablename__ = "patient_thresholds"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, unique=True)
    critical_low: Mapped[float] = mapped_column(Float, default=70.0)
    low: Mapped[float] = mapped_column(Float, default=80.0)
    high: Mapped[float] = mapped_column(Float, default=180.0)
    critical_high: Mapped[float] = mapped_column(Float, default=250.0)
    escalation_timings: Mapped[dict] = mapped_column(JSONB, default=lambda: {"t1_minutes": 15, "t2_minutes": 30})
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    drug_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    scheduled_time: Mapped[str] = mapped_column(String(10), nullable=False) # "08:30"
    instructions: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class HealthEvent(Base):
    __tablename__ = "health_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False) # glucose, meal, activity, symptom, sleep, weight
    value: Mapped[dict] = mapped_column(JSONB, nullable=False) # e.g. {"mgdl": 140, "context": "fasting"}
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    reported_by: Mapped[str] = mapped_column(String(50), default="patient") # patient, caregiver, device
    source_msg_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)

    __table_args__ = (
        Index("idx_patient_type_measured", "patient_id", "type", "measured_at"),
    )

class RiskEvent(Base):
    __tablename__ = "risk_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False) # critical_low, high_spike, consecutive_high, missed_dose
    severity: Mapped[str] = mapped_column(String(50), nullable=False) # info, watch, urgent, critical
    evidence_ids: Mapped[list] = mapped_column(JSONB, default=list)
    rule_version: Mapped[str] = mapped_column(String(50), default="1.0")
    status: Mapped[str] = mapped_column(String(50), default="active") # active, acknowledged, resolved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    finding: Mapped[dict] = mapped_column(JSONB, nullable=False)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    reason_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_label: Mapped[str] = mapped_column(String(50), nullable=False) # high, moderate, low
    message_class: Mapped[str] = mapped_column(String(50), default="coach") # pre-approved, coach, doctor
    status: Mapped[str] = mapped_column(String(50), default="pending_review") # pending_review, approved, rejected, sent
    ai_request_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    recommendation_id: Mapped[str] = mapped_column(String, ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=False)
    approver_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    decision: Mapped[str] = mapped_column(String(50), nullable=False) # approved, rejected, edited
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    job_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending") # pending, processing, completed, failed
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    actor_id: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target_id: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
