"""
Diabeto Platform — Indian Meal Intelligence Schemas
Defines structured data models for multimodal food vision, carbohydrate estimation,
glycemic impact classification, high-sugar detection, and CGM post-prandial correlation.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Dict, Any, Optional
import uuid
from pydantic import BaseModel, Field


class GlycemicImpactCategory(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DetectedFoodItem(BaseModel):
    food: str = Field(..., description="Identified food item name (e.g., Chapati, Dal Tadka, Bhindi Sabzi)")
    estimated_portion: str = Field(..., description="Estimated serving size (e.g., '2 medium', '1 bowl approx 150g')")
    estimated_carbs_g: float = Field(..., description="Estimated carbohydrate content in grams")
    carbs_range_g: Optional[str] = Field(None, description="Estimated carbohydrate range, e.g., '25–35 g'")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    is_high_sugar: bool = Field(False, description="Flag indicating high-sugar or dessert item")
    glycemic_impact: GlycemicImpactCategory = Field(
        GlycemicImpactCategory.MEDIUM, 
        description="Estimated carbohydrate/glycemic impact category (LOW, MEDIUM, HIGH)"
    )
    notes: Optional[str] = Field(None, description="Observational details (e.g., 'Visible ghee on chapati')")


class MealAnalysisRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64-encoded image string")
    image_url: Optional[str] = Field(None, description="Direct URL to meal image")
    patient_id: Optional[str] = Field("pt_ramesh_001", description="Patient ID for personalization")
    meal_type: Optional[str] = Field(None, description="Meal type: breakfast, lunch, snack, dinner (auto-detected if None)")
    timestamp: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp of meal")


class MealAnalysisResult(BaseModel):
    meal_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique meal event identifier")
    patient_id: str = Field(..., description="Patient ID")
    meal_type: str = Field("lunch", description="Type of meal: breakfast, lunch, snack, dinner")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    foods: List[DetectedFoodItem] = Field(default_factory=list, description="List of detected Indian food items")
    estimated_total_carbs_g: float = Field(..., description="Sum of estimated carbohydrate grams across all items")
    carbohydrate_impact: GlycemicImpactCategory = Field(
        ..., 
        description="Overall estimated carbohydrate impact classification (LOW, MEDIUM, HIGH)"
    )
    high_sugar_items: List[str] = Field(default_factory=list, description="Identified sweets or high-sugar foods")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Aggregate vision confidence score")
    elderly_explanation: str = Field(..., description="Respectful, polite, 2-sentence feedback in patient preferred language")
    sugar_warning: Optional[str] = Field(None, description="Gentle sugar warning if high-sugar food detected")
    notes: str = Field("Estimated from visible portions.", description="Vision assessment notes")
    safety_disclaimer: str = Field(
        "Diabeto Indian Meal Intelligence provides AI-assisted estimates from visible portions for lifestyle awareness. It is not an exact laboratory measurement and never prescribes medication or insulin doses.",
        description="Medical and legal safety disclaimer"
    )


class GlucoseResponseWindow(BaseModel):
    baseline_glucose_mgdl: Optional[float] = Field(None, description="Pre-meal glucose reading")
    t_plus_30m: Optional[float] = Field(None, description="Observed glucose at +30 minutes (mg/dL)")
    t_plus_60m: Optional[float] = Field(None, description="Observed glucose at +60 minutes (mg/dL)")
    t_plus_90m: Optional[float] = Field(None, description="Observed glucose at +90 minutes (mg/dL)")
    t_plus_120m: Optional[float] = Field(None, description="Observed glucose at +120 minutes (mg/dL)")
    observed_peak_mgdl: Optional[float] = Field(None, description="Maximum observed post-prandial glucose reading")
    observed_delta_max_mgdl: Optional[float] = Field(None, description="Max rise above baseline (mg/dL)")


class CGMCorrelationResponse(BaseModel):
    meal_id: str
    patient_id: str
    meal_time: datetime
    meal_type: str
    estimated_carbs_g: float
    carbohydrate_impact: GlycemicImpactCategory
    foods_summary: str
    glucose_response: GlucoseResponseWindow
    glycemic_response_descriptor: str = Field(
        ..., 
        description="Descriptive summary of observed glycemic excursion (e.g., 'Mild observed glucose rise (+18 mg/dL)')"
    )
    observed_pattern_note: str = Field(
        ..., 
        description="Empirical comparison between estimated carbohydrate load and observed subsequent CGM response"
    )
    scientific_disclaimer: str = Field(
        "Reported values represent observed glucose responses associated with this meal window and do not constitute direct single-cause attribution.",
        description="Causality safety disclaimer"
    )


class MealHistoryItem(BaseModel):
    meal_id: str
    date: str
    meal_time: str
    meal_type: str
    foods_summary: str
    estimated_carbs_g: float
    carbohydrate_impact: str
    sugar_detected: bool
    baseline_glucose: Optional[float] = None
    post_meal_glucose_60m: Optional[float] = None
    post_meal_glucose_120m: Optional[float] = None
    observed_delta: Optional[float] = None


class MealPatternInsight(BaseModel):
    pattern_type: str
    description: str
    evidence_count: int
    observed_avg_delta_mgdl: Optional[float] = None
    confidence_label: str = "moderate"
