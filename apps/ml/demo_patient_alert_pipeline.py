"""
Diabeto Platform — Demo Inference Pipeline for Model 2 (Personalized Risk & Alert Engine)
Demonstrates end-to-end integration: Patient JSON -> Telemetry -> Model 1 Forecast -> Model 2 Risk -> Personalized Alert Card
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

PLOTS_DIR = "ml/plots"
os.makedirs(PLOTS_DIR, exist_ok=True)


class DiabetoAlertEngine:
    """
    Production-grade Alert & Personalized Risk Engine for Diabeto.
    Integrates Model 1 (LSTM Trajectory), Model 2 (Risk Classifier), and Patient Profiles.
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

    def evaluate_patient_cgm_stream(
        self,
        patient_profile: dict,
        cgm_history_60m: list,  # List of 12 glucose values (every 5 min over past hour)
        recent_med_status: str = "taken"
    ) -> dict:
        """
        Executes end-to-end inference for a single patient's incoming 60-min CGM stream.
        """
        if len(cgm_history_60m) != 12:
            raise ValueError(f"Expected exactly 12 readings (60 minutes @ 5-min intervals), got {len(cgm_history_60m)}")

        X_raw = np.array(cgm_history_60m, dtype=np.float32).reshape(1, 12)
        current_glucose = float(X_raw[0, -1])
        recent_roc = (current_glucose - float(X_raw[0, -2])) / 5.0  # mg/dL per min

        # 1. Extract 18 Features via Model 1
        X_feat = extract_features_from_windows(
            X_raw, self.model1, self.scaler_min, self.scaler_max, device=self.device
        )

        # 2. Query Model 2 for Calibrated Probabilities
        risk_probs = self.model2.predict_proba(X_feat)[0]
        # Class 0: Hypo, Class 1: Normal, Class 2: Hyper
        prob_hypo = float(risk_probs[0] * 100.0)
        prob_normal = float(risk_probs[1] * 100.0)
        prob_hyper = float(risk_probs[2] * 100.0)

        pred_15m = float(X_feat[0, 9])
        pred_30m = float(X_feat[0, 10])
        pred_45m = float(X_feat[0, 11])
        pred_60m = float(X_feat[0, 12])

        # 3. Personalized Threshold Comparison
        thresholds = patient_profile.get("thresholds", {
            "critical_low": 70, "low": 80, "high": 180, "critical_high": 250
        })

        # 4. Severity Logic & Clinical Action Recommendation
        severity = "NORMAL_STABLE"
        alert_title = "STABLE GLUCOSE"
        risk_category = "IN_RANGE"
        action_recommendations = []
        caregiver_notified = False
        clinician_escalated = False

        if pred_30m < thresholds["critical_low"] or prob_hypo >= 50.0:
            severity = "CRITICAL_URGENT"
            alert_title = "[CRITICAL ALERT] IMPENDING HYPOGLYCEMIA"
            risk_category = "HIGH_HYPOGLYCEMIA_RISK"
            caregiver_notified = True
            clinician_escalated = (pred_30m < 60.0 or current_glucose < 65.0)
            action_recommendations = [
                "1. Immediately check glucose with a fingerstick blood glucose meter.",
                "2. Have 15 grams of fast-acting carbohydrate (e.g., 1/2 cup fruit juice, 4 glucose tabs, or 3 tsp sugar in water).",
                "3. Rest safely and recheck glucose in exactly 15 minutes (Rule of 15).",
                "4. Caregiver has been automatically alerted via WhatsApp.",
                "[Safety Rule]: Do NOT self-administer insulin or delay treatment."
            ]
        elif pred_30m < thresholds["low"] or (prob_hypo >= 30.0 and recent_roc < -0.8):
            severity = "WARNING"
            alert_title = "[WARNING] IMPENDING LOW GLUCOSE"
            risk_category = "MODERATE_HYPOGLYCEMIA_RISK"
            caregiver_notified = True
            action_recommendations = [
                "1. Blood glucose is trending downwards towards your low threshold.",
                "2. Check blood glucose and prepare a light snack if feeling symptomatic.",
                "3. Recheck blood glucose in 20 minutes.",
                "4. Avoid strenuous physical activity until glucose stabilizes."
            ]
        elif pred_30m > thresholds["critical_high"] or (prob_hyper >= 60.0 and pred_30m > 240):
            severity = "CRITICAL_URGENT"
            alert_title = "[CRITICAL ALERT] SEVERE HYPERGLYCEMIA"
            risk_category = "HIGH_HYPERGLYCEMIA_RISK"
            caregiver_notified = True
            clinician_escalated = True
            action_recommendations = [
                "1. Blood glucose is significantly above your critical target.",
                "2. Drink plenty of water (stay hydrated) and check for ketones if advised by your doctor.",
                "3. Verify sensor accuracy with a fingerstick reading.",
                "4. Follow your clinician's established hyperglycemia care protocol.",
                "Contact Dr. " + patient_profile.get("clinician_of_record", {}).get("name", "Arvind Mehta") + " if symptoms persist."
            ]
        elif pred_30m > thresholds["high"] or prob_hyper >= 45.0:
            severity = "WARNING"
            alert_title = "[WARNING] ELEVATED GLUCOSE"
            risk_category = "MODERATE_HYPERGLYCEMIA_RISK"
            action_recommendations = [
                "1. Post-meal glucose is currently above your 180 mg/dL target.",
                "2. Drink a glass of water and take a light 10-minute walk if feeling well.",
                "3. Confirm medication log: verify your prescribed medication was taken as scheduled.",
                "4. Recheck glucose in 30 minutes."
            ]
        else:
            action_recommendations = [
                "1. Your glucose levels are steady within your personalized target range.",
                "2. Continue following your regular healthy diet and activity plan.",
                "3. Next scheduled medication reminder will be sent on time."
            ]

        # Rate of change descriptor
        if recent_roc < -1.5:
            trend_desc = "Falling rapidly (↓↓)"
        elif recent_roc < -0.5:
            trend_desc = "Falling (↓)"
        elif recent_roc > 1.5:
            trend_desc = "Rising rapidly (↑↑)"
        elif recent_roc > 0.5:
            trend_desc = "Rising (↑)"
        else:
            trend_desc = "Steady (→)"

        return {
            "patient_info": {
                "id": patient_profile.get("patient_id"),
                "name": patient_profile.get("name"),
                "age": patient_profile.get("age"),
                "caregiver": patient_profile.get("caregivers", [{}])[0].get("name", "N/A"),
                "caregiver_phone": patient_profile.get("caregivers", [{}])[0].get("phone", "N/A"),
                "doctor": patient_profile.get("clinician_of_record", {}).get("name", "N/A")
            },
            "telemetry": {
                "current_glucose": current_glucose,
                "recent_rate_of_change_mgdl_min": round(recent_roc, 2),
                "trend_descriptor": trend_desc,
                "history_60m": cgm_history_60m
            },
            "model1_forecast": {
                "t_plus_15m": round(pred_15m, 1),
                "t_plus_30m": round(pred_30m, 1),
                "t_plus_45m": round(pred_45m, 1),
                "t_plus_60m": round(pred_60m, 1)
            },
            "model2_risk": {
                "risk_category": risk_category,
                "severity": severity,
                "hypoglycemia_probability_pct": round(prob_hypo, 1),
                "in_range_probability_pct": round(prob_normal, 1),
                "hyperglycemia_probability_pct": round(prob_hyper, 1)
            },
            "thresholds_applied": thresholds,
            "clinical_decision_support": {
                "alert_title": alert_title,
                "caregiver_notified": caregiver_notified,
                "clinician_escalated": clinician_escalated,
                "action_recommendations": action_recommendations
            }
        }


