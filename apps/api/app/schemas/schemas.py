from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    type: str
    value: Dict[str, Any]
    measured_at: datetime
    received_at: datetime
    reported_by: str
    risk_status: str = "normal"


# Medication Schemas
class MedicationScheduleCreate(BaseModel):
    drug_name: str
    dosage: str
    scheduled_time: str
    instructions: Optional[str] = None

class MedicationScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    drug_name: str
    dosage: str
    scheduled_time: str
    instructions: Optional[str]
    is_active: bool


# Risk Schemas
class RiskEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    type: str
    severity: str
    evidence_ids: List[str]
    status: str
    created_at: datetime


# Recommendation & Approval Schemas
class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

class ApprovalDecisionRequest(BaseModel):
    decision: str # approved, rejected, edited
    feedback: Optional[str] = None
    edited_text: Optional[str] = None

# WhatsApp Webhook
class WhatsAppWebhookEntry(BaseModel):
    object: Optional[str] = None
    entry: Optional[List[Dict[str, Any]]] = None
