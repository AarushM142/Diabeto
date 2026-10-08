"""
Diabeto — Quick Meal Image Upload & Test Script
Usage:
    python scripts/test_meal_image_upload.py [path_to_image.jpg] [patient_id]
"""

import sys
import os
import json
import asyncio

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Ensure project root is in path
sys.path.insert(0, os.path.abspath("."))

from apps.api.app.modules.meal_intelligence.gemini_vision_service import GeminiMealVisionService
from apps.api.app.modules.meal_intelligence.cgm_correlator import correlate_meal_with_cgm
from apps.api.app.modules.meal_intelligence.meal_history_service import record_meal_entry, discover_meal_patterns


async def test_image_analysis(image_path: str = None, patient_id: str = "pt_ramesh_001"):
    print("=" * 70)
    print("🍽️  DIABETO INDIAN MEAL INTELLIGENCE — IMAGE TEST RUNNER")
    print("=" * 70)

    service = GeminiMealVisionService()

    if image_path and os.path.exists(image_path):
        print(f"📸 Ingesting local image file: {image_path}")
        image_input = image_path
    elif image_path:
        print(f"📝 Using text context hint: '{image_path}'")
        image_input = image_path
    else:
        print("📸 No image file provided. Running sample Indian meal plate:")
        print("   -> 2 Chapatis + Dal Tadka + Bhindi Sabzi + 1 Gulab Jamun")
        image_input = "2 chapatis with dal tadka, bhindi sabzi and 1 gulab jamun"

    print(f"👤 Patient Context: {patient_id}")
    print("\n🔍 Analyzing with Google Gemini Vision...")
    
    analysis = await service.analyze_meal_image(
        image_input=image_input,
        patient_id=patient_id
    )

    print("\n" + "=" * 70)
    print("📊 MEAL ANALYSIS RESULT")
    print("=" * 70)
    print(f"• Meal Type:           {analysis.meal_type.title()}")
    print(f"• Total Carbs:         ~{analysis.estimated_total_carbs_g:.0f} grams")
    print(f"• Glycemic Impact:     {analysis.carbohydrate_impact.value}")
    print(f"• Vision Confidence:   {analysis.confidence * 100:.0f}%")
    
    print("\n🍲 DETECTED FOOD ITEMS:")
    for i, food in enumerate(analysis.foods, 1):
        sugar_tag = " [SWEET/DESSERT]" if food.is_high_sugar else ""
        print(f"  {i}. {food.food:<20} | Portion: {food.estimated_portion:<18} | Carbs: {food.estimated_carbs_g}g ({food.carbs_range_g}){sugar_tag}")

    if analysis.high_sugar_items:
        print(f"\n⚠️ HIGH-SUGAR ITEMS DETECTED: {', '.join(analysis.high_sugar_items)}")
        if analysis.sugar_warning:
            print(f"  {analysis.sugar_warning}")

    print("\n👴 ELDERLY-FRIENDLY EXPLANATION:")
    print(f"  \"{analysis.elderly_explanation}\"")

    # Post-prandial CGM correlation
    print("\n" + "=" * 70)
    print("📈 POST-PRANDIAL CGM CORRELATION (+2 HOUR WINDOW)")
    print("=" * 70)
    cgm_corr = correlate_meal_with_cgm(analysis, default_baseline_mgdl=108.0)
    g = cgm_corr.glucose_response
    print(f"• Baseline Glucose:    {g.baseline_glucose_mgdl:.0f} mg/dL")
    print(f"• +30 min Glucose:     {g.t_plus_30m:.0f} mg/dL")
    print(f"• +60 min Glucose:     {g.t_plus_60m:.0f} mg/dL (Peak: {g.observed_peak_mgdl:.0f} mg/dL)")
    print(f"• +90 min Glucose:     {g.t_plus_90m:.0f} mg/dL")
    print(f"• +120 min Glucose:    {g.t_plus_120m:.0f} mg/dL")
    print(f"• Max Observed Delta:  +{g.observed_delta_max_mgdl:.0f} mg/dL from baseline")
    print(f"• Response Note:       {cgm_corr.observed_pattern_note}")

    # Record and show longitudinal patterns
    record_meal_entry(analysis, cgm_corr)
    patterns = discover_meal_patterns(patient_id)
    print("\n" + "=" * 70)
    print("🔍 DISCOVERED DIETARY PATTERNS")
    print("=" * 70)
    for p in patterns:
        print(f"• [{p.confidence_label.upper()} CONFIDENCE] {p.description}")

    print("\n" + "=" * 70)
    print("🛡️  SAFETY & DISCLAIMER:")
    print(f"  {analysis.safety_disclaimer}")
    print("=" * 70)


if __name__ == "__main__":
    img_arg = sys.argv[1] if len(sys.argv) > 1 else None
    patient_arg = sys.argv[2] if len(sys.argv) > 2 else "pt_ramesh_001"
    asyncio.run(test_image_analysis(img_arg, patient_arg))
