import re
from typing import Optional, Tuple
from dataclasses import dataclass

DEVANAGARI_DIGITS_MAP = {
    "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
    "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
}

# Common Hindi / Marathi spoken number word mappings
SPOKEN_HINDI_NUMBERS = {
    # Tens and singles
    "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80, "नब्बे": 90,
    "पिच्यासी": 85, "पच्यासी": 85, "पिचानवे": 95, "पिंचानवे": 95,
    "सौ": 100, "एक सौ": 100, "दो सौ": 200, "तीन सौ": 300,
    # Common glucose ranges
    "एक सौ दस": 110, "एक सौ बीस": 120, "एक सौ पच्चीस": 125,
    "एक सौ तीस": 130, "एक सौ पैंतीस": 135, "एक सौ चालीस": 140,
    "एक सौ पैंतालीस": 145, "एक सौ पचास": 150, "एक सौ बचपन": 155,
    "एक सौ साठ": 160, "एक सौ पैंसठ": 165, "एक सौ सत्तर": 170,
    "एक सौ अस्सी": 180, "एक सौ नब्बे": 190, "दो सौ": 200,
    "दो सौ दस": 210, "दो सौ बीस": 220, "दो सौ तीस": 230,
    "दो सौ पचास": 250, "तीन सौ": 300,
}

SPOKEN_MARATHI_NUMBERS = {
    "पन्नास": 50, "साठ": 60, "सत्तर": 70, "ऐंशी": 80, "नव्वद": 90,
    "शंभर": 100, "एकशे": 100, "एकशे दहा": 110, "एकशे वीस": 120,
    "एकशे तीस": 130, "एकशे चाळीस": 140, "एकशे पन्नास": 150,
    "एकशे साठ": 160, "एकशे सत्तर": 170, "एकशे ऐंशी": 180,
    "एकशे नव्वद": 190, "दोनशे": 200, "दोनशे वीस": 220, "दोनशे पन्नास": 250,
}

SPOKEN_ENGLISH_PATTERNS = [
    (r"\bone\s+hundred\s+and\s+(\d+)\b", lambda m: 100 + int(m.group(1))),
    (r"\bone\s+hundred\s+(\d+)\b", lambda m: 100 + int(m.group(1))),
    (r"\bone\s+twenty\b", lambda m: 120),
    (r"\bone\s+thirty\b", lambda m: 130),
    (r"\bone\s+forty\b", lambda m: 140),
    (r"\bone\s+fifty\b", lambda m: 150),
    (r"\bone\s+sixty\b", lambda m: 160),
    (r"\bone\s+seventy\b", lambda m: 170),
    (r"\bone\s+eighty\b", lambda m: 180),
    (r"\bone\s+ninety\b", lambda m: 190),
    (r"\btwo\s+hundred\s+(\d+)\b", lambda m: 200 + int(m.group(1))),
    (r"\btwo\s+ten\b", lambda m: 210),
    (r"\btwo\s+twenty\b", lambda m: 220),
    (r"\btwo\s+fifty\b", lambda m: 250),
]

@dataclass
class ParsedGlucoseReading:
    value: float
    context: str
    is_valid_range: bool # True if 20 <= value <= 600
    raw_match: str

def convert_devanagari_numerals(text: str) -> str:
    """Converts Devanagari numerals (०-९) to Western digits (0-9)."""
    result = []
    for ch in text:
        result.append(DEVANAGARI_DIGITS_MAP.get(ch, ch))
    return "".join(result)

def infer_reading_context(text: str, default_context: str = "fasting") -> str:
    """Detects meal or time context from keywords in English, Hindi, or Marathi."""
    text_lower = text.lower()
    
    if any(w in text_lower for w in ["fasting", "khali pet", "khali", "bhukhe", "subah", "उपाशी", "खाली पेट", "सकाळी"]):
        return "fasting"
    if any(w in text_lower for w in ["nashta", "breakfast", "नाश्ता"]):
        return "post_breakfast"
    if any(w in text_lower for w in ["lunch", "dopahar", "दुपारी", "दोपहर"]):
        return "post_lunch"
    if any(w in text_lower for w in ["dinner", "raat", "ratrichi", "रात्री"]):
        return "post_dinner"
    if any(w in text_lower for w in ["post meal", "after meal", "khane ke baad", "जेवणानंतर"]):
        return "post_meal"
    if any(w in text_lower for w in ["bedtime", "sone se pehle", "झोपण्यापूर्वी"]):
        return "bedtime"
    
    return default_context

def parse_glucose_reading(text: str) -> Optional[ParsedGlucoseReading]:
    """
    Parses a glucose reading from incoming typed text or speech-to-text transcript.
    Supports Western digits, Devanagari numerals, and spoken number words in hi/mr/en.
    Returns None if no candidate reading is detected.
    """
    if not text or not text.strip():
        return None

    # 1. Convert Devanagari numerals
    normalized_text = convert_devanagari_numerals(text.strip())
    context = infer_reading_context(normalized_text)

    # 2. Check for explicit 2-3 digit numbers
    digits = re.findall(r"\b\d{2,3}\b", normalized_text)
    if digits:
        val = float(digits[0])
        return ParsedGlucoseReading(
            value=val,
            context=context,
            is_valid_range=(20.0 <= val <= 600.0),
            raw_match=digits[0]
        )

    # 3. Check for spoken English phrases
    text_lower = normalized_text.lower()
    for pattern, fn in SPOKEN_ENGLISH_PATTERNS:
        m = re.search(pattern, text_lower)
        if m:
            val = float(fn(m))
            return ParsedGlucoseReading(
                value=val,
                context=context,
                is_valid_range=(20.0 <= val <= 600.0),
                raw_match=m.group(0)
            )

    # 4. Check for spoken Hindi words (longer phrases first)
    for phrase in sorted(SPOKEN_HINDI_NUMBERS.keys(), key=len, reverse=True):
        if phrase in normalized_text:
            val = float(SPOKEN_HINDI_NUMBERS[phrase])
            return ParsedGlucoseReading(
                value=val,
                context=context,
                is_valid_range=(20.0 <= val <= 600.0),
                raw_match=phrase
            )

    # 5. Check for spoken Marathi words (longer phrases first)
    for phrase in sorted(SPOKEN_MARATHI_NUMBERS.keys(), key=len, reverse=True):
        if phrase in normalized_text:
            val = float(SPOKEN_MARATHI_NUMBERS[phrase])
            return ParsedGlucoseReading(
                value=val,
                context=context,
                is_valid_range=(20.0 <= val <= 600.0),
                raw_match=phrase
            )

    return None
