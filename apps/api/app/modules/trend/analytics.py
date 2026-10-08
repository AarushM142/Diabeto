import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from apps.api.app.models.entities import HealthEvent, MedicationSchedule

def calculate_glycemic_metrics(
    readings: List[float],
    critical_low: float = 70.0,
    low: float = 80.0,
    high: float = 180.0,
    critical_high: float = 250.0,
) -> Dict[str, Any]:
    """
    Computes clinical-grade ADA standard glycemic metrics:
    - Time In Range (TIR %): 70 - 180 mg/dL
    - Time Above Range (TAR %): > 180 mg/dL
    - Time Below Range (TBR %): < 70 mg/dL
    - Mean Glucose, Min, Max
    - Standard Deviation (SD) & Coefficient of Variation (CV %)
    - Median Glucose & Median Absolute Deviation (MAD) for robust baseline
    """
    if not readings:
        return {
            "total_readings": 0,
            "mean_glucose": 0.0,
            "median_glucose": 0.0,
            "mad_glucose": 0.0,
            "min_glucose": 0.0,
            "max_glucose": 0.0,
            "standard_deviation": 0.0,
            "coefficient_of_variation_pct": 0.0,
            "tir_percentage": 0.0,
            "tar_percentage": 0.0,
            "tbr_percentage": 0.0,
            "clinical_status": "insufficient_data",
        }

    n = len(readings)
    mean_val = sum(readings) / n
    sorted_readings = sorted(readings)
    
    # Median
    if n % 2 == 1:
        median_val = sorted_readings[n // 2]
    else:
        median_val = (sorted_readings[n // 2 - 1] + sorted_readings[n // 2]) / 2.0

    # MAD (Median Absolute Deviation)
    deviations = sorted([abs(x - median_val) for x in readings])
    if n % 2 == 1:
        mad_val = deviations[n // 2]
    else:
        mad_val = (deviations[n // 2 - 1] + deviations[n // 2]) / 2.0

    # Variance & Standard Deviation
    variance = sum((x - mean_val) ** 2 for x in readings) / n
    sd_val = math.sqrt(variance)
    cv_pct = (sd_val / mean_val * 100.0) if mean_val > 0 else 0.0

    # TIR, TAR, TBR
    tbr_count = sum(1 for x in readings if x < critical_low)
    tir_count = sum(1 for x in readings if critical_low <= x <= high)
    tar_count = sum(1 for x in readings if x > high)

    tir_pct = round((tir_count / n) * 100.0, 1)
    tar_pct = round((tar_count / n) * 100.0, 1)
    tbr_pct = round((tbr_count / n) * 100.0, 1)

    # Clinical status interpretation
    if tir_pct >= 70.0 and tbr_pct < 4.0:
        clinical_status = "optimal_control"
    elif tbr_pct >= 4.0:
        clinical_status = "hypo_risk"
    elif tar_pct >= 30.0:
        clinical_status = "hyper_risk"
    else:
        clinical_status = "moderate_control"

    return {
        "total_readings": n,
        "mean_glucose": round(mean_val, 1),
        "median_glucose": round(median_val, 1),
        "mad_glucose": round(mad_val, 1),
        "min_glucose": round(min(readings), 1),
        "max_glucose": round(max(readings), 1),
        "standard_deviation": round(sd_val, 1),
        "coefficient_of_variation_pct": round(cv_pct, 1),
        "tir_percentage": tir_pct,
        "tar_percentage": tar_pct,
        "tbr_percentage": tbr_pct,
        "clinical_status": clinical_status,
    }

def calculate_context_breakdowns(events: List[HealthEvent]) -> Dict[str, Any]:
    """
    Computes average glucose grouped by context (fasting, postprandial, bedtime, random).
    """
    context_buckets: Dict[str, List[float]] = {
        "fasting": [],
        "postprandial": [],
        "bedtime": [],
        "random": [],
    }

    for e in events:
        if e.type == "glucose" and isinstance(e.value, dict) and "mgdl" in e.value:
            val = float(e.value["mgdl"])
            ctx = str(e.value.get("context", "random")).lower()
            if ctx not in context_buckets:
                ctx = "random"
            context_buckets[ctx].append(val)

    breakdown = {}
    for ctx, vals in context_buckets.items():
        if vals:
            breakdown[ctx] = {
                "count": len(vals),
                "mean_mgdl": round(sum(vals) / len(vals), 1),
                "min_mgdl": min(vals),
                "max_mgdl": max(vals),
            }
        else:
            breakdown[ctx] = {"count": 0, "mean_mgdl": None, "min_mgdl": None, "max_mgdl": None}

    return breakdown

def calculate_adherence_metrics(
    events: List[HealthEvent],
    schedules: List[MedicationSchedule],
    days: int = 14,
) -> Dict[str, Any]:
    """
    Calculates medication compliance score and logging streak.
    """
    active_schedules = [s for s in schedules if s.is_active]
    med_events = [e for e in events if e.type in ("medication", "dose_ack")]
    glucose_events = [e for e in events if e.type == "glucose"]

    # Calculate expected doses over period
    expected_daily_doses = len(active_schedules)
    total_expected_doses = expected_daily_doses * days
    actual_confirmed_doses = len(med_events)

    if total_expected_doses > 0:
        compliance_score = min(100.0, round((actual_confirmed_doses / total_expected_doses) * 100.0, 1))
    else:
        compliance_score = 100.0 if not active_schedules else 0.0

    # Calculate logging frequency (readings per day)
    readings_per_day = round(len(glucose_events) / max(1, days), 1)

    return {
        "active_medication_count": len(active_schedules),
        "total_confirmed_doses": actual_confirmed_doses,
        "compliance_score_pct": compliance_score,
        "readings_per_day": readings_per_day,
        "status": "adherent" if compliance_score >= 80.0 else "needs_attention",
    }
