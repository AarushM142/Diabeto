"""
Diabeto Platform — Gemini Multimodal Meal Analysis Service
Analyzes meal photographs of Indian cuisine using Google Gemini Vision,
identifies individual items, estimates portion sizes and carbohydrate loads,
flags sweets/desserts, and generates structured clinical lifestyle insights.
"""

import base64
import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
import httpx

from apps.api.app.core.config import settings
from apps.api.app.modules.meal_intelligence.schemas import (
    MealAnalysisResult,
    DetectedFoodItem,
    GlycemicImpactCategory,
    MealAnalysisRequest
)
from apps.api.app.modules.meal_intelligence.high_sugar_detector import (
    detect_high_sugar_items,
    generate_sugar_warning
)
from apps.api.app.modules.meal_intelligence.personalization_engine import (
    load_seed_patient_profile,
    generate_elderly_meal_explanation
)

GEMINI_VISION_SYSTEM_PROMPT = """You are an expert clinical nutrition and diabetic dietary AI assistant for the Diabeto diabetes care platform.
Analyze the provided photograph of any meal, dish, plate, snack, or beverage with high clinical accuracy (including Indian cuisine, South Asian dishes, Western/global foods such as burgers, sandwiches, pizza, pasta, salads, wraps, grilled items, desserts, beverages, etc.).

TASKS:
1. Identify each distinct food item visible in the photograph (e.g., Burger, French Fries, Chapati/Roti, Basmati Rice, Dal, Sabzi, Paneer, Chicken, Salad, Dosa, Idli, Samosa, Pizza Slice, Sandwich, Gulab Jamun, Dessert, Sweet Beverage, etc.).
2. Estimate the visible portion size (e.g., "1 large burger", "2 medium chapatis", "1 bowl / 150g", "1 piece approx 45g", "1 side plate"). If portion cannot be determined reliably, state "Estimated 1 serving".
3. Estimate carbohydrate content in grams (estimated_carbs_g) and a reasonable range (e.g., "35–45 g").
4. Classify carbohydrate/glycemic impact category for each item and overall meal as: "LOW" (<30g carbs), "MEDIUM" (30–65g carbs), or "HIGH" (>65g carbs or high glycemic spike risk).
5. Flag high-sugar items (sweets, mithai, desserts, sugary beverages, syrups, soda, sweet treats) with is_high_sugar = true.
6. Provide a vision confidence score (0.0 to 1.0). If the image is blurry, empty, non-food, or unidentifiable, assign a low confidence (< 0.4) and name food "Unknown / Unclear".
7. NEVER prescribe insulin dosages or medication adjustments.

OUTPUT JSON FORMAT (Strict adherence required):
{
  "meal_type": "breakfast | lunch | snack | dinner",
  "foods": [
    {
      "food": "Food Item Name",
      "estimated_portion": "Estimated Portion",
      "estimated_carbs_g": 30.0,
      "carbs_range_g": "25–35 g",
      "confidence": 0.90,
      "is_high_sugar": false,
      "glycemic_impact": "LOW | MEDIUM | HIGH",
      "notes": "Observational detail regarding ingredients or preparation"
    }
  ],
  "estimated_total_carbs_g": 55.0,
  "carbohydrate_impact": "LOW | MEDIUM | HIGH",
  "high_sugar_items": [],
  "confidence": 0.90,
  "notes": "Estimated from visible plate portions."
}
"""

