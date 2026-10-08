"""
Diabeto Platform — Model 3: Personalized Alert & Intervention Decision Engine
Deterministic, explainable clinical rules engine integrating Model 1 forecasts,
Model 2 risk probabilities, and patient-specific profile thresholds for elderly care.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
import numpy as np


class AlertSeverity(str, Enum):
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    WARNING = "WARNING"
    URGENT = "URGENT"
    CRITICAL = "CRITICAL"


class RiskCategory(str, Enum):
    IN_RANGE = "IN_RANGE"
    HYPOGLYCEMIA = "HYPOGLYCEMIA"
    HYPERGLYCEMIA = "HYPERGLYCEMIA"
    VOLATILE_FLUCTUATION = "VOLATILE_FLUCTUATION"


class PersonalizedAlertEngine:
    """
    Model 3: Evaluates multi-source glycemic signals against personalized patient thresholds
    to generate explainable alert severities, safe clinical recommendations, and escalation decisions.
    """

    DEFAULT_THRESHOLDS = {
        "critical_low": 70.0,
        "low": 80.0,
        "high": 180.0,
        "critical_high": 250.0
    }

    def __init__(self, default_thresholds: Optional[Dict[str, float]] = None):
        self.default_thresholds = default_thresholds or self.DEFAULT_THRESHOLDS.copy()

    def get_patient_thresholds(self, patient_profile: Dict[str, Any]) -> Dict[str, float]:
        """
        Safely extracts patient-specific thresholds from profile with fallbacks.
        """
        raw_t = patient_profile.get("thresholds", {})
        if not isinstance(raw_t, dict):
            raw_t = {}

        return {
            "critical_low": float(raw_t.get("critical_low", self.default_thresholds["critical_low"])),
            "low": float(raw_t.get("low", self.default_thresholds["low"])),
            "high": float(raw_t.get("high", self.default_thresholds["high"])),
            "critical_high": float(raw_t.get("critical_high", self.default_thresholds["critical_high"]))
        }

    def evaluate(
        self,
        patient_profile: Dict[str, Any],
        glucose_telemetry: Dict[str, Any],
        model1_forecast: Dict[str, Any],
        model2_risk: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Core Model 3 decision logic converting inputs into a structured alert decision.
        """
        # 1. Parse Inputs & Personal Thresholds
        thresholds = self.get_patient_thresholds(patient_profile)
        c_low = thresholds["critical_low"]
        low = thresholds["low"]
        high = thresholds["high"]
        c_high = thresholds["critical_high"]

        current_g = float(glucose_telemetry.get("current_glucose", 100.0))
        roc_5 = float(glucose_telemetry.get("roc_5min", glucose_telemetry.get("recent_rate_of_change_mgdl_min", 0.0)))
        roc_15 = float(glucose_telemetry.get("roc_15min", roc_5))
        std_60 = float(glucose_telemetry.get("std_60min", 0.0))
        trend_desc = glucose_telemetry.get("trend_descriptor", "Steady (->)")

        pred_15 = float(model1_forecast.get("t_plus_15m", current_g))
        pred_30 = float(model1_forecast.get("t_plus_30m", current_g))
        pred_45 = float(model1_forecast.get("t_plus_45m", pred_30))
        pred_60 = float(model1_forecast.get("t_plus_60m", pred_30))
        min_pred = min(pred_15, pred_30, pred_45, pred_60)
        max_pred = max(pred_15, pred_30, pred_45, pred_60)

        prob_hypo = float(model2_risk.get("hypoglycemia_probability_pct", 0.0))
        prob_normal = float(model2_risk.get("in_range_probability_pct", 100.0))
        prob_hyper = float(model2_risk.get("hyperglycemia_probability_pct", 0.0))

        # 2. Deterministic Severity & Category Evaluation
        severity = AlertSeverity.NORMAL
        risk_category = RiskCategory.IN_RANGE
        threshold_involved = None
        reason_parts = []
        recommendations = []
        caregiver_notify = False
        clinician_escalate = False

        # --- TIER 1: CRITICAL CHECKS ---
        if current_g <= c_low:
            severity = AlertSeverity.CRITICAL
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = c_low
            reason_parts.append(
                f"Current glucose ({current_g:.0f} mg/dL) has breached your critical low threshold ({c_low:.0f} mg/dL)."
            )
            caregiver_notify = True
            clinician_escalate = True

        elif current_g >= c_high:
            severity = AlertSeverity.CRITICAL
            risk_category = RiskCategory.HYPERGLYCEMIA
            threshold_involved = c_high
            reason_parts.append(
                f"Current glucose ({current_g:.0f} mg/dL) has breached your critical high threshold ({c_high:.0f} mg/dL)."
            )
            caregiver_notify = True
            clinician_escalate = True

        elif pred_30 <= (c_low - 10.0) or (min_pred <= c_low and prob_hypo >= 80.0):
            severity = AlertSeverity.CRITICAL
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = c_low
            reason_parts.append(
                f"Imminent acute hypoglycemia forecasted: Model 1 predicts glucose dropping to {pred_30:.0f} mg/dL (+30 min) with {prob_hypo:.0f}% Model 2 risk probability."
            )
            caregiver_notify = True
            clinician_escalate = True

        # --- TIER 2: URGENT CHECKS ---
        elif current_g < low and roc_5 < -0.3:
            severity = AlertSeverity.URGENT
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = low
            reason_parts.append(
                f"Current glucose ({current_g:.0f} mg/dL) is below your personalized low target ({low:.0f} mg/dL) and continuing to fall ({roc_5:.1f} mg/dL/min)."
            )
            caregiver_notify = True

        elif pred_30 <= c_low:
            severity = AlertSeverity.URGENT
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = c_low
            reason_parts.append(
                f"Model 1 forecasts glucose crossing critical low threshold ({c_low:.0f} mg/dL) in 30 minutes (predicted: {pred_30:.0f} mg/dL) with {prob_hypo:.0f}% Model 2 risk."
            )
            caregiver_notify = True

        elif min_pred <= c_low and prob_hypo >= 50.0:
            severity = AlertSeverity.URGENT
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = c_low
            reason_parts.append(
                f"Model 1 trajectory forecasts glucose reaching critical low threshold ({c_low:.0f} mg/dL, projected nadir: {min_pred:.0f} mg/dL) with {prob_hypo:.0f}% Model 2 risk."
            )
            caregiver_notify = True

        elif pred_30 >= c_high or (max_pred >= c_high and prob_hyper >= 65.0):
            severity = AlertSeverity.URGENT
            risk_category = RiskCategory.HYPERGLYCEMIA
            threshold_involved = c_high
            reason_parts.append(
                f"Severe hyperglycemia forecasted: Model 1 predicts glucose reaching {pred_30:.0f} mg/dL (+30 min) against critical threshold ({c_high:.0f} mg/dL)."
            )
            caregiver_notify = True
            clinician_escalate = True

        # --- TIER 3: WARNING CHECKS ---
        elif current_g < low:
            severity = AlertSeverity.WARNING
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = low
            reason_parts.append(
                f"Current glucose ({current_g:.0f} mg/dL) is below your low threshold ({low:.0f} mg/dL), currently {trend_desc}."
            )
            caregiver_notify = True

        elif pred_30 < low or (min_pred < low and prob_hypo >= 40.0):
            severity = AlertSeverity.WARNING
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = low
            reason_parts.append(
                f"Model 1 forecasts glucose crossing below your low threshold ({low:.0f} mg/dL) in 30 minutes (predicted: {pred_30:.0f} mg/dL, Model 2 hypo risk: {prob_hypo:.0f}%)."
            )
            caregiver_notify = True

        elif current_g > high:
            severity = AlertSeverity.WARNING
            risk_category = RiskCategory.HYPERGLYCEMIA
            threshold_involved = high
            reason_parts.append(
                f"Current glucose ({current_g:.0f} mg/dL) is elevated above your upper target ({high:.0f} mg/dL)."
            )
            caregiver_notify = False

        elif pred_30 > high or (max_pred > high and prob_hyper >= 45.0):
            severity = AlertSeverity.WARNING
            risk_category = RiskCategory.HYPERGLYCEMIA
            threshold_involved = high
            reason_parts.append(
                f"Model 1 forecasts glucose rising above your upper target ({high:.0f} mg/dL) to {pred_30:.0f} mg/dL within 30 minutes ({trend_desc})."
            )

        elif prob_hypo >= 50.0 and roc_5 < -0.5:
            # Trajectory risk without direct threshold breach yet
            severity = AlertSeverity.WARNING
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = low
            reason_parts.append(
                f"Model 2 flags high trajectory hypoglycemia risk ({prob_hypo:.0f}%) due to rapid downward rate of change ({roc_5:.1f} mg/dL/min), though current glucose ({current_g:.0f} mg/dL) is above threshold."
            )
            caregiver_notify = True

        # --- TIER 4: WATCH CHECKS ---
        elif (current_g - low) <= 10.0 and roc_5 < -0.2:
            severity = AlertSeverity.WATCH
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = low
            reason_parts.append(
                f"Glucose ({current_g:.0f} mg/dL) is within 10 mg/dL of your low threshold ({low:.0f} mg/dL) and drifting downward."
            )

        elif (high - current_g) <= 15.0 and roc_5 > 0.3:
            severity = AlertSeverity.WATCH
            risk_category = RiskCategory.HYPERGLYCEMIA
            threshold_involved = high
            reason_parts.append(
                f"Glucose ({current_g:.0f} mg/dL) is approaching your upper target ({high:.0f} mg/dL) with an upward trend."
            )

        elif prob_hypo >= 25.0 and prob_hypo < 50.0:
            severity = AlertSeverity.WATCH
            risk_category = RiskCategory.HYPOGLYCEMIA
            threshold_involved = low
            reason_parts.append(
                f"Model 2 detects moderate downward glycemic risk ({prob_hypo:.0f}% probability)."
            )

        elif prob_hyper >= 35.0 and prob_hyper < 50.0:
            severity = AlertSeverity.WATCH
            risk_category = RiskCategory.HYPERGLYCEMIA
            threshold_involved = high
            reason_parts.append(
                f"Model 2 detects moderate upward glycemic risk ({prob_hyper:.0f}% probability)."
            )

        elif std_60 >= 28.0:
            severity = AlertSeverity.WATCH
            risk_category = RiskCategory.VOLATILE_FLUCTUATION
            reason_parts.append(
                f"High glucose volatility detected over the past hour (std dev: {std_60:.1f} mg/dL)."
            )

        # --- TIER 5: NORMAL ---
        else:
            severity = AlertSeverity.NORMAL
            risk_category = RiskCategory.IN_RANGE
            threshold_involved = None
            reason_parts.append(
                f"Glucose is steady at {current_g:.0f} mg/dL within your personalized target range ({low:.0f} - {high:.0f} mg/dL) with low risk probabilities."
            )

        # 3. Generate Simple, Safe, Elderly-Friendly Recommendations
        patient_name = patient_profile.get("name", "Patient")
        doc_name = patient_profile.get("clinician_of_record", {}).get("name", "your doctor")
        cg_name = patient_profile.get("caregivers", [{}])[0].get("name", "Caregiver") if patient_profile.get("caregivers") else "your caregiver"

        if severity == AlertSeverity.CRITICAL:
            if risk_category == RiskCategory.HYPOGLYCEMIA:
                recommendations = [
                    "1. Confirm reading immediately with a fingerstick blood glucose meter.",
                    "2. Take 15 grams of fast-acting carbohydrate (1/2 cup fruit juice, 4 glucose tablets, or 3 tsp sugar in water).",
                    "3. Rest safely seated and recheck blood glucose in exactly 15 minutes (Rule of 15).",
                    f"4. An emergency alert has been sent to {cg_name}.",
                    f"5. If symptoms (shakiness, confusion) persist, seek immediate emergency medical care."
                ]
            else:
                recommendations = [
                    "1. Verify reading immediately with a fingerstick blood glucose meter.",
                    "2. Drink 1-2 glasses of water to stay well-hydrated.",
                    f"3. Follow the severe hyperglycemia protocol established by Dr. {doc_name}.",
                    f"4. An alert has been forwarded to {cg_name}.",
                    f"5. Contact Dr. {doc_name} or emergency medical services if you feel unwell or nauseous."
                ]
        elif severity == AlertSeverity.URGENT:
            if risk_category == RiskCategory.HYPOGLYCEMIA:
                recommendations = [
                    "1. Check glucose with a fingerstick blood glucose meter.",
                    "2. Have a 15-gram fast-acting carbohydrate snack (e.g. juice or glucose biscuits).",
                    "3. Recheck blood glucose in 15 minutes.",
                    f"4. {cg_name} has been notified to check in with you."
                ]
            else:
                recommendations = [
                    "1. Check blood glucose with a fingerstick meter to confirm.",
                    "2. Drink plenty of water to help stay hydrated.",
                    f"3. Check your medication log and follow your care plan provided by Dr. {doc_name}.",
                    "4. Recheck glucose in 30 minutes."
                ]
        elif severity == AlertSeverity.WARNING:
            if risk_category == RiskCategory.HYPOGLYCEMIA:
                recommendations = [
                    "1. Check your blood glucose with a meter.",
                    "2. Prepare a light snack if feeling hungry or shaky.",
                    "3. Recheck glucose in 20-30 minutes.",
                    "4. Avoid strenuous physical exertion until levels stabilize."
                ]
            else:
                recommendations = [
                    "1. Drink a glass of water.",
                    "2. Take a light 10-minute walk if feeling comfortable.",
                    "3. Confirm that your scheduled medication was logged.",
                    "4. Recheck glucose in 30-45 minutes."
                ]
        elif severity == AlertSeverity.WATCH:
            recommendations = [
                "1. Glucose is drifting slightly near your target boundary.",
                "2. Keep a glass of water and light snack accessible.",
                "3. Continue monitoring the Diabeto dashboard."
            ]
        else:
            recommendations = [
                "1. Glucose is stable within your personalized target range.",
                "2. Continue your regular healthy diet, hydration, and activity routine.",
                "3. Next routine medication check-in will be sent as scheduled."
            ]

        # 4. Assemble Explainable Result Object
        caregiver_info = patient_profile.get("caregivers", [{}])[0] if patient_profile.get("caregivers") else {}
        clinician_info = patient_profile.get("clinician_of_record", {})

        return {
            "severity": severity.value,
            "risk_category": risk_category.value,
            "current_glucose": round(current_g, 1),
            "trend_rate_of_change_mgdl_min": round(roc_5, 2),
            "trend_descriptor": trend_desc,
            "predicted_glucose_30min": round(pred_30, 1),
            "trajectory_forecast": {
                "plus_15min": round(pred_15, 1),
                "plus_30min": round(pred_30, 1),
                "plus_45min": round(pred_45, 1),
                "plus_60min": round(pred_60, 1),
                "trajectory_min": round(min_pred, 1),
                "trajectory_max": round(max_pred, 1)
            },
            "model2_risk_probabilities": {
                "hypoglycemia_pct": round(prob_hypo, 1),
                "in_range_pct": round(prob_normal, 1),
                "hyperglycemia_pct": round(prob_hyper, 1)
            },
            "patient_thresholds_applied": {
                "critical_low": c_low,
                "low": low,
                "high": high,
                "critical_high": c_high,
                "threshold_involved": threshold_involved
            },
            "reason": " ".join(reason_parts),
            "recommended_actions": recommendations,
            "caregiver_escalation": {
                "notification_required": caregiver_notify,
                "status": "simulated",
                "recipient_name": caregiver_info.get("name", "N/A"),
                "recipient_phone": caregiver_info.get("phone", "N/A"),
                "channel": "WhatsApp"
            },
            "clinician_escalation": {
                "escalation_required": clinician_escalate,
                "status": "simulated",
                "doctor_name": clinician_info.get("name", "N/A"),
                "doctor_phone": clinician_info.get("phone", "N/A"),
                "protocol": "Emergency Care Team Alert" if severity == AlertSeverity.CRITICAL else "Standard Care Protocol"
            },
            "safety_disclaimer": "Diabeto is a decision support tool and never autonomously prescribes medication, insulin doses, or diagnostic determinations."
        }
