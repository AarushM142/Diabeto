import json
import os
import re
from typing import Dict, Any, Optional, Tuple

_TEMPLATES_CACHE: Optional[Dict[str, Dict[str, str]]] = None

def _get_templates_path() -> str:
    # Try relative to repo root
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    candidate = os.path.join(base_dir, "templates", "messages.json")
    if os.path.exists(candidate):
        return candidate
    # Fallback to local
    return "templates/messages.json"

def load_templates() -> Dict[str, Dict[str, str]]:
    global _TEMPLATES_CACHE
    if _TEMPLATES_CACHE is not None:
        return _TEMPLATES_CACHE
    
    path = _get_templates_path()
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                _TEMPLATES_CACHE = json.load(f)
                return _TEMPLATES_CACHE
    except Exception as e:
        print(f"[TemplateManager] Warning: Failed to load {path}: {e}")
    
    _TEMPLATES_CACHE = {}
    return _TEMPLATES_CACHE

def render_message(key: str, lang: str = "en", **kwargs: Any) -> str:
    """
    Renders a message from templates/messages.json for the specified language.
    Falls back gracefully: requested lang -> 'hi' -> 'en' -> raw placeholder.
    """
    templates = load_templates()
    template_entry = templates.get(key, {})
    
    # Normalize language code (e.g., 'hi-IN' -> 'hi')
    lang_clean = (lang or "en").lower().split("-")[0]
    if lang_clean not in ("en", "hi", "mr"):
        lang_clean = "hi"
    
    raw_text = template_entry.get(lang_clean)
    if not raw_text:
        raw_text = template_entry.get("hi") or template_entry.get("en")
    
    if not raw_text:
        # Fallback if key missing altogether
        return f"[{key}: " + ", ".join(f"{k}={v}" for k, v in kwargs.items()) + "]"
    
    # Replace {{variable}} tokens
    def replace_token(match: re.Match) -> str:
        var_name = match.group(1).strip()
        val = kwargs.get(var_name)
        return str(val) if val is not None else match.group(0)

    return re.sub(r"\{\{([a-zA-Z0-9_]+)\}\}", replace_token, raw_text)
