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

# Patient Threshold Schemas
class PatientThresholdUpsert(BaseModel):
    critical_low: float = Field(70.0, description="Critical hypoglycemia threshold (mg/dL)")
    low: float = Field(80.0, description="Low glucose warning threshold (mg/dL)")
    high: float = Field(180.0, description="High glucose warning threshold (mg/dL)")
    critical_high: float = Field(250.0, description="Critical hyperglycemia threshold (mg/dL)")
    escalation_timings: Optional[Dict[str, Any]] = Field(
        default=None,
        description="e.g. {\"t1_minutes\": 15, \"t2_minutes\": 30}",
    )

class PatientThresholdResponse(BaseModel):
    id: str
    patient_id: str
    critical_low: float
    low: float
    high: float
    critical_high: float
    escalation_timings: Dict[str, Any]
    version: int

    class Config:
        from_attributes = True

# Phase 5: Trend, Analytics & Weekly Summary Schemas
class GlycemicMetrics(BaseModel):
    total_readings: int
    mean_glucose: float
    median_glucose: float
    mad_glucose: float
    min_glucose: float
    max_glucose: float
    standard_deviation: float
    coefficient_of_variation_pct: float
    tir_percentage: float
    tar_percentage: float
    tbr_percentage: float
    clinical_status: str

class AdherenceMetrics(BaseModel):
    active_medication_count: int
    total_confirmed_doses: int
    compliance_score_pct: float
    readings_per_day: float
    status: str

class ReadingItem(BaseModel):
    measured_at: datetime
    mgdl: float
    context: str

class TrendAnalyticsResponse(BaseModel):
    patient_id: str
    days: int
    glycemic_metrics: GlycemicMetrics
    context_breakdowns: Dict[str, Any]
    adherence_metrics: AdherenceMetrics
    readings: List[ReadingItem]

class WeeklySummaryResponse(BaseModel):
    patient_id: str
    patient_name: str
    age: int
    period_days: int
    generated_at: str
    status: str # unverified, verified
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    clinician_notes: Optional[str] = None
    glycemic_metrics: GlycemicMetrics
    context_breakdowns: Dict[str, Any]
    adherence_metrics: AdherenceMetrics
    risk_events_count: int
    clinical_highlights: List[str]
    doctor_action_recommendation: str

class VerifyWeeklySummaryRequest(BaseModel):
    notes: Optional[str] = None


