"""
Diabeto Platform — End-to-End Decision Support & Demo Pipeline
Integrates:
  Patient Profile (JSON)
  -> Real-Time CGM Stream
  -> Model 1: LSTM Glucose Forecasting (+15, +30, +45, +60 min)
  -> Model 2: Calibrated Risk Probability Estimation (Hypo %, Normal %, Hyper %)
  -> Model 3: Personalized Alert & Intervention Decision Engine
  -> Explainable Alert + Safe Actions + Caregiver/Clinician Escalation (Simulated)
"""

import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import json
from typing import Any, Tuple, Optional, Dict, List
import joblib
import numpy as np
import pandas as pd
import torch
import matplotlib.pyplot as plt
import matplotlib.patches as patches

from apps.ml.risk_feature_extractor import (
    load_model1_checkpoints, 
    extract_features_from_windows
)
from apps.ml.personalized_alert_engine import PersonalizedAlertEngine, AlertSeverity, RiskCategory

PLOTS_DIR = "ml/plots"
os.makedirs(PLOTS_DIR, exist_ok=True)


class DiabetoPipelineRunner:
    """
    End-to-End Diabeto Clinical Decision Support Runner.
    Orchestrates Model 1, Model 2, and Model 3.
    """
    def __init__(
        self,
        model1_path: str = "ml/models/unified_lstm_best.pt",
        model2_path: str = "ml/models/glucose_risk_classifier.joblib",
        device: str = "cpu"
    ):
        self.device = device
        self.model1, self.scaler_min, self.scaler_max, _ = load_model1_checkpoints(model1_path, device=device)
        self.model2 = joblib.load(model2_path)
        self.model3_engine = PersonalizedAlertEngine()

    @staticmethod
    def sanitize_cgm_stream(raw_stream: Any) -> np.ndarray:
        """
        Robustly sanitizes incoming CGM stream:
        - Handles empty / None inputs by synthesizing a safe default baseline.
        - Filters out NaNs, infinities, None, and strings.
        - Clamps negative or non-physiological outliers to [20.0, 600.0] mg/dL.
        - Backwards-pads sequences with < 12 readings (e.g. first-ever reading) using earliest valid reading.
        - Truncates sequences with > 12 readings to the most recent 12 points.
        """
        if raw_stream is None:
            return np.full((1, 12), 100.0, dtype=np.float32)

        valid_vals = []
        if isinstance(raw_stream, (list, tuple, np.ndarray, pd.Series)):
            for v in raw_stream:
                try:
                    f = float(v)
                    if not (np.isnan(f) or np.isinf(f)):
                        # Clamp to physiological extreme bounds
                        clamped = float(np.clip(f, 20.0, 600.0))
                        valid_vals.append(clamped)
                except (ValueError, TypeError):
                    continue

        if len(valid_vals) == 0:
            return np.full((1, 12), 100.0, dtype=np.float32)

        # Pad if fewer than 12 readings (e.g. 1st reading or partial window)
        if len(valid_vals) < 12:
            earliest = valid_vals[0]
            pad_count = 12 - len(valid_vals)
            valid_vals = [earliest] * pad_count + valid_vals
        elif len(valid_vals) > 12:
            valid_vals = valid_vals[-12:]

        return np.array(valid_vals, dtype=np.float32).reshape(1, 12)

    def process_patient_cgm_stream(
        self,
        patient_profile: dict,
        cgm_history_60m: list,  # Readings over past hour (1 to 12 readings)
        recent_med_status: str = "taken"
    ) -> dict:
        """
        Executes end-to-end 3-stage inference for a patient with full input resilience.
        """
        patient_profile = patient_profile if isinstance(patient_profile, dict) else {}
        X_raw = self.sanitize_cgm_stream(cgm_history_60m)
        current_glucose = float(X_raw[0, -1])
        
        # Derivative calculations (safe indexing)
        roc_5min = (current_glucose - float(X_raw[0, -2])) / 5.0
        roc_15min = (current_glucose - float(X_raw[0, -4])) / 15.0
        roc_30min = (current_glucose - float(X_raw[0, -7])) / 30.0
        std_60min = float(np.std(X_raw[0]))

        # Trend direction descriptor
        if roc_5min < -1.5:
            trend_desc = "Falling rapidly (↓↓)"
        elif roc_5min < -0.5:
            trend_desc = "Falling (↓)"
        elif roc_5min > 1.5:
            trend_desc = "Rising rapidly (↑↑)"
        elif roc_5min > 0.5:
            trend_desc = "Rising (↑)"
        else:
            trend_desc = "Steady (→)"

        # STAGE 1: Model 1 Feature Extraction & Forecast
        X_feat = extract_features_from_windows(
            X_raw, self.model1, self.scaler_min, self.scaler_max, device=self.device
        )
        pred_15m = float(np.clip(X_feat[0, 9], 20.0, 600.0))
        pred_30m = float(np.clip(X_feat[0, 10], 20.0, 600.0))
        pred_45m = float(np.clip(X_feat[0, 11], 20.0, 600.0))
        pred_60m = float(np.clip(X_feat[0, 12], 20.0, 600.0))

        model1_forecast = {
            "t_plus_15m": pred_15m,
            "t_plus_30m": pred_30m,
            "t_plus_45m": pred_45m,
            "t_plus_60m": pred_60m
        }

        # STAGE 2: Model 2 Calibrated Risk Estimation
        risk_probs = self.model2.predict_proba(X_feat)[0]
        # Normalize to guarantee exact 100% sum
        p_sum = max(1e-6, float(np.sum(risk_probs)))
        prob_hypo = float(risk_probs[0] / p_sum * 100.0)
        prob_normal = float(risk_probs[1] / p_sum * 100.0)
        prob_hyper = float(risk_probs[2] / p_sum * 100.0)

        model2_risk = {
            "hypoglycemia_probability_pct": prob_hypo,
            "in_range_probability_pct": prob_normal,
            "hyperglycemia_probability_pct": prob_hyper
        }

        glucose_telemetry = {
            "current_glucose": current_glucose,
            "roc_5min": roc_5min,
            "roc_15min": roc_15min,
            "roc_30min": roc_30min,
            "std_60min": std_60min,
            "trend_descriptor": trend_desc,
            "history_60m": cgm_history_60m
        }

        # STAGE 3: Model 3 Personalized Decision & Escalation Engine
        model3_decision = self.model3_engine.evaluate(
            patient_profile=patient_profile,
            glucose_telemetry=glucose_telemetry,
            model1_forecast=model1_forecast,
            model2_risk=model2_risk
        )

        return {
            "pipeline_stages": {
                "stage1_model1_forecast": model1_forecast,
                "stage2_model2_risk": model2_risk,
                "stage3_model3_decision": model3_decision
            },
            "patient_info": {
                "id": patient_profile.get("patient_id") if patient_profile else "unknown",
                "name": patient_profile.get("name") if patient_profile else "Unknown Patient",
                "age": patient_profile.get("age") if patient_profile else None,
                "caregiver": (patient_profile.get("caregivers") or [{}])[0].get("name", "N/A") if (patient_profile and patient_profile.get("caregivers") and isinstance(patient_profile.get("caregivers")[0], dict)) else "N/A",
                "doctor": ((patient_profile.get("clinician_of_record") if patient_profile else None) or {}).get("name", "N/A")
            },
            "telemetry": glucose_telemetry,
            "decision": model3_decision
        }


