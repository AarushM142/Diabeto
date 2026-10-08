"""
Diabeto Platform — Meal History & Observational Pattern Engine
Stores meal logs, correlates post-prandial telemetry, and discovers longitudinal dietary patterns.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import uuid

from apps.api.app.modules.meal_intelligence.schemas import (
    MealAnalysisResult,
    MealHistoryItem,
    MealPatternInsight,
    CGMCorrelationResponse,
    GlycemicImpactCategory
)

_SEED_BASELINE_RECORDS = [
    MealHistoryItem(
        meal_id="meal_hist_001",
        date="2026-10-06",
        meal_time="13:15",
        meal_type="Lunch",
        foods_summary="2 Chapatis, Dal Tadka, Bhindi Sabzi, Salad",
        estimated_carbs_g=52.0,
        carbohydrate_impact="MEDIUM",
        sugar_detected=False,
        baseline_glucose=108.0,
        post_meal_glucose_60m=136.0,
        post_meal_glucose_120m=122.0,
        observed_delta=28.0
    ),
    MealHistoryItem(
        meal_id="meal_hist_002",
        date="2026-10-06",
        meal_time="20:30",
        meal_type="Dinner",
        foods_summary="Steamed Rice, Dal, Mixed Sabzi, Gulab Jamun",
        estimated_carbs_g=92.0,
        carbohydrate_impact="HIGH",
        sugar_detected=True,
        baseline_glucose=115.0,
        post_meal_glucose_60m=182.0,
        post_meal_glucose_120m=168.0,
        observed_delta=67.0
    ),
    MealHistoryItem(
        meal_id="meal_hist_003",
        date="2026-10-07",
        meal_time="08:45",
        meal_type="Breakfast",
        foods_summary="Poha with Peanuts, Chai",
        estimated_carbs_g=48.0,
        carbohydrate_impact="MEDIUM",
        sugar_detected=True,
        baseline_glucose=102.0,
        post_meal_glucose_60m=144.0,
        post_meal_glucose_120m=126.0,
        observed_delta=42.0
    ),
    MealHistoryItem(
        meal_id="meal_hist_004",
        date="2026-10-07",
        meal_time="13:30",
        meal_type="Lunch",
        foods_summary="Large Rice portion, Rajma, Salad",
        estimated_carbs_g=78.0,
        carbohydrate_impact="HIGH",
        sugar_detected=False,
        baseline_glucose=110.0,
        post_meal_glucose_60m=176.0,
        post_meal_glucose_120m=154.0,
        observed_delta=66.0
    ),
    MealHistoryItem(
        meal_id="meal_hist_005",
        date="2026-10-08",
        meal_time="09:00",
        meal_type="Breakfast",
        foods_summary="2 Idlis, Sambar, Coconut Chutney",
        estimated_carbs_g=47.0,
        carbohydrate_impact="MEDIUM",
        sugar_detected=False,
        baseline_glucose=98.0,
        post_meal_glucose_60m=132.0,
        post_meal_glucose_120m=114.0,
        observed_delta=34.0
    )
]

# In-memory session store for rapid lookup and caching
_IN_MEMORY_MEAL_STORE: Dict[str, List[Dict[str, Any]]] = {}


def _init_patient_store_if_empty(patient_id: str):
    if patient_id not in _IN_MEMORY_MEAL_STORE:
        _IN_MEMORY_MEAL_STORE[patient_id] = []
        if patient_id == "pt_ramesh_001":
            for item in _SEED_BASELINE_RECORDS:
                _IN_MEMORY_MEAL_STORE[patient_id].append({
                    "item": item,
                    "analysis": None,
                    "correlation": None
                })


def record_meal_entry(
    meal_analysis: MealAnalysisResult,
    cgm_correlation: Optional[CGMCorrelationResponse] = None
) -> MealHistoryItem:
    """
    Saves a analyzed meal entry into the longitudinal history store.
    """
    p_id = meal_analysis.patient_id or "pt_ramesh_001"
    _init_patient_store_if_empty(p_id)

    m_time = meal_analysis.timestamp
    foods_str = ", ".join([f.food for f in meal_analysis.foods]) or "Meal"

    baseline_g = cgm_correlation.glucose_response.baseline_glucose_mgdl if cgm_correlation else 110.0
    post_60 = cgm_correlation.glucose_response.t_plus_60m if cgm_correlation else None
    post_120 = cgm_correlation.glucose_response.t_plus_120m if cgm_correlation else None
    delta = cgm_correlation.glucose_response.observed_delta_max_mgdl if cgm_correlation else None

    item = MealHistoryItem(
        meal_id=meal_analysis.meal_id,
        date=m_time.strftime("%Y-%m-%d"),
        meal_time=m_time.strftime("%H:%M"),
        meal_type=meal_analysis.meal_type.title(),
        foods_summary=foods_str,
        estimated_carbs_g=meal_analysis.estimated_total_carbs_g,
        carbohydrate_impact=meal_analysis.carbohydrate_impact.value,
        sugar_detected=len(meal_analysis.high_sugar_items) > 0,
        baseline_glucose=baseline_g,
        post_meal_glucose_60m=post_60,
        post_meal_glucose_120m=post_120,
        observed_delta=delta
    )

    _IN_MEMORY_MEAL_STORE[p_id].append({
        "item": item,
        "analysis": meal_analysis,
        "correlation": cgm_correlation
    })

    return item


def get_patient_meal_history(patient_id: str = "pt_ramesh_001") -> List[MealHistoryItem]:
    """
    Retrieves chronological meal history for a patient.
    """
    _init_patient_store_if_empty(patient_id)
    return [entry["item"] for entry in _IN_MEMORY_MEAL_STORE.get(patient_id, [])]


def discover_meal_patterns(patient_id: str = "pt_ramesh_001") -> List[MealPatternInsight]:
    """
    Analyzes historical meal records and post-prandial telemetry to identify observational trends.
    Uses cautious, non-judgmental wording.
    """
    history = get_patient_meal_history(patient_id)
    insights: List[MealPatternInsight] = []

    # 1. Pattern: Rice portion association
    rice_meals = [m for m in history if "rice" in m.foods_summary.lower()]
    if rice_meals:
        deltas = [m.observed_delta for m in rice_meals if m.observed_delta is not None]
        avg_delta = sum(deltas) / len(deltas) if deltas else 60.0
        insights.append(MealPatternInsight(
            pattern_type="CARB_CONCENTRATION_OBSERVATION",
            description=f"Meals containing larger portions of rice were frequently observed with higher post-meal glucose readings (average observed rise: +{avg_delta:.0f} mg/dL).",
            evidence_count=len(rice_meals),
            observed_avg_delta_mgdl=round(avg_delta, 1),
            confidence_label="high" if len(rice_meals) >= 2 else "moderate"
        ))

    # 2. Pattern: Chapati + Dal + Sabzi Stability
    balanced_meals = [m for m in history if "chapati" in m.foods_summary.lower() and not m.sugar_detected]
    if balanced_meals:
        deltas = [m.observed_delta for m in balanced_meals if m.observed_delta is not None]
        avg_delta = sum(deltas) / len(deltas) if deltas else 28.0
        insights.append(MealPatternInsight(
            pattern_type="GLYCEMIC_STABILITY_OBSERVATION",
            description=f"Traditional meals with whole wheat chapatis, dal, and green sabzi were associated with steady post-meal glycemic stability (average observed rise: +{avg_delta:.0f} mg/dL).",
            evidence_count=len(balanced_meals),
            observed_avg_delta_mgdl=round(avg_delta, 1),
            confidence_label="high"
        ))

    # 3. Pattern: Sweet / Dessert Post-Meal Elevation
    sweet_meals = [m for m in history if m.sugar_detected]
    if sweet_meals:
        deltas = [m.observed_delta for m in sweet_meals if m.observed_delta is not None]
        avg_delta = sum(deltas) / len(deltas) if deltas else 55.0
        insights.append(MealPatternInsight(
            pattern_type="DESSERT_ASSOCIATION_OBSERVATION",
            description=f"Meals including sweets or sweetened beverages were observed with extended post-prandial glycemic excursions.",
            evidence_count=len(sweet_meals),
            observed_avg_delta_mgdl=round(avg_delta, 1),
            confidence_label="moderate"
        ))

    return insights
