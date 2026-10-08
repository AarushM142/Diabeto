from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

# Patient Schemas
class PatientCreate(BaseModel):
    clinic_id: str
    clinician_of_record_id: str
    name: str
    age: int
    gender: str
    phone: str
    language: str = "hi"
    consent_flags: Dict[str, Any] = Field(default_factory=dict)

class PatientResponse(BaseModel):
    id: str
    clinic_id: str
    clinician_of_record_id: str
    name: str
    age: int
    gender: str
    phone: str
    language: str
    consent_flags: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# Health Event Schemas
class GlucoseValue(BaseModel):
    mgdl: float
    context: str = "fasting" # fasting, post_meal, random, bedtime

class HealthEventCreate(BaseModel):
    type: str = "glucose"
    value: Dict[str, Any]
    measured_at: datetime
    reported_by: str = "patient"
    source_msg_id: Optional[str] = None

class HealthEventResponse(BaseModel):
    id: str
    patient_id: str
    type: str
    value: Dict[str, Any]
    measured_at: datetime
    received_at: datetime
    reported_by: str
    risk_status: str = "normal"

    class Config:
        from_attributes = True

# Medication Schemas
class MedicationScheduleCreate(BaseModel):
    drug_name: str
    dosage: str
    scheduled_time: str
    instructions: Optional[str] = None

class MedicationScheduleResponse(BaseModel):
    id: str
    patient_id: str
    drug_name: str
    dosage: str
    scheduled_time: str
    instructions: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

# Risk Schemas
class RiskEventResponse(BaseModel):
    id: str
    patient_id: str
    type: str
    severity: str
    evidence_ids: List[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Recommendation & Approval Schemas
class RecommendationResponse(BaseModel):
    id: str
    patient_id: str
    finding: Dict[str, Any]
    action_type: str
    message_text: str
    reason_text: str
    confidence_label: str
    message_class: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ApprovalDecisionRequest(BaseModel):
    decision: str # approved, rejected, edited
    feedback: Optional[str] = None
    edited_text: Optional[str] = None

# WhatsApp Webhook
class WhatsAppWebhookEntry(BaseModel):
    object: Optional[str] = None
    entry: Optional[List[Dict[str, Any]]] = None
