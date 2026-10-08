from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from apps.api.app.core.database import get_db
from apps.api.app.models.entities import Patient, AuditLog, RiskEvent
from apps.api.app.modules.escalation.service import (
    dispatch_emergency_escalation,
    acknowledge_emergency,
    generate_twiml_ivr,
    ESCALATION_TEMPLATES,
)
from apps.api.app.modules.escalation.ui import render_ivr_simulator_html

router = APIRouter(prefix="/v1", tags=["Emergency Escalation"])

class EmergencyEscalationRequest(BaseModel):
    glucose_mgdl: float = Field(..., ge=20, le=600, description="Glucose reading triggering the critical alert (mg/dL)")
    risk_event_id: Optional[str] = Field(None, description="Optional associated RiskEvent ID")
    reason: Optional[str] = Field(None, description="Clinical trigger reason (e.g. Critical Hypoglycemia < 70)")
    force_dispatch: bool = Field(False, description="Set True to bypass the 15-minute cooldown guardrail")

class EmergencyAcknowledgeRequest(BaseModel):
    acknowledged_by: str = Field(..., description="ID or name of acknowledging caregiver / clinician")
    notes: Optional[str] = Field(None, description="Caregiver rescue notes (e.g., 3 tsp sugar given, patient alert)")

@router.post("/patients/{patient_id}/escalate/emergency")
async def trigger_emergency_escalation(
    patient_id: str,
    payload: EmergencyEscalationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    🚨 1-Click / Automated Emergency Escalation to Family:
    Dispatches automated Twilio IVR outbound phone call and high-urgency SMS alerts
    to all registered family caregivers when severe hypoglycemia (< 70 mg/dL) is detected.
    Includes a 15-minute cooldown guardrail to prevent repeat panic calling.
    """
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    base_url = str(request.base_url).rstrip("/")
    result = await dispatch_emergency_escalation(
        db=db,
        patient_id=patient_id,
        glucose_mgdl=payload.glucose_mgdl,
        risk_event_id=payload.risk_event_id,
        reason=payload.reason,
        force_dispatch=payload.force_dispatch,
        callback_base_url=base_url,
    )
    return result

@router.post("/escalations/{risk_event_id}/acknowledge")
async def acknowledge_emergency_event(
    risk_event_id: str,
    payload: EmergencyAcknowledgeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Caregiver / Clinician Emergency Acknowledgment:
    Records that a caregiver or staff member has confirmed the alert and attended to the patient.
    """
    result = await acknowledge_emergency(
        db=db,
        risk_event_id=risk_event_id,
        acknowledged_by=payload.acknowledged_by,
        notes=payload.notes,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("message"))
    return result

@router.get("/patients/{patient_id}/escalations")
async def get_patient_escalation_history(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Lists the emergency alert and escalation audit history for a patient.
    """
    stmt_pt = select(Patient).where(Patient.id == patient_id)
    res_pt = await db.execute(stmt_pt)
    patient = res_pt.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    stmt_logs = (
        select(AuditLog)
        .where(
            AuditLog.target_type == "patient",
            AuditLog.target_id == patient_id,
            AuditLog.action.in_(["emergency_escalation_dispatched", "emergency_acknowledged"]),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    res_logs = await db.execute(stmt_logs)
    logs = res_logs.scalars().all()

    return {
        "patient_id": patient_id,
        "patient_name": patient.name,
        "total_escalations": len(logs),
        "history": [
            {
                "id": log.id,
                "action": log.action,
                "created_at": log.created_at.isoformat(),
                "actor_id": log.actor_id,
                "details": log.details,
            }
            for log in logs
        ],
    }

@router.post("/escalations/twiml/callback")
async def twilio_voice_ivr_callback(
    request: Request,
    risk_event_id: Optional[str] = Query(None),
    lang: Optional[str] = Query("en"),
    db: AsyncSession = Depends(get_db),
):
    """
    Twilio DTMF Keypad Callback:
    Triggered when caregiver presses 1 during the automated outbound phone call.
    Automatically acknowledges the emergency event in the patient chart.
    """
    form_data = await request.form()
    digits = form_data.get("Digits", "")
    caller_phone = form_data.get("From", "unknown_caller")

    lang_key = lang if lang in ESCALATION_TEMPLATES else "en"
    tpl = ESCALATION_TEMPLATES[lang_key]

    if digits == "1" and risk_event_id:
        await acknowledge_emergency(
            db=db,
            risk_event_id=risk_event_id,
            acknowledged_by=f"ivr_phone_{caller_phone}",
            notes="Acknowledged via phone keypad digit 1 during automated IVR call.",
        )

    ack_message = tpl["ivr_acknowledged_message"]
    twiml_reply = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{tpl['voice']}" language="{tpl['language']}">{ack_message}</Say>
    <Hangup/>
</Response>"""

    return Response(content=twiml_reply.strip(), media_type="application/xml")

@router.get("/escalations/twiml/preview")
async def preview_twiml_xml(
    request: Request,
    patient_name: str = Query("Ramesh Patel"),
    glucose_mgdl: float = Query(54.0),
    language: str = Query("en"),
    format: Optional[str] = Query(None, description="Set 'xml' for raw TwiML XML or 'html' for Interactive Voice Simulator UI"),
):
    """
    Interactive Emergency IVR Voice Simulator & TwiML visualizer.
    Returns a rich interactive UI with speech playback, mobile screen mockup,
    and phone keypad by default to browsers, or raw XML if requested via format='xml'.
    """
    lang_key = language.lower() if language.lower() in ESCALATION_TEMPLATES else "en"
    tpl = ESCALATION_TEMPLATES[lang_key]

    twiml = generate_twiml_ivr(
        patient_name=patient_name,
        glucose_mgdl=glucose_mgdl,
        risk_event_id="preview_event_id",
        language=lang_key,
    )

    accept_header = request.headers.get("accept", "")
    is_browser = "text/html" in accept_header

    # If requested by browser or explicitly requesting html, render interactive simulator UI
    if format == "html" or (format != "xml" and is_browser):
        html_page = render_ivr_simulator_html(
            patient_name=patient_name,
            glucose_mgdl=glucose_mgdl,
            language=lang_key,
            twiml_xml=twiml,
            template=tpl,
        )
        return Response(content=html_page, media_type="text/html")

    return Response(content=twiml, media_type="application/xml")
