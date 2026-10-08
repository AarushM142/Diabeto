"""
Diabeto Platform — Indian Meal Intelligence Test Suite
Tests multimodal meal photo analysis, portion and carb estimation, sweet/sugar detection,
post-prandial CGM correlation, elderly personalization, edge cases, and safety guardrails.
"""

import pytest
import asyncio
import base64
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from apps.api.app.main import app
from apps.api.app.modules.meal_intelligence.gemini_vision_service import GeminiMealVisionService
from apps.api.app.modules.meal_intelligence.high_sugar_detector import (
    is_high_sugar_food,
    detect_high_sugar_items,
    generate_sugar_warning
)
from apps.api.app.modules.meal_intelligence.personalization_engine import (
    load_seed_patient_profile,
    generate_elderly_meal_explanation
)
from apps.api.app.modules.meal_intelligence.cgm_correlator import (
    correlate_meal_with_cgm,
    simulate_realistic_cgm_response
)
from apps.api.app.modules.meal_intelligence.meal_history_service import (
    record_meal_entry,
    get_patient_meal_history,
    discover_meal_patterns
)
from apps.api.app.modules.meal_intelligence.schemas import (
    GlycemicImpactCategory,
    MealAnalysisResult,
    DetectedFoodItem
)

BANNED_MEDICAL_PATTERNS = [
    "take insulin",
    "inject insulin",
    "units of insulin",
    "increase dose",
    "decrease dose",
    "stop taking metformin",
    "stop medication",
    "prescribe insulin",
    "prescribe metformin",
    "prescribe medication",
    "diagnosed with diabetes"
]


@pytest.fixture
def vision_service():
    return GeminiMealVisionService()


@pytest.fixture
def test_client():
    return TestClient(app)


# ------------------------------------------------------------------------------
# 1. Representative Indian Meal Tests (Test 1 - Test 6)
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_meal_1_chapati_dal_bhindi(vision_service):
    """Test 1: 2 chapatis + dal + bhindi sabzi"""
    res = await vision_service.analyze_meal_image(
        image_input="photo of 2 chapatis with dal tadka and bhindi sabzi",
        patient_id="pt_ramesh_001",
        meal_type="lunch"
    )
    
    assert res.estimated_total_carbs_g >= 40.0 and res.estimated_total_carbs_g <= 65.0
    assert res.carbohydrate_impact in [GlycemicImpactCategory.MEDIUM, GlycemicImpactCategory.LOW]
    assert len(res.high_sugar_items) == 0
    assert res.sugar_warning is None
    assert any("chapati" in f.food.lower() for f in res.foods)
    assert any("dal" in f.food.lower() for f in res.foods)
    assert any("bhindi" in f.food.lower() for f in res.foods)


@pytest.mark.asyncio
async def test_meal_2_rice_rajma_salad(vision_service):
    """Test 2: Rice + rajma + salad"""
    res = await vision_service.analyze_meal_image(
        image_input="plate of steamed rice with rajma curry and cucumber salad",
        patient_id="pt_ramesh_001",
        meal_type="lunch"
    )
    
    assert res.estimated_total_carbs_g >= 60.0
    assert res.carbohydrate_impact in [GlycemicImpactCategory.HIGH, GlycemicImpactCategory.MEDIUM]
    assert any("rice" in f.food.lower() for f in res.foods)
    assert any("rajma" in f.food.lower() for f in res.foods)


@pytest.mark.asyncio
async def test_meal_3_chapati_sabzi_gulab_jamun(vision_service):
    """Test 3: 2 chapatis + sabzi + gulab jamun (High-Sugar Sweet Detection)"""
    res = await vision_service.analyze_meal_image(
        image_input="2 chapatis with mixed sabzi and 1 gulab jamun dessert",
        patient_id="pt_ramesh_001",
        meal_type="dinner"
    )
    
    assert len(res.high_sugar_items) > 0
    assert "Gulab Jamun" in res.high_sugar_items or any("gulab" in s.lower() for s in res.high_sugar_items)
    assert res.sugar_warning is not None
    assert "गोड" in res.sugar_warning or "sweet" in res.sugar_warning.lower() or "मीठी" in res.sugar_warning
    assert res.carbohydrate_impact == GlycemicImpactCategory.HIGH


@pytest.mark.asyncio
async def test_meal_4_poha_tea(vision_service):
    """Test 4: Poha + tea"""
    res = await vision_service.analyze_meal_image(
        image_input="plate of poha with peanuts and a cup of chai tea",
        patient_id="pt_ramesh_001",
        meal_type="breakfast"
    )
    
    assert res.estimated_total_carbs_g >= 35.0
    assert any("poha" in f.food.lower() for f in res.foods)


@pytest.mark.asyncio
async def test_meal_5_dosa_sambar_chutney(vision_service):
    """Test 5: Dosa + sambar + chutney"""
    res = await vision_service.analyze_meal_image(
        image_input="crispy dosa with sambar bowl and coconut chutney",
        patient_id="pt_ramesh_001",
        meal_type="breakfast"
    )
    
    assert any("dosa" in f.food.lower() for f in res.foods)
    assert res.carbohydrate_impact in [GlycemicImpactCategory.MEDIUM, GlycemicImpactCategory.HIGH]


@pytest.mark.asyncio
async def test_meal_6_large_rice_dessert_sweet_beverage(vision_service):
    """Test 6: Large rice portion + dessert + sweet beverage"""
    res = await vision_service.analyze_meal_image(
        image_input="large portion of steamed rice with jalebi dessert and sweet beverage lassi",
        patient_id="pt_ramesh_001",
        meal_type="dinner"
    )
    
    assert res.estimated_total_carbs_g >= 75.0
    assert res.carbohydrate_impact == GlycemicImpactCategory.HIGH
    assert len(res.high_sugar_items) >= 1
    assert res.sugar_warning is not None


