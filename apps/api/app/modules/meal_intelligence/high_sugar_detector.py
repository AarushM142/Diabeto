"""
Diabeto Platform — High-Sugar & Dessert Detector
Identifies sweets, mithai, desserts, and sweetened beverages in Indian meals,
and generates respectful, elderly-friendly notifications without prescribing medication.
"""

from typing import List, Tuple, Optional

KNOWN_HIGH_SUGAR_INDIAN_ITEMS = [
    "gulab jamun",
    "jalebi",
    "kheer",
    "ladoo",
    "laddu",
    "motichoor",
    "halwa",
    "gajar halwa",
    "moong dal halwa",
    "sooji halwa",
    "rasgulla",
    "rasmalai",
    "barfi",
    "burfi",
    "kaju katli",
    "mysore pak",
    "soan papdi",
    "peda",
    "shrikhand",
    "basundi",
    "sandesh",
    "modak",
    "sweet lassi",
    "chai with sugar",
    "sweet tea",
    "sugared coffee",
    "mithai",
    "ice cream",
    "kulfi",
    "falooda",
    "pastry",
    "cake",
    "sweet beverage",
    "sugar syrup",
    "soda",
    "soft drink",
    "payasam"
]


def is_high_sugar_food(food_name: str) -> bool:
    """
    Checks if a detected food item corresponds to a known high-sugar Indian sweet/dessert.
    """
    if not food_name or not isinstance(food_name, str):
        return False
    name_lower = food_name.strip().lower()
    for item in KNOWN_HIGH_SUGAR_INDIAN_ITEMS:
        if item in name_lower or name_lower in item:
            return True
    return False


def detect_high_sugar_items(foods: List[dict]) -> List[str]:
    """
    Extracts all high-sugar items detected in a meal.
    """
    detected_sweets = []
    for f in foods:
        name = f.get("food", "") if isinstance(f, dict) else getattr(f, "food", "")
        is_sugar = f.get("is_high_sugar", False) if isinstance(f, dict) else getattr(f, "is_high_sugar", False)
        if is_sugar or is_high_sugar_food(name):
            if name and name not in detected_sweets:
                detected_sweets.append(name)
    return detected_sweets


def generate_sugar_warning(high_sugar_items: List[str], language: str = "en") -> Optional[str]:
    """
    Generates a gentle, elderly-friendly sugar advisory in the patient's preferred language.
    Does NOT prescribe medication or insulin changes.
    """
    if not high_sugar_items:
        return None

    items_str = ", ".join(high_sugar_items)

    if language == "hi":
        return f"भोजन में मीठी वस्तु ({items_str}) देखी गई है। इससे भोजन के बाद रक्त शर्करा में अधिक वृद्धि हो सकती है। कृपया पर्याप्त पानी पिएं और सहज रहें।"
    elif language == "mr":
        return f"जेवणात गोड पदार्थ ({items_str}) आढळला आहे. यामुळे जेवणानंतर रक्तातील साखरेची पातळी अधिक वाढू शकते. भरपूर पाणी प्या आणि हलके चालणे ठेवा."
    else: # en
        return f"Sweet food detected ({items_str}). This meal may cause a larger glucose rise. Enjoy mindfully and stay well hydrated."