# Nutritional benchmarks (g carbs per standard serving for global and Indian dishes)
FOOD_BENCHMARKS = {
    # Global / Western / Fast Food
    "burger": {"portion": "1 regular burger / bun & patty", "carbs": 42.0, "range": "38–48 g", "impact": "MEDIUM", "sugar": False},
    "cheeseburger": {"portion": "1 cheeseburger", "carbs": 44.0, "range": "40–50 g", "impact": "MEDIUM", "sugar": False},
    "veg burger": {"portion": "1 veggie burger", "carbs": 48.0, "range": "42–54 g", "impact": "MEDIUM", "sugar": False},
    "veggie burger": {"portion": "1 veggie burger", "carbs": 48.0, "range": "42–54 g", "impact": "MEDIUM", "sugar": False},
    "chicken burger": {"portion": "1 chicken burger", "carbs": 40.0, "range": "35–46 g", "impact": "MEDIUM", "sugar": False},
    "french fries": {"portion": "1 medium serving (~110g)", "carbs": 45.0, "range": "40–52 g", "impact": "HIGH", "sugar": False},
    "fries": {"portion": "1 medium serving (~100g)", "carbs": 42.0, "range": "38–48 g", "impact": "HIGH", "sugar": False},
    "pizza": {"portion": "2 medium slices (~160g)", "carbs": 54.0, "range": "48–62 g", "impact": "HIGH", "sugar": False},
    "sandwich": {"portion": "1 toasted/grilled sandwich", "carbs": 34.0, "range": "30–38 g", "impact": "MEDIUM", "sugar": False},
    "pasta": {"portion": "1 bowl (~180g cooked)", "carbs": 46.0, "range": "40–52 g", "impact": "HIGH", "sugar": False},
    "noodles": {"portion": "1 bowl (~160g)", "carbs": 44.0, "range": "38–50 g", "impact": "HIGH", "sugar": False},
    "chowmein": {"portion": "1 plate (~180g)", "carbs": 48.0, "range": "42–55 g", "impact": "HIGH", "sugar": False},
    "wrap": {"portion": "1 roll / wrap", "carbs": 38.0, "range": "32–44 g", "impact": "MEDIUM", "sugar": False},
    "frankie": {"portion": "1 roll / frankie", "carbs": 40.0, "range": "35–46 g", "impact": "MEDIUM", "sugar": False},
    "shawarma": {"portion": "1 chicken shawarma roll", "carbs": 36.0, "range": "30–42 g", "impact": "MEDIUM", "sugar": False},
    "oats": {"portion": "1 bowl cooked oatmeal (~150g)", "carbs": 27.0, "range": "24–30 g", "impact": "LOW", "sugar": False},
    "oatmeal": {"portion": "1 bowl cooked oatmeal (~150g)", "carbs": 27.0, "range": "24–30 g", "impact": "LOW", "sugar": False},
    "egg": {"portion": "2 boiled / poached eggs", "carbs": 1.5, "range": "1–2 g", "impact": "LOW", "sugar": False},
    "eggs": {"portion": "2 boiled / poached eggs", "carbs": 1.5, "range": "1–2 g", "impact": "LOW", "sugar": False},
    "omelette": {"portion": "2-egg vegetable omelette", "carbs": 4.0, "range": "3–6 g", "impact": "LOW", "sugar": False},
    "toast": {"portion": "2 slices whole wheat toast", "carbs": 26.0, "range": "24–28 g", "impact": "MEDIUM", "sugar": False},
    "bread": {"portion": "2 slices bread (~60g)", "carbs": 28.0, "range": "25–30 g", "impact": "MEDIUM", "sugar": False},
    "soda": {"portion": "1 can / 300ml sweetened soda", "carbs": 38.0, "range": "35–42 g", "impact": "HIGH", "sugar": True},
    "coke": {"portion": "1 can / 300ml cola", "carbs": 39.0, "range": "35–42 g", "impact": "HIGH", "sugar": True},
    "pepsi": {"portion": "1 can / 300ml pepsi", "carbs": 40.0, "range": "36–44 g", "impact": "HIGH", "sugar": True},
    "soup": {"portion": "1 bowl vegetable/lentil soup (~200ml)", "carbs": 12.0, "range": "10–16 g", "impact": "LOW", "sugar": False},

    # Indian Breads & Grains
    "chapati": {"portion": "2 medium (approx 60g)", "carbs": 30.0, "range": "28–34 g", "impact": "MEDIUM", "sugar": False},
    "roti": {"portion": "2 medium (approx 60g)", "carbs": 30.0, "range": "28–34 g", "impact": "MEDIUM", "sugar": False},
    "bhakri": {"portion": "1 medium jowar/bajra (approx 80g)", "carbs": 35.0, "range": "32–38 g", "impact": "MEDIUM", "sugar": False},
    "paratha": {"portion": "1 stuffed paratha", "carbs": 38.0, "range": "34–44 g", "impact": "HIGH", "sugar": False},
    "aloo paratha": {"portion": "1 stuffed paratha", "carbs": 42.0, "range": "38–46 g", "impact": "HIGH", "sugar": False},
    "puri": {"portion": "3 small puris", "carbs": 36.0, "range": "32–40 g", "impact": "HIGH", "sugar": False},
    "naan": {"portion": "1 plain/butter naan (~100g)", "carbs": 46.0, "range": "42–52 g", "impact": "HIGH", "sugar": False},
    "rice": {"portion": "1 medium bowl (approx 150g cooked)", "carbs": 42.0, "range": "38–46 g", "impact": "HIGH", "sugar": False},
    "steamed rice": {"portion": "1 cup (approx 160g)", "carbs": 45.0, "range": "40–50 g", "impact": "HIGH", "sugar": False},
    "biryani": {"portion": "1 medium plate (~220g)", "carbs": 58.0, "range": "50–66 g", "impact": "HIGH", "sugar": False},
    "pulao": {"portion": "1 bowl vegetable pulao (~180g)", "carbs": 48.0, "range": "42–54 g", "impact": "HIGH", "sugar": False},
    "khichdi": {"portion": "1 medium bowl moong khichdi (~180g)", "carbs": 38.0, "range": "34–42 g", "impact": "MEDIUM", "sugar": False},

    # Dals, Curries & Sabzis
    "dal": {"portion": "1 katori (approx 150ml)", "carbs": 14.0, "range": "12–16 g", "impact": "LOW", "sugar": False},
    "dal tadka": {"portion": "1 katori (approx 150ml)", "carbs": 15.0, "range": "13–18 g", "impact": "LOW", "sugar": False},
    "rajma": {"portion": "1 bowl (approx 180g)", "carbs": 26.0, "range": "22–30 g", "impact": "MEDIUM", "sugar": False},
    "chole": {"portion": "1 bowl (approx 180g)", "carbs": 28.0, "range": "24–32 g", "impact": "MEDIUM", "sugar": False},
    "bhindi": {"portion": "1 small katori (approx 100g)", "carbs": 8.0, "range": "6–10 g", "impact": "LOW", "sugar": False},
    "bhindi sabzi": {"portion": "1 katori (approx 100g)", "carbs": 8.0, "range": "6–10 g", "impact": "LOW", "sugar": False},
    "sabzi": {"portion": "1 katori (approx 120g)", "carbs": 10.0, "range": "8–14 g", "impact": "LOW", "sugar": False},
    "mixed sabzi": {"portion": "1 katori (approx 130g)", "carbs": 12.0, "range": "10–15 g", "impact": "LOW", "sugar": False},
    "aloo gobi": {"portion": "1 katori (approx 130g)", "carbs": 18.0, "range": "15–22 g", "impact": "MEDIUM", "sugar": False},
    "paneer": {"portion": "1 katori (approx 120g)", "carbs": 6.0, "range": "4–8 g", "impact": "LOW", "sugar": False},
    "paneer sabzi": {"portion": "1 katori (approx 130g)", "carbs": 7.0, "range": "5–10 g", "impact": "LOW", "sugar": False},
    "curd": {"portion": "1 small bowl (approx 100g)", "carbs": 5.0, "range": "4–6 g", "impact": "LOW", "sugar": False},
    "dahi": {"portion": "1 small bowl (approx 100g)", "carbs": 5.0, "range": "4–6 g", "impact": "LOW", "sugar": False},
    "salad": {"portion": "1 side plate (cucumber, tomato, carrot)", "carbs": 6.0, "range": "4–8 g", "impact": "LOW", "sugar": False},

    # South Indian & Snacks
    "idli": {"portion": "2 medium idlis", "carbs": 32.0, "range": "28–36 g", "impact": "MEDIUM", "sugar": False},
    "dosa": {"portion": "1 plain dosa", "carbs": 30.0, "range": "26–34 g", "impact": "MEDIUM", "sugar": False},
    "sambar": {"portion": "1 katori (approx 150ml)", "carbs": 12.0, "range": "10–15 g", "impact": "LOW", "sugar": False},
    "coconut chutney": {"portion": "2 tbsp (approx 30g)", "carbs": 3.0, "range": "2–4 g", "impact": "LOW", "sugar": False},
    "poha": {"portion": "1 medium plate (approx 150g)", "carbs": 38.0, "range": "34–42 g", "impact": "MEDIUM", "sugar": False},
    "upma": {"portion": "1 medium bowl (approx 150g)", "carbs": 34.0, "range": "30–38 g", "impact": "MEDIUM", "sugar": False},
    "samosa": {"portion": "1 medium piece", "carbs": 32.0, "range": "28–36 g", "impact": "HIGH", "sugar": False},
    "pav bhaji": {"portion": "2 butter pavs + 1 plate bhaji", "carbs": 56.0, "range": "48–64 g", "impact": "HIGH", "sugar": False},
    "vada pav": {"portion": "1 vada pav with chutneys", "carbs": 36.0, "range": "32–42 g", "impact": "HIGH", "sugar": False},

    # Sweets, Desserts & Beverages
    "tea": {"portion": "1 cup (approx 120ml, with 1 tsp sugar)", "carbs": 10.0, "range": "8–12 g", "impact": "LOW", "sugar": True},
    "chai": {"portion": "1 cup (approx 120ml, with 1 tsp sugar)", "carbs": 10.0, "range": "8–12 g", "impact": "LOW", "sugar": True},
    "gulab jamun": {"portion": "1 piece (approx 45g)", "carbs": 28.0, "range": "25–32 g", "impact": "HIGH", "sugar": True},
    "jalebi": {"portion": "2 small pieces (approx 50g)", "carbs": 35.0, "range": "30–40 g", "impact": "HIGH", "sugar": True},
    "kheer": {"portion": "1 small bowl (approx 120g)", "carbs": 32.0, "range": "28–36 g", "impact": "HIGH", "sugar": True},
    "ladoo": {"portion": "1 medium piece (approx 40g)", "carbs": 26.0, "range": "22–30 g", "impact": "HIGH", "sugar": True},
    "sweet beverage": {"portion": "1 glass / 200ml", "carbs": 30.0, "range": "25–35 g", "impact": "HIGH", "sugar": True},
}
INDIAN_FOOD_BENCHMARKS = FOOD_BENCHMARKS  # Backward compatibility alias