# ------------------------------------------------------------------------------
# 2. Edge Cases & Robustness Handling
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_empty_plate_edge_case(vision_service):
    """Verifies that an empty plate does not hallucinate foods and fails safely with low confidence."""
    res = await vision_service.analyze_meal_image(
        image_input="empty plate with nothing on it",
        patient_id="pt_ramesh_001"
    )
    
    assert res.confidence <= 0.3
    assert res.estimated_total_carbs_g == 0.0
    assert "Unknown" in res.foods[0].food or "Empty" in res.foods[0].food


@pytest.mark.asyncio
async def test_blurry_image_edge_case(vision_service):
    """Verifies blurry image handling with low confidence and request for retake."""
    res = await vision_service.analyze_meal_image(
        image_input="blurry dark unfocused photo of food",
        patient_id="pt_ramesh_001"
    )
    
    assert res.confidence <= 0.4
    assert "blurry" in res.notes.lower() or "unclear" in res.foods[0].food.lower()


@pytest.mark.asyncio
async def test_corrupted_or_none_image_bytes(vision_service):
    """Handles None and empty bytes gracefully without crashing."""
    res_none = await vision_service.analyze_meal_image(image_input=None)
    res_empty = await vision_service.analyze_meal_image(image_input=b"")
    
    assert res_none.confidence <= 0.3
    assert res_empty.confidence <= 0.3
    assert res_none.estimated_total_carbs_g == 0.0


@pytest.mark.asyncio
async def test_unassigned_missing_patient_id(vision_service):
    """Handles non-existent or unassigned patient ID gracefully using default context."""
    res = await vision_service.analyze_meal_image(
        image_input="2 chapatis and dal",
        patient_id="pt_non_existent_999"
    )
    
    assert res.patient_id == "pt_non_existent_999"
    assert len(res.foods) > 0
    assert len(res.elderly_explanation) > 0


# ------------------------------------------------------------------------------
# 3. Clinical Safety & Guardrails
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_non_prescription_guardrail(vision_service):
    """Ensures no medical prescription or insulin instructions are ever output."""
    scenarios = [
        "huge sugar cake and 4 gulab jamun with sweet soda",
        "2 chapatis and dal",
        "plain boiled rice and curd"
    ]
    
    for s in scenarios:
        res = await vision_service.analyze_meal_image(image_input=s, patient_id="pt_ramesh_001")
        full_text = f"{res.elderly_explanation} {res.sugar_warning or ''} {res.notes}".lower()
        
        for banned in BANNED_MEDICAL_PATTERNS:
            assert banned not in full_text, f"Banned pattern '{banned}' found in output!"
        
        assert "estimate" in res.safety_disclaimer.lower()


# ------------------------------------------------------------------------------
# 4. Post-Prandial CGM Correlation Tests
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cgm_post_prandial_correlation(vision_service):
    """Verifies that meal analysis is properly correlated with +30, +60, +90, +120 min CGM readings."""
    meal = await vision_service.analyze_meal_image(
        image_input="2 chapatis with dal and sabzi",
        patient_id="pt_ramesh_001",
        meal_type="lunch"
    )
    
    corr = correlate_meal_with_cgm(meal, default_baseline_mgdl=105.0)
    
    assert corr.meal_id == meal.meal_id
    assert corr.glucose_response.baseline_glucose_mgdl == 105.0
    assert corr.glucose_response.t_plus_30m is not None
    assert corr.glucose_response.t_plus_60m is not None
    assert corr.glucose_response.t_plus_90m is not None
    assert corr.glucose_response.t_plus_120m is not None
    assert corr.glucose_response.observed_delta_max_mgdl > 0.0
    assert "observed glucose response" in corr.scientific_disclaimer.lower()


# ------------------------------------------------------------------------------
# 5. Meal History & Observational Pattern Discovery
# ------------------------------------------------------------------------------

def test_meal_history_and_patterns():
    """Tests longitudinal meal record retrieval and observational pattern recognition."""
    history = get_patient_meal_history("pt_ramesh_001")
    assert len(history) >= 3
    
    patterns = discover_meal_patterns("pt_ramesh_001")
    assert len(patterns) >= 2
    
    pattern_types = [p.pattern_type for p in patterns]
    assert "CARB_CONCENTRATION_OBSERVATION" in pattern_types or "GLYCEMIC_STABILITY_OBSERVATION" in pattern_types


# ------------------------------------------------------------------------------
# 6. FastAPI Router Endpoints Verification
# ------------------------------------------------------------------------------

def test_meal_analyze_api_endpoint(test_client):
    """Tests POST /v1/meals/analyze endpoint with JSON payload."""
    payload = {
        "patient_id": "pt_ramesh_001",
        "meal_type": "lunch",
        "notes": "2 chapatis with dal tadka and bhindi sabzi"
    }
    response = test_client.post("/v1/meals/analyze", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "meal_id" in data
    assert data["estimated_total_carbs_g"] > 0
    assert len(data["foods"]) > 0
    assert "elderly_explanation" in data


def test_meal_history_api_endpoint(test_client):
    """Tests GET /v1/meals/history/pt_ramesh_001 endpoint."""
    response = test_client.get("/v1/meals/history/pt_ramesh_001")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_meal_patterns_api_endpoint(test_client):
    """Tests GET /v1/meals/patterns/pt_ramesh_001 endpoint."""
    response = test_client.get("/v1/meals/patterns/pt_ramesh_001")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