def generate_visual_alert_card(alert_payload: dict, output_path: str = "ml/plots/demo_patient_alert_card.png"):
    """
    Generates an elderly-friendly visual alert summary card suitable for presentation slides and UI demo.
    """
    p_info = alert_payload["patient_info"]
    tel = alert_payload["telemetry"]
    m1 = alert_payload["pipeline_stages"]["stage1_model1_forecast"]
    m2 = alert_payload["pipeline_stages"]["stage2_model2_risk"]
    dec = alert_payload["decision"]

    fig, ax = plt.subplots(figsize=(10, 8.5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # Card Background Color based on Severity
    sev = dec["severity"]
    if sev in ["CRITICAL", "URGENT"]:
        card_color, border_color = "#FEF2F2", "#EF4444"
        badge_title = f"[{sev} ALERT] IMPENDING HYPOGLYCEMIA" if dec["risk_category"] == "HYPOGLYCEMIA" else f"[{sev} ALERT] SEVERE GLUCOSE EVENT"
    elif sev == "WARNING":
        card_color, border_color = "#FFFBEB", "#F59E0B"
        badge_title = f"[WARNING] GLUCOSE EXCURSION"
    elif sev == "WATCH":
        card_color, border_color = "#EFF6FF", "#3B82F6"
        badge_title = f"[WATCH] GLUCOSE DRIFT"
    else:
        card_color, border_color = "#F0FDF4", "#10B981"
        badge_title = "[NORMAL] GLUCOSE IN RANGE"

    rect = patches.FancyBboxPatch((0.2, 0.2), 9.6, 9.6, boxstyle="round,pad=0.3", 
                                  facecolor=card_color, edgecolor=border_color, linewidth=2.5)
    ax.add_patch(rect)

    # Header
    ax.text(5.0, 9.25, badge_title, fontsize=15, fontweight='bold', ha='center', color=border_color)
    ax.text(5.0, 8.75, f"Diabeto Clinical Decision Support — {p_info['name']} (Age: {p_info['age']})", 
            fontsize=10.5, ha='center', color='#334155')

    # Metrics Row
    box_y = 7.1
    ax.text(1.0, box_y + 0.9, "CURRENT GLUCOSE", fontsize=9.5, fontweight='bold', color='#64748B')
    ax.text(1.0, box_y + 0.2, f"{tel['current_glucose']:.0f} mg/dL", fontsize=22, fontweight='bold', color='#0F172A')
    ax.text(1.0, box_y - 0.3, f"Trend: {tel['trend_descriptor']}", fontsize=10, fontweight='semibold', color='#475569')

    ax.text(5.0, box_y + 0.9, "MODEL 1 PREDICTED (+30M)", fontsize=9.5, fontweight='bold', color='#64748B')
    ax.text(5.0, box_y + 0.2, f"{m1['t_plus_30m']:.0f} mg/dL", fontsize=22, fontweight='bold', color='#2563EB')
    ax.text(5.0, box_y - 0.3, f"Trajectory: +15m ({m1['t_plus_15m']:.0f}) | +60m ({m1['t_plus_60m']:.0f})", fontsize=9.5, color='#475569')

    ax.text(8.5, box_y + 0.9, "MODEL 2 HYPO RISK", fontsize=9.5, fontweight='bold', color='#64748B')
    ax.text(8.5, box_y + 0.2, f"{m2['hypoglycemia_probability_pct']:.0f}%", fontsize=22, fontweight='bold', color='#DC2626')
    ax.text(8.5, box_y - 0.3, f"Severity: {sev}", fontsize=9.5, fontweight='bold', color=border_color)

    # Divider line
    ax.plot([0.8, 9.2], [6.3, 6.3], color='#CBD5E1', linewidth=1.2)

    # Reason & Threshold involved
    ax.text(0.8, 5.9, "EXPLAINABLE CLINICAL REASON:", fontsize=10.5, fontweight='bold', color='#0F172A')
    ax.text(0.8, 5.4, dec["reason"], fontsize=9.5, color='#1E293B', wrap=True)

    # Escalation row
    cg_esc = dec["caregiver_escalation"]
    doc_esc = dec["clinician_escalation"]
    cg_text = f"Caregiver: {cg_esc['recipient_name']} ({cg_esc['recipient_phone']}) | Notified: {'YES (Simulated)' if cg_esc['notification_required'] else 'NO'}"
    ax.text(0.8, 4.8, cg_text, fontsize=9.5, fontweight='semibold', color='#1E293B')

    # Safe Action Recommendations (Elderly Friendly)
    ax.text(0.8, 4.2, "RECOMMENDED SAFE ACTIONS:", fontsize=11, fontweight='bold', color='#0F172A')
    rec_y = 3.7
    for rec in dec["recommended_actions"]:
        ax.text(0.8, rec_y, rec, fontsize=9.2, color='#1E293B', wrap=True)
        rec_y -= 0.52

    # Safety disclaimer
    ax.text(5.0, 0.5, dec["safety_disclaimer"], 
            fontsize=8.0, fontstyle='italic', ha='center', color='#64748B')

    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[SAVED] Visual alert card -> {output_path}")


def run_demo():
    print("==========================================================================")
    print("      DIABETO: END-TO-END DEMO INFERENCE & MODEL 3 DECISION PIPELINE      ")
    print("==========================================================================")

    with open("data/seed_patients.json") as f:
        seed_patients = json.load(f)

    runner = DiabetoPipelineRunner(device="cpu")

    # Select Demo Patient: Ramesh Kulkarni (Elderly Type-2 Diabetic)
    ramesh = seed_patients[0]
    
    # Realistic incoming 60-minute CGM stream showing rapid downward excursion towards hypoglycemia
    # 60-min history: [142, 136, 130, 122, 115, 108, 102, 98, 94, 91, 88, 84]
    ramesh_cgm_stream = [142.0, 136.0, 130.0, 122.0, 115.0, 108.0, 102.0, 98.0, 94.0, 91.0, 88.0, 84.0]

    print(f"\nProcessing incoming telemetry for {ramesh['name']} (ID: {ramesh['patient_id']})...")
    result = runner.process_patient_cgm_stream(
        patient_profile=ramesh,
        cgm_history_60m=ramesh_cgm_stream,
        recent_med_status="taken"
    )

    # Generate Visual Alert Card
    card_path = os.path.join(PLOTS_DIR, "demo_patient_alert_card.png")
    generate_visual_alert_card(result, card_path)

    # Save Output JSON
    output_json_path = "ml/results/demo_patient_alert_output.json"
    with open(output_json_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"[SAVED] Structured JSON alert payload -> {output_json_path}")

    # Print Formatted Human-Readable Terminal Report
    dec = result["decision"]
    m1 = result["pipeline_stages"]["stage1_model1_forecast"]
    m2 = result["pipeline_stages"]["stage2_model2_risk"]
    tel = result["telemetry"]

    print("\n" + "=" * 76)
    print("               DIABETO DECISION SUPPORT OUTPUT (MODEL 3)                  ")
    print("=" * 76)
    print(f"PATIENT:                  {result['patient_info']['name']} (Age: {result['patient_info']['age']})")
    print(f"SEVERITY TIER:            {dec['severity']}")
    print(f"RISK CATEGORY:            {dec['risk_category']}")
    print("-" * 76)
    print(f"GLUCOSE TELEMETRY:")
    print(f"  Current Glucose:        {tel['current_glucose']:.1f} mg/dL")
    print(f"  Recent Rate of Change:  {tel['roc_5min']:.2f} mg/dL/min ({tel['trend_descriptor']})")
    print(f"STAGE 1 (MODEL 1 FORECAST):")
    print(f"  +15 Min Predicted:      {m1['t_plus_15m']:.1f} mg/dL")
    print(f"  +30 Min Predicted:      {m1['t_plus_30m']:.1f} mg/dL (Personal Low Target: {dec['patient_thresholds_applied']['low']:.0f} mg/dL)")
    print(f"  +60 Min Predicted:      {m1['t_plus_60m']:.1f} mg/dL")
    print(f"STAGE 2 (MODEL 2 RISK CLASSIFIER):")
    print(f"  Hypoglycemia Risk:      {m2['hypoglycemia_probability_pct']:.1f}%")
    print(f"  In-Range Probability:   {m2['in_range_probability_pct']:.1f}%")
    print(f"  Hyperglycemia Risk:     {m2['hyperglycemia_probability_pct']:.1f}%")
    print("-" * 76)
    print(f"STAGE 3 (MODEL 3 EXPLAINABLE REASON):")
    print(f"  {dec['reason']}")
    print("-" * 76)
    print(f"ESCALATION STATUS:")
    print(f"  Caregiver Escalation:   {'SIMULATED Notification to ' + dec['caregiver_escalation']['recipient_name'] if dec['caregiver_escalation']['notification_required'] else 'NO'}")
    print(f"  Clinician Escalation:   {'SIMULATED Escalation to Dr. ' + dec['clinician_escalation']['doctor_name'] if dec['clinician_escalation']['escalation_required'] else 'NO'}")
    print("-" * 76)
    print("RECOMMENDED ELDERLY-FRIENDLY SAFE ACTIONS:")
    for act in dec['recommended_actions']:
        print(f"  {act}")
    print("=" * 76)


if __name__ == "__main__":
    run_demo()