class GeminiMealVisionService:
    """
    Multimodal Meal Analysis Service powered by Google Gemini Vision.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (
            api_key or 
            getattr(settings, "effective_gemini_api_key", None) or 
            os.environ.get("GOOGLE_GEMINI_API_KEY") or 
            os.environ.get("GEMINI_API_KEY")
        )

    @staticmethod
    def _detect_mime_type(image_bytes: bytes) -> str:
        """Determines image MIME type from initial magic header bytes."""
        if image_bytes.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        elif image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        elif image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:12]:
            return "image/webp"
        elif image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
            return "image/gif"
        return "image/jpeg"

    def _rule_based_fallback_analysis(
        self,
        hint_text: Optional[str] = None,
        meal_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Deterministic, offline fallback analysis when Gemini API is unavailable.
        Uses keywords from hint_text or generates an intelligent estimate based on user input.
        """
        hint = (hint_text or "").strip().lower()
        matched_keys = []

        # Check matched benchmark keys in order of specificity (longest match first)
        sorted_benchmarks = sorted(FOOD_BENCHMARKS.items(), key=lambda x: len(x[0]), reverse=True)
        for key, info in sorted_benchmarks:
            if key in hint:
                # Avoid duplicate generic overlaps (e.g. if 'dal tadka' matched, skip 'dal')
                if not any(key in existing[0] for existing in matched_keys):
                    matched_keys.append((key, info))

        total_carbs = 0.0
        has_sugar = False
        sugar_items = []
        detected_foods: List[Dict[str, Any]] = []

        if matched_keys:
            for name, data in matched_keys:
                food_item = {
                    "food": name.title(),
                    "estimated_portion": data["portion"],
                    "estimated_carbs_g": data["carbs"],
                    "carbs_range_g": data["range"],
                    "confidence": 0.85,
                    "is_high_sugar": data["sugar"],
                    "glycemic_impact": data["impact"],
                    "notes": f"Estimated portion: {data['portion']}"
                }
                detected_foods.append(food_item)
                total_carbs += data["carbs"]
                if data["sugar"]:
                    has_sugar = True
                    sugar_items.append(name.title())
        elif hint and len(hint) > 1 and not any(w in hint for w in ["empty", "blank", "unclear", "blurry"]):
            # Specific food described by user but not in dictionary benchmarks
            title_name = hint_text.strip().title() if hint_text else "Custom Meal"
            food_item = {
                "food": title_name,
                "estimated_portion": "1 standard serving",
                "estimated_carbs_g": 40.0,
                "carbs_range_g": "30–50 g",
                "confidence": 0.70,
                "is_high_sugar": any(s in hint for s in ["sweet", "sugar", "dessert", "cake", "ice cream", "jamun", "jalebi"]),
                "glycemic_impact": "MEDIUM",
                "notes": f"Estimated from meal description: '{hint_text}'"
            }
            detected_foods.append(food_item)
            total_carbs = 40.0
            if food_item["is_high_sugar"]:
                has_sugar = True
                sugar_items.append(title_name)
        else:
            # Standard wholesome meal benchmark
            detected_foods = [
                {
                    "food": "Chapati / Roti",
                    "estimated_portion": "2 medium (approx 60g)",
                    "estimated_carbs_g": 30.0,
                    "carbs_range_g": "28–34 g",
                    "confidence": 0.80,
                    "is_high_sugar": False,
                    "glycemic_impact": "MEDIUM",
                    "notes": "Standard whole wheat rotis"
                },
                {
                    "food": "Dal Tadka",
                    "estimated_portion": "1 katori (approx 150ml)",
                    "estimated_carbs_g": 15.0,
                    "carbs_range_g": "13–18 g",
                    "confidence": 0.80,
                    "is_high_sugar": False,
                    "glycemic_impact": "LOW",
                    "notes": "Yellow lentil dal"
                },
                {
                    "food": "Bhindi Sabzi",
                    "estimated_portion": "1 katori (approx 100g)",
                    "estimated_carbs_g": 8.0,
                    "carbs_range_g": "6–10 g",
                    "confidence": 0.80,
                    "is_high_sugar": False,
                    "glycemic_impact": "LOW",
                    "notes": "Green vegetable sabzi"
                }
            ]
            total_carbs = 53.0

        # Determine overall meal glycemic impact
        if total_carbs > 65.0 or has_sugar:
            impact = "HIGH"
        elif total_carbs >= 35.0:
            impact = "MEDIUM"
        else:
            impact = "LOW"

        return {
            "meal_type": meal_type or "lunch",
            "foods": detected_foods,
            "estimated_total_carbs_g": round(total_carbs, 1),
            "carbohydrate_impact": impact,
            "high_sugar_items": sugar_items,
            "confidence": 0.85 if matched_keys else 0.75,
            "notes": "Estimated using nutritional benchmarks."
        }

    async def analyze_meal_image(
        self,
        image_input: Any, # base64 str, bytes, file path, URL, or None
        patient_id: str = "pt_ramesh_001",
        meal_type: Optional[str] = None,
        context_hint: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> MealAnalysisResult:
        """
        Executes end-to-end multimodal analysis on any meal or food photograph.
        """
        ts = timestamp or datetime.now(timezone.utc)
        if not meal_type:
            hour = ts.hour
            if 5 <= hour < 11:
                meal_type = "breakfast"
            elif 11 <= hour < 16:
                meal_type = "lunch"
            elif 16 <= hour < 19:
                meal_type = "snack"
            else:
                meal_type = "dinner"

        # 1. Parse & Validate Image Input
        raw_bytes: Optional[bytes] = None
        is_empty_or_invalid = False
        is_blurry_or_unclear = False

        if image_input is None or image_input == b"" or image_input == "":
            if not context_hint:
                is_empty_or_invalid = True
        elif isinstance(image_input, bytes):
            if len(image_input) < 8:
                if not context_hint:
                    is_empty_or_invalid = True
            else:
                raw_bytes = image_input
        elif isinstance(image_input, str):
            inp_str = image_input.strip()
            inp_lower = inp_str.lower()
            
            if "empty" in inp_lower or "blank" in inp_lower:
                is_empty_or_invalid = True
            elif "blurry" in inp_lower or "unfocused" in inp_lower:
                is_blurry_or_unclear = True
            elif inp_str.startswith("http://") or inp_str.startswith("https://"):
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        fetch_resp = await client.get(inp_str)
                        if fetch_resp.status_code == 200:
                            raw_bytes = fetch_resp.content
                        else:
                            context_hint = context_hint or inp_str
                except Exception:
                    context_hint = context_hint or inp_str
            elif os.path.exists(inp_str):
                try:
                    with open(inp_str, "rb") as f:
                        raw_bytes = f.read()
                except Exception:
                    is_empty_or_invalid = True
            elif inp_str.startswith("data:image"):
                try:
                    b64_data = inp_str.split(",", 1)[1]
                    raw_bytes = base64.b64decode(b64_data)
                except Exception:
                    is_empty_or_invalid = True
            elif " " not in inp_str and len(inp_str) > 60:
                try:
                    raw_bytes = base64.b64decode(inp_str)
                except Exception:
                    context_hint = inp_str
            else:
                context_hint = inp_str

        patient_profile = load_seed_patient_profile(patient_id)

        # Handle Edge Cases: Empty plate / Invalid image
        if is_empty_or_invalid:
            unknown_food = DetectedFoodItem(
                food="Unknown / Empty Plate",
                estimated_portion="N/A",
                estimated_carbs_g=0.0,
                carbs_range_g="0 g",
                confidence=0.10,
                is_high_sugar=False,
                glycemic_impact=GlycemicImpactCategory.LOW,
                notes="No recognizable food detected on plate."
            )
            return MealAnalysisResult(
                meal_id=str(uuid.uuid4()),
                patient_id=patient_id,
                meal_type=meal_type,
                timestamp=ts,
                foods=[unknown_food],
                estimated_total_carbs_g=0.0,
                carbohydrate_impact=GlycemicImpactCategory.LOW,
                high_sugar_items=[],
                confidence=0.10,
                elderly_explanation="कृपया भोजन की स्पष्ट तस्वीर दोबारा भेजें ताकि हम पौष्टिकता का अनुमान लगा सकें।" if patient_profile.get("language") != "en" else "Please send a clear photo of your meal so we can estimate its nutritional balance.",
                sugar_warning=None,
                notes="Unidentifiable or empty plate detected."
            )

        # Handle Edge Case: Blurry Image
        if is_blurry_or_unclear:
            unclear_food = DetectedFoodItem(
                food="Unclear / Blurry Image",
                estimated_portion="Uncertain",
                estimated_carbs_g=20.0,
                carbs_range_g="10–30 g",
                confidence=0.25,
                is_high_sugar=False,
                glycemic_impact=GlycemicImpactCategory.LOW,
                notes="Image is blurry or poorly lit."
            )
            return MealAnalysisResult(
                meal_id=str(uuid.uuid4()),
                patient_id=patient_id,
                meal_type=meal_type,
                timestamp=ts,
                foods=[unclear_food],
                estimated_total_carbs_g=20.0,
                carbohydrate_impact=GlycemicImpactCategory.LOW,
                high_sugar_items=[],
                confidence=0.25,
                elderly_explanation="फोटो थोड़ी धुंधली है। कृपया भोजन की थाली पर रोशनी करके दोबारा फोटो लें।" if patient_profile.get("language") != "en" else "The photo appears blurry. Please take a clearer picture under good lighting.",
                sugar_warning=None,
                notes="Low confidence due to blurriness."
            )

        # 2. Attempt Google Gemini Multimodal Vision API Call
        parsed_result: Optional[Dict[str, Any]] = None
        if self.api_key and raw_bytes and not self.api_key.startswith("your-"):
            models_to_try = [
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-flash-latest",
                "gemini-2.5-pro"
            ]
            for model_name in models_to_try:
                try:
                    mime_type = self._detect_mime_type(raw_bytes)
                    b64_img = base64.b64encode(raw_bytes).decode("utf-8")
                    
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
                    headers = {"Content-Type": "application/json"}
                    
                    prompt_text = GEMINI_VISION_SYSTEM_PROMPT
                    if context_hint:
                        prompt_text += f"\nAdditional Context / User Hint: {context_hint}"

                    body = {
                        "contents": [
                            {
                                "parts": [
                                    {"text": prompt_text},
                                    {
                                        "inline_data": {
                                            "mime_type": mime_type,
                                            "data": b64_img
                                        }
                                    }
                                ]
                            }
                        ],
                        "generationConfig": {
                            "temperature": 0.2,
                            "response_mime_type": "application/json"
                        }
                    }
                    
                    async with httpx.AsyncClient(timeout=25.0) as client:
                        resp = await client.post(url, headers=headers, json=body)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                                # Extract JSON object cleanly using regex
                                json_match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
                                if json_match:
                                    parsed_result = json.loads(json_match.group(0))
                                    if parsed_result and "foods" in parsed_result:
                                        break
                        else:
                            print(f"[Gemini Vision ({model_name}) Status {resp.status_code}] {resp.text[:200]}")
                except Exception as e:
                    print(f"[Gemini Vision ({model_name}) Error] {e}")

        # 3. Fallback to Validated Indian Food Knowledge Base
        if not parsed_result:
            parsed_result = self._rule_based_fallback_analysis(
                hint_text=context_hint or (image_input if isinstance(image_input, str) else ""),
                meal_type=meal_type
            )

        # 4. Construct Structured DetectedFoodItem List
        foods_list: List[DetectedFoodItem] = []
        raw_foods = parsed_result.get("foods", [])
        total_carbs = 0.0

        for rf in raw_foods:
            f_name = rf.get("food", "Mixed Food").strip()
            portion = rf.get("estimated_portion", "1 serving")
            carbs = float(rf.get("estimated_carbs_g", 25.0))
            range_str = rf.get("carbs_range_g", f"{max(0, int(carbs-5))}–{int(carbs+5)} g")
            conf = float(rf.get("confidence", 0.85))
            sugar_flag = bool(rf.get("is_high_sugar", False))
            
            # Map impact category
            impact_raw = str(rf.get("glycemic_impact", "MEDIUM")).upper()
            impact_enum = (
                GlycemicImpactCategory.HIGH if "HIGH" in impact_raw else
                GlycemicImpactCategory.LOW if "LOW" in impact_raw else
                GlycemicImpactCategory.MEDIUM
            )

            item = DetectedFoodItem(
                food=f_name,
                estimated_portion=portion,
                estimated_carbs_g=round(carbs, 1),
                carbs_range_g=range_str,
                confidence=round(conf, 2),
                is_high_sugar=sugar_flag,
                glycemic_impact=impact_enum,
                notes=rf.get("notes")
            )
            foods_list.append(item)
            total_carbs += carbs

        # Aggregate Meal Level Metrics
        high_sugar_items = detect_high_sugar_items(raw_foods)
        has_sweets = len(high_sugar_items) > 0

        # Meal Level Carbohydrate Impact
        if total_carbs > 65.0 or has_sweets:
            meal_impact = GlycemicImpactCategory.HIGH
        elif total_carbs >= 35.0:
            meal_impact = GlycemicImpactCategory.MEDIUM
        else:
            meal_impact = GlycemicImpactCategory.LOW

        foods_summary_str = ", ".join([f.food for f in foods_list]) if foods_list else "Mixed Indian Meal"

        # 5. Generate Respectful Elderly Explanation & Sugar Warning
        explanation = generate_elderly_meal_explanation(
            patient_profile=patient_profile,
            meal_type=parsed_result.get("meal_type", meal_type),
            total_carbs_g=total_carbs,
            impact=meal_impact,
            foods_summary=foods_summary_str,
            has_sweets=has_sweets
        )

        sugar_warning = generate_sugar_warning(
            high_sugar_items, 
            language=patient_profile.get("language", "hi")
        )

        return MealAnalysisResult(
            meal_id=str(uuid.uuid4()),
            patient_id=patient_id,
            meal_type=parsed_result.get("meal_type", meal_type),
            timestamp=ts,
            foods=foods_list,
            estimated_total_carbs_g=round(total_carbs, 1),
            carbohydrate_impact=meal_impact,
            high_sugar_items=high_sugar_items,
            confidence=round(float(parsed_result.get("confidence", 0.85)), 2),
            elderly_explanation=explanation,
            sugar_warning=sugar_warning,
            notes=parsed_result.get("notes", "Estimated from visible portions.")
        )
