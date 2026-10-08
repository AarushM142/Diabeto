"""
Diabeto Platform — Indian Meal Intelligence API Router
Exposes endpoints for multimodal meal photo analysis, CGM correlation,
meal history, and observational pattern discovery.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from apps.api.app.core.database import get_db
from apps.api.app.models.entities import HealthEvent, Patient
from apps.api.app.modules.meal_intelligence.schemas import (
    MealAnalysisResult,
    MealAnalysisRequest,
    CGMCorrelationResponse,
    MealHistoryItem,
    MealPatternInsight
)
from apps.api.app.modules.meal_intelligence.gemini_vision_service import GeminiMealVisionService
from apps.api.app.modules.meal_intelligence.cgm_correlator import correlate_meal_with_cgm
from apps.api.app.modules.meal_intelligence.meal_history_service import (
    record_meal_entry,
    get_patient_meal_history,
    discover_meal_patterns
)

router = APIRouter(prefix="/v1/meals", tags=["Indian Meal Intelligence"])
vision_service = GeminiMealVisionService()


async def get_optional_db():
    try:
        from apps.api.app.core.database import async_session_factory
        async with async_session_factory() as session:
            yield session
    except Exception:
        yield None


@router.post("/analyze", response_model=MealAnalysisResult, status_code=status.HTTP_200_OK)
async def analyze_meal_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    patient_id: str = Form("pt_ramesh_001"),
    meal_type: Optional[str] = Form(None),
    context_hint: Optional[str] = Form(None),
    db: Optional[AsyncSession] = Depends(get_optional_db)
):
    """
    Analyzes an Indian meal photograph via Google Gemini Vision.
    Accepts either multipart file upload or JSON payload with base64 image data.
    """
    image_bytes: Optional[bytes] = None
    req_patient_id = patient_id
    req_meal_type = meal_type
    req_hint = context_hint

    # Check for multipart file upload
    if file:
        image_bytes = await file.read()
    else:
        # Check for JSON request body
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body_json = await request.json()
                req_patient_id = body_json.get("patient_id") or "pt_ramesh_001"
                req_meal_type = body_json.get("meal_type")
                req_hint = body_json.get("notes") or body_json.get("context_hint")
                
                b64_str = body_json.get("image_base64")
                if b64_str:
                    image_bytes = b64_str # Gemini service will decode
                elif body_json.get("image_url"):
                    image_bytes = body_json.get("image_url")
            except Exception:
                pass

    if not req_patient_id:
        req_patient_id = "pt_ramesh_001"

    # Execute Vision Analysis
    result = await vision_service.analyze_meal_image(
        image_input=image_bytes,
        patient_id=req_patient_id,
        meal_type=req_meal_type,
        context_hint=req_hint
    )

    # Correlate with post-prandial CGM response
    cgm_correlation = correlate_meal_with_cgm(result)

    # Record in history store
    record_meal_entry(result, cgm_correlation)

    # Persist in Database if DB session is active
    if db:
        try:
            event = HealthEvent(
                patient_id=req_patient_id,
                type="meal",
                value={
                    "meal_id": result.meal_id,
                    "meal_type": result.meal_type,
                    "foods": [f.model_dump() for f in result.foods],
                    "estimated_total_carbs_g": result.estimated_total_carbs_g,
                    "carbohydrate_impact": result.carbohydrate_impact.value,
                    "high_sugar_items": result.high_sugar_items,
                    "confidence": result.confidence,
                    "explanation": result.elderly_explanation
                },
                measured_at=result.timestamp,
                reported_by="patient"
            )
            db.add(event)
            await db.commit()
        except Exception as e:
            try:
                await db.rollback()
            except Exception:
                pass
            print(f"[Meal DB Persistence Note] {e}")

    return result


@router.post("/correlate", response_model=CGMCorrelationResponse)
async def correlate_meal_cgm_endpoint(
    meal_analysis: MealAnalysisResult
):
    """
    Correlates a completed meal analysis with subsequent CGM readings.
    """
    return correlate_meal_with_cgm(meal_analysis)


@router.get("/history/{patient_id}", response_model=List[MealHistoryItem])
async def get_meal_history_endpoint(
    patient_id: str
):
    """
    Retrieves chronological meal history and post-meal glucose responses for the dashboard.
    """
    return get_patient_meal_history(patient_id)


@router.get("/patterns/{patient_id}", response_model=List[MealPatternInsight])
async def get_meal_patterns_endpoint(
    patient_id: str
):
    """
    Returns observational dietary patterns and glycemic excursion trends for a patient.
    """
    return discover_meal_patterns(patient_id)
