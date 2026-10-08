from dataclasses import dataclass
import pytest
from apps.api.app.modules.risk.engine import evaluate_glucose_reading

@dataclass
class MockThreshold:
    critical_low: float = 70.0
    low: float = 80.0
    high: float = 180.0
    critical_high: float = 250.0

def test_normal_glucose_evaluation():
    threshold = MockThreshold(critical_low=70, low=80, high=180, critical_high=250)
    result = evaluate_glucose_reading(120.0, threshold)
    assert result is None

def test_critical_hypoglycemia_evaluation():
    threshold = MockThreshold(critical_low=70, low=80, high=180, critical_high=250)
    result = evaluate_glucose_reading(58.0, threshold)
    assert result is not None
    risk_type, severity = result
    assert risk_type == "critical_hypoglycemia"
    assert severity == "critical"

def test_critical_hyperglycemia_evaluation():
    threshold = MockThreshold(critical_low=70, low=80, high=180, critical_high=250)
    result = evaluate_glucose_reading(290.0, threshold)
    assert result is not None
    risk_type, severity = result
    assert risk_type == "critical_hyperglycemia"
    assert severity == "critical"

def test_watch_high_glucose_evaluation():
    threshold = MockThreshold(critical_low=70, low=80, high=180, critical_high=250)
    result = evaluate_glucose_reading(195.0, threshold)
    assert result is not None
    risk_type, severity = result
    assert risk_type == "high_glucose"
    assert severity == "watch"
