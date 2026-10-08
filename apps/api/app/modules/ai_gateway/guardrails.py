import re
from typing import List, Dict, Any, Tuple

BANNED_MEDICAL_PATTERNS = [
    r"\bincrease your dose\b",
    r"\bdecrease your dose\b",
    r"\bstop taking\b",
    r"\byou are diagnosed with\b",
    r"\byou have developed\b",
    r"\bprescribe\b",
    r"\bchange your medication\b",
]

def extract_numbers(text: str) -> List[str]:
    """Extracts integer and decimal numbers from a text string."""
    return re.findall(r"\b\d+(?:\.\d+)?\b", text)

def validate_number_fidelity(generated_text: str, evidence_data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates that every single number mentioned in generated AI text exists in the evidence payload.
    Prevents hallucinated blood sugar numbers or doses.
    """
    generated_numbers = extract_numbers(generated_text)
    
    # Flatten evidence data to string to search numbers
    evidence_str = str(evidence_data)
    evidence_numbers = extract_numbers(evidence_str)

    for num in generated_numbers:
        if num not in evidence_numbers:
            return False, f"Hallucinated number detected: {num} is not in evidence payload"

    return True, "Passed number fidelity"

def validate_medical_safety(generated_text: str) -> Tuple[bool, str]:
    """
    Checks generated text against forbidden clinical advice patterns.
    """
    lower_text = generated_text.lower()
    for pattern in BANNED_MEDICAL_PATTERNS:
        if re.search(pattern, lower_text):
            return False, f"Banned medical pattern matched: {pattern}"

    return True, "Passed safety checks"
