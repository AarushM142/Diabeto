"""
Diabeto Platform — Indian Meal Personalization Engine
Customizes tone, explanations, language, and clinical context based on patient profile,
age, target thresholds, and scheduled medication timing.
"""

import json
import os
from typing import Dict, Any, Optional
from apps.api.app.modules.meal_intelligence.schemas import GlycemicImpactCategory


def load_seed_patient_profile(patient_id: str = "pt_ramesh_001") -> Dict[str, Any]:
    """
    Loads patient data from seed_patients.json (or fallback default).
    """
    paths_to_check = [
        "seed_patients.json",
        "data/seed_patients.json",
        "../seed_patients.json"
    ]
    for p in paths_to_check:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for patient in data:
                        if patient.get("patient_id") == patient_id or patient.get("id") == patient_id:
                            return patient
            except Exception:
                pass

    # Default profile fallback
    return {
        "patient_id": patient_id or "pt_ramesh_001",
        "name": "Ramesh Kulkarni",
        "age": 68,
        "language": "mr",
        "thresholds": {"low": 80.0, "high": 180.0, "critical_high": 250.0},
        "medications": [
            {"drug_name": "Metformin", "dosage": "500mg", "instructions": "After dinner", "scheduled_time": "20:30"}
        ]
    }


def generate_elderly_meal_explanation(
    patient_profile: Dict[str, Any],
    meal_type: str,
    total_carbs_g: float,
    impact: GlycemicImpactCategory,
    foods_summary: str,
    has_sweets: bool
) -> str:
    """
    Produces a polite, 2-sentence explanation tailored to an elderly Indian patient
    in their preferred language (Hindi, Marathi, or English).
    """
    lang = (patient_profile.get("language") or "hi").lower()
    name = patient_profile.get("name", "ji")
    first_name = name.split()[0] if name else "ji"
    age = patient_profile.get("age", 65)

    # 1. English
    if lang == "en":
        if impact == GlycemicImpactCategory.HIGH:
            text = (
                f"Namaste {first_name} ji! Your {meal_type} with {foods_summary} has an estimated {total_carbs_g:.0f}g of carbohydrates with a higher glycemic impact. "
                f"Drinking a glass of warm water and taking a gentle 10-minute stroll will help maintain steady energy."
            )
        elif impact == GlycemicImpactCategory.MEDIUM:
            text = (
                f"Namaste {first_name} ji! Your {meal_type} has an estimated {total_carbs_g:.0f}g of carbohydrates with a balanced glycemic impact. "
                f"Enjoy your wholesome meal and remember to log your routine post-meal glucose later."
            )
        else:
            text = (
                f"Namaste {first_name} ji! Your {meal_type} is light and nutritious with an estimated {total_carbs_g:.0f}g of carbohydrates. "
                f"This provides steady, sustained energy for your daily activities."
            )

    # 2. Marathi
    elif lang == "mr":
        if impact == GlycemicImpactCategory.HIGH:
            text = (
                f"नमस्ते {first_name} काका! तुमच्या {meal_type} मधील {foods_summary} मध्ये अंदाजे {total_carbs_g:.0f}g कर्बोदके (carbs) असून रक्तातील साखरेवर मध्यम ते उच्च परिणाम होऊ शकतो. "
                f"जेवणानंतर भरपूर पाणी प्या आणि १० मिनिटे घरातच हळूहळू फिरा."
            )
        elif impact == GlycemicImpactCategory.MEDIUM:
            text = (
                f"नमस्ते {first_name} काका! तुमच्या {meal_type} मधील आहारातून अंदाजे {total_carbs_g:.0f}g कर्बोदके मिळतील, जो एक संतुलित आहार आहे. "
                f"नेहमीप्रमाणे वेळेवर औषधे घेऊन हलकी विश्रांती घ्या."
            )
        else:
            text = (
                f"नमस्ते {first_name} काका! तुमचा हा {meal_type} अतिशय हलका व पौष्टिक आहे (अंदाजे {total_carbs_g:.0f}g carbs). "
                f"यामुळे रक्तातील साखर स्थिर राहण्यास मदत होईल."
            )

    # 3. Hindi (Default)
    else:
        if impact == GlycemicImpactCategory.HIGH:
            text = (
                f"नमस्ते {first_name} जी! आपके {meal_type} में {foods_summary} से लगभग {total_carbs_g:.0f} ग्राम कार्बोहाइड्रेट का अनुमान है, जिससे शुगर में हल्की वृद्धि हो सकती है। "
                f"भोजन के बाद 10 मिनट की हल्की वॉक और पर्याप्त पानी पीना स्वास्थ्य के लिए लाभकारी रहेगा।"
            )
        elif impact == GlycemicImpactCategory.MEDIUM:
            text = (
                f"नमस्ते {first_name} जी! आपका {meal_type} एक संतुलित भोजन है जिसमें लगभग {total_carbs_g:.0f} ग्राम कार्बोहाइड्रेट शामिल हैं। "
                f"समय पर भोजन करने के लिए बहुत बढ़िया, अपने नियमित दिनचर्या का पालन करते रहें।"
            )
        else:
            text = (
                f"नमस्ते {first_name} जी! आपका यह {meal_type} बहुत हल्का और पौष्टिक है (लगभग {total_carbs_g:.0f} ग्राम कार्बोहाइड्रेट)। "
                f"यह आपके दिनभर की ऊर्जा को संतुलित और स्थिर बनाए रखेगा।"
            )

    return text