def generate_demo_alert_visual_card(alert_result: dict, output_path: str = "ml/plots/demo_patient_alert_card.png"):
    """
    Generates a clean, elderly-friendly visual alert summary card suitable for WhatsApp/App demo slides.
    """
    p_info = alert_result["patient_info"]
    tel = alert_result["telemetry"]
    m1 = alert_result["model1_forecast"]
    m2 = alert_result["model2_risk"]
    cds = alert_result["clinical_decision_support"]

    fig, ax = plt.subplots(figsize=(10, 8), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # Background Card
    card_color = "#FEF2F2" if m2["severity"] == "CRITICAL_URGENT" else "#FFFBEB" if m2["severity"] == "WARNING" else "#F0FDF4"
    border_color = "#EF4444" if m2["severity"] == "CRITICAL_URGENT" else "#F59E0B" if m2["severity"] == "WARNING" else "#10B981"
    
    rect = patches.FancyBboxPatch((0.2, 0.2), 9.6, 9.6, boxstyle="round,pad=0.3", 
                                  facecolor=card_color, edgecolor=border_color, linewidth=2.5)
    ax.add_patch(rect)

    # Header
    ax.text(5.0, 9.2, cds["alert_title"], fontsize=15, fontweight='bold', ha='center', color=border_color)
    ax.text(5.0, 8.7, f"Diabeto Clinical Decision Support — {p_info['name']} (Age: {p_info['age']})", 
            fontsize=10.5, ha='center', color='#334155')

    # Current vs Forecast Box
    box_y = 6.9
    ax.text(1.0, box_y + 1.0, "CURRENT GLUCOSE", fontsize=9.5, fontweight='bold', color='#64748B')
    ax.text(1.0, box_y + 0.3, f"{tel['current_glucose']:.0f} mg/dL", fontsize=22, fontweight='bold', color='#0F172A')
    ax.text(1.0, box_y - 0.2, f"Trend: {tel['trend_descriptor']}", fontsize=10, fontweight='semibold', color='#475569')

    ax.text(5.0, box_y + 1.0, "PREDICTED (+30 MIN)", fontsize=9.5, fontweight='bold', color='#64748B')
    ax.text(5.0, box_y + 0.3, f"{m1['t_plus_30m']:.0f} mg/dL", fontsize=22, fontweight='bold', color='#2563EB')
    ax.text(5.0, box_y - 0.2, f"Trajectory: +15m ({m1['t_plus_15m']:.0f}) | +60m ({m1['t_plus_60m']:.0f})", fontsize=9.5, color='#475569')

    ax.text(8.5, box_y + 1.0, "RISK PROBABILITY", fontsize=9.5, fontweight='bold', color='#64748B')
    ax.text(8.5, box_y + 0.3, f"{m2['hypoglycemia_probability_pct']:.0f}%", fontsize=22, fontweight='bold', color='#DC2626')
    ax.text(8.5, box_y - 0.2, f"Severity: {m2['severity']}", fontsize=9.5, fontweight='bold', color=border_color)

    # Divider line
    ax.plot([0.8, 9.2], [6.2, 6.2], color='#CBD5E1', linewidth=1.2)

    # Personalized Thresholds & Notification status
    ax.text(0.8, 5.8, f"Caregiver: {p_info['caregiver']} ({p_info['caregiver_phone']}) | Auto-Notified: {'YES (WhatsApp Alert Sent)' if cds['caregiver_notified'] else 'NO'}", 
            fontsize=9.5, fontweight='semibold', color='#1E293B')
    ax.text(0.8, 5.4, f"Doctor of Record: {p_info['doctor']} | Personalized Low Threshold: {alert_result['thresholds_applied']['critical_low']} mg/dL", 
            fontsize=9.5, color='#475569')

    # Safe Action Recommendations (Elderly Friendly)
    ax.text(0.8, 4.8, "RECOMMENDED SAFE ACTIONS:", fontsize=11, fontweight='bold', color='#0F172A')
    
    rec_y = 4.3
    for rec in cds["action_recommendations"]:
        ax.text(0.8, rec_y, rec, fontsize=9.5, color='#1E293B', wrap=True)
        rec_y -= 0.55

    # Footer note
    ax.text(5.0, 0.6, "Diabeto Safety Protocol: Never recommends insulin dosing or medication alteration independently.", 
            fontsize=8.5, fontstyle='italic', ha='center', color='#64748B')

    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[SAVED] Visual alert card -> {output_path}")


def run_demo_pipeline():
    print("==========================================================================")
    print("      DIABETO: MODEL 2 DEMO INFERENCE & PATIENT ALERT PIPELINE           ")
    print("==========================================================================")

    with open("data/seed_patients.json") as f:
        seed_patients = json.load(f)

    engine = DiabetoAlertEngine(device="cpu")

    # Select Demo Patient 1: Ramesh Kulkarni (Elderly Type-2 Diabetic experiencing an impending post-lunch rapid drop)
    ramesh = seed_patients[0]
    
    # Scenario: Ramesh is at 88 mg/dL after walking, dropping rapidly at -1.6 mg/dL/min over the last 60 minutes
    # 60-min history: [142, 136, 130, 122, 115, 108, 102, 98, 94, 91, 89, 84]
    ramesh_cgm_stream = [142.0, 136.0, 130.0, 122.0, 115.0, 108.0, 102.0, 98.0, 94.0, 91.0, 88.0, 84.0]

    print(f"\nProcessing real-time telemetry for patient: {ramesh['name']} (ID: {ramesh['patient_id']})...")
    alert_result = engine.evaluate_patient_cgm_stream(
        patient_profile=ramesh,
        cgm_history_60m=ramesh_cgm_stream,
        recent_med_status="taken"
    )

    # Generate Visual Alert Card
    card_path = os.path.join(PLOTS_DIR, "demo_patient_alert_card.png")
    generate_demo_alert_visual_card(alert_result, card_path)

    # Print Formatted Output
    print("\n" + "=" * 76)
    print(f"               DIABETO REAL-TIME PATIENT ALERT OUTPUT                   ")
    print("=" * 76)
    print(f"PATIENT:                 {alert_result['patient_info']['name']} (Age: {alert_result['patient_info']['age']})")
    print(f"ALERT STATUS:            {alert_result['clinical_decision_support']['alert_title']}")
    print(f"SEVERITY LEVEL:          {alert_result['model2_risk']['severity']}")
    print("-" * 76)
    print(f"CURRENT TELEMETRY:")
    print(f"  Current Glucose:       {alert_result['telemetry']['current_glucose']} mg/dL")
    print(f"  Trend Rate of Change:  {alert_result['telemetry']['recent_rate_of_change_mgdl_min']} mg/dL/min ({alert_result['telemetry']['trend_descriptor']})")
    print(f"MODEL 1 TRAJECTORY FORECAST:")
    print(f"  +15 Min Predicted:     {alert_result['model1_forecast']['t_plus_15m']} mg/dL")
    print(f"  +30 Min Predicted:     {alert_result['model1_forecast']['t_plus_30m']} mg/dL (Below Low Threshold: {alert_result['thresholds_applied']['critical_low']} mg/dL)")
    print(f"  +60 Min Predicted:     {alert_result['model1_forecast']['t_plus_60m']} mg/dL")
    print(f"MODEL 2 RISK ESTIMATION:")
    print(f"  Hypoglycemia Risk:     {alert_result['model2_risk']['hypoglycemia_probability_pct']}%")
    print(f"  In-Range Probability:  {alert_result['model2_risk']['in_range_probability_pct']}%")
    print(f"  Hyperglycemia Risk:    {alert_result['model2_risk']['hyperglycemia_probability_pct']}%")
    print("-" * 76)
    print(f"NOTIFICATIONS DISPATCHED:")
    print(f"  Caregiver Alert:       {'SENT to ' + alert_result['patient_info']['caregiver'] if alert_result['clinical_decision_support']['caregiver_notified'] else 'NO'}")
    print(f"  Doctor Escalation:     {'ESCALATED to Dr. ' + alert_result['patient_info']['doctor'] if alert_result['clinical_decision_support']['clinician_escalated'] else 'NO'}")
    print("-" * 76)
    print("RECOMMENDED ELDERLY-FRIENDLY SAFE ACTIONS:")
    for action in alert_result['clinical_decision_support']['action_recommendations']:
        print(f"  {action}")
    print("=" * 76)

    # Save Demo Output JSON
    demo_json_path = "ml/results/demo_patient_alert_output.json"
    with open(demo_json_path, "w") as f:
        json.dump(alert_result, f, indent=2)
    print(f"[SAVED] Demo patient alert output JSON -> {demo_json_path}")


if __name__ == "__main__":
    run_demo_pipeline()
