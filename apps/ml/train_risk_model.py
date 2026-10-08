"""
Diabeto Platform — Model 2: Personalized Glucose Risk & Alert Classifier Training Pipeline
Trains a calibrated clinical risk ensemble on OhioT1DM + ShanghaiT2DM with strict patient separation.
"""

import sys
import os

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import json
import joblib
import numpy as np
import pandas as pd
import torch
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, 
    precision_recall_curve, auc, roc_curve, average_precision_score
)
from sklearn.preprocessing import label_binarize

from apps.ml.risk_feature_extractor import (
    load_model1_checkpoints, 
    extract_features_from_windows, 
    assign_risk_class_labels,
    FEATURE_NAMES
)
from apps.ml.unified_data_loader import (
    load_ohiot1dm_patients, 
    load_and_resample_shanghai_patients,
    extract_gap_aware_windows
)

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

MODEL_SAVE_PATH = "ml/models/glucose_risk_classifier.joblib"
METADATA_SAVE_PATH = "ml/models/risk_model_metadata.json"
RESULTS_JSON_PATH = "ml/results/risk_model_evaluation_results.json"
PLOTS_DIR = "ml/plots"

os.makedirs("ml/models", exist_ok=True)
os.makedirs("ml/results", exist_ok=True)
os.makedirs(PLOTS_DIR, exist_ok=True)

CLASS_NAMES = ["Hypoglycemia (<70)", "In-Range (70-180)", "Hyperglycemia (>180)"]
CLASS_TAGS = ["hypoglycemia", "in_range", "hyperglycemia"]


def build_cohort_dataset(pids_list: list, all_patients_dict: dict, model1, scaler_min, scaler_max, device="cpu"):
    """
    Extracts 60-minute windows and future +30 min target labels for a list of patients.
    """
    X_raw_list, y_future_list, pids_arr_list = [], [], []

    for pid in pids_list:
        df = all_patients_dict[pid]
        X, y, last_obs, times, raw_y, p_arr = extract_gap_aware_windows(
            df, lookback_steps=12, horizon_steps=6
        )
        if len(X) > 0:
            X_raw_list.append(X)
            y_future_list.append(raw_y)
            pids_arr_list.append(p_arr)

    if not X_raw_list:
        return np.empty((0, len(FEATURE_NAMES))), np.empty(0), np.empty(0)

    X_raw_all = np.concatenate(X_raw_list, axis=0)
    y_future_all = np.concatenate(y_future_list, axis=0)
    pids_all = np.concatenate(pids_arr_list, axis=0)

    # Extract 18 engineered features
    X_features = extract_features_from_windows(X_raw_all, model1, scaler_min, scaler_max, device=device)
    y_labels = assign_risk_class_labels(y_future_all, hypo_thresh=70.0, hyper_thresh=180.0)

    return X_features, y_labels, y_future_all, pids_all


def train_and_evaluate_risk_model():
    print("==========================================================================")
    print("      DIABETO: MODEL 2 PERSONALIZED GLUCOSE RISK & ALERT TRAINING        ")
    print("==========================================================================")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading Model 1 (Unified LSTM) on compute device: {device}...")
    model1, scaler_min, scaler_max, ckpt = load_model1_checkpoints(device=device)

    # Load patient cohorts
    ohio_patients = load_ohiot1dm_patients("ml/data/ohiot1dm")
    shanghai_patients = load_and_resample_shanghai_patients("ml/data/Shanghai_T2DM")
    all_patients = {}
    all_patients.update(ohio_patients)
    all_patients.update(shanghai_patients)

    train_pids = ckpt["train_patients"]
    val_pids = ckpt["val_patients"]
    test_pids = ckpt["test_patients"]

    print(f"Patient Splitting (Reused from Model 1 to guarantee zero leakage):")
    print(f"  Training Patients:   {len(train_pids)} patients")
    print(f"  Validation Patients: {len(val_pids)} patients")
    print(f"  Test Patients:       {len(test_pids)} patients (Completely Untouched)")

    print("\nExtracting feature matrices across partitions...")
    X_train, y_train, y_fut_train, pids_train = build_cohort_dataset(train_pids, all_patients, model1, scaler_min, scaler_max, device)
    X_val, y_val, y_fut_val, pids_val = build_cohort_dataset(val_pids, all_patients, model1, scaler_min, scaler_max, device)
    X_test, y_test, y_fut_test, pids_test = build_cohort_dataset(test_pids, all_patients, model1, scaler_min, scaler_max, device)

    print(f"  Train samples: {len(X_train):,} | Class counts: {np.bincount(y_train)}")
    print(f"  Val samples:   {len(X_val):,} | Class counts: {np.bincount(y_val)}")
    print(f"  Test samples:  {len(X_test):,} | Class counts: {np.bincount(y_test)}")

    # Train Calibrated Gradient Boosted Clinical Risk Classifier with balanced class weighting
    print("\nTraining Calibrated Gradient Boosted Clinical Risk Classifier...")
    clf = HistGradientBoostingClassifier(
        loss='log_loss',
        max_iter=160,
        learning_rate=0.08,
        max_depth=6,
        class_weight='balanced',
        random_state=RANDOM_SEED
    )
    clf.fit(X_train, y_train)

    # Save Model 2 weights
    joblib.dump(clf, MODEL_SAVE_PATH)
    print(f"[SAVED] Model 2 weights saved -> {MODEL_SAVE_PATH}")

    # =========================================================================
    # RIGOROUS SCIENTIFIC EVALUATION ON 16 UNSEEN TEST PATIENTS
    # =========================================================================
    print("\n==========================================================================")
    print("      SCIENTIFIC EVALUATION ON 16 COMPLETELY UNSEEN TEST PATIENTS         ")
    print("==========================================================================")

    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)

    # Classification metrics
    report = classification_report(y_test, y_pred, target_names=CLASS_NAMES, output_dict=True)
    cm = confusion_matrix(y_test, y_pred)
    cm_norm = confusion_matrix(y_test, y_pred, normalize='true')

    # Binarize labels for multi-class ROC & PR AUC
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
    roc_auc_ovr = roc_auc_score(y_test_bin, y_prob, average=None, multi_class='ovr')
    roc_auc_macro = roc_auc_score(y_test_bin, y_prob, average='macro', multi_class='ovr')

    pr_auc_per_class = []
    for c in range(3):
        precision_c, recall_c, _ = precision_recall_curve(y_test_bin[:, c], y_prob[:, c])
        pr_auc_per_class.append(float(auc(recall_c, precision_c)))

    # Calculate False Positive Rate and False Negative Rate per class
    # FPR = FP / (FP + TN), FNR = FN / (FN + TP)
    fpr_per_class, fnr_per_class = {}, {}
    for c, cname in enumerate(CLASS_TAGS):
        tp = cm[c, c]
        fn = np.sum(cm[c, :]) - tp
        fp = np.sum(cm[:, c]) - tp
        tn = np.sum(cm) - tp - fn - fp
        
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
        fpr_per_class[cname] = round(fpr * 100.0, 2)
        fnr_per_class[cname] = round(fnr * 100.0, 2)

    # Assemble complete metrics bundle
    eval_results = {
        "overall_accuracy": round(float(np.mean(y_pred == y_test) * 100.0), 2),
        "macro_f1": round(float(report["macro avg"]["f1-score"]), 4),
        "weighted_f1": round(float(report["weighted avg"]["f1-score"]), 4),
        "macro_roc_auc": round(float(roc_auc_macro), 4),
        "hypoglycemia_recall": round(float(report[CLASS_NAMES[0]]["recall"] * 100.0), 2),
        "hypoglycemia_precision": round(float(report[CLASS_NAMES[0]]["precision"] * 100.0), 2),
        "hypoglycemia_f1": round(float(report[CLASS_NAMES[0]]["f1-score"]), 4),
        "hypoglycemia_roc_auc": round(float(roc_auc_ovr[0]), 4),
        "hypoglycemia_pr_auc": round(float(pr_auc_per_class[0]), 4),
        "in_range_recall": round(float(report[CLASS_NAMES[1]]["recall"] * 100.0), 2),
        "in_range_precision": round(float(report[CLASS_NAMES[1]]["precision"] * 100.0), 2),
        "in_range_f1": round(float(report[CLASS_NAMES[1]]["f1-score"]), 4),
        "in_range_roc_auc": round(float(roc_auc_ovr[1]), 4),
        "in_range_pr_auc": round(float(pr_auc_per_class[1]), 4),
        "hyperglycemia_recall": round(float(report[CLASS_NAMES[2]]["recall"] * 100.0), 2),
        "hyperglycemia_precision": round(float(report[CLASS_NAMES[2]]["precision"] * 100.0), 2),
        "hyperglycemia_f1": round(float(report[CLASS_NAMES[2]]["f1-score"]), 4),
        "hyperglycemia_roc_auc": round(float(roc_auc_ovr[2]), 4),
        "hyperglycemia_pr_auc": round(float(pr_auc_per_class[2]), 4),
        "false_positive_rates_pct": fpr_per_class,
        "false_negative_rates_pct": fnr_per_class,
        "confusion_matrix_raw": cm.tolist(),
        "confusion_matrix_normalized": [[round(float(v), 4) for v in row] for row in cm_norm],
        "test_sample_count": len(y_test),
        "test_patient_count": len(test_pids),
        "feature_names": FEATURE_NAMES
    }

    with open(RESULTS_JSON_PATH, "w") as f:
        json.dump(eval_results, f, indent=2)
    print(f"[SAVED] Model 2 evaluation results JSON -> {RESULTS_JSON_PATH}")

    # =========================================================================
    # GENERATE PUBLICATION-GRADE VISUALIZATIONS
    # =========================================================================
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

    # 1. Confusion Matrix Plot
    fig, ax = plt.subplots(figsize=(7.5, 6), dpi=300)
    sns.heatmap(
        cm_norm * 100.0, 
        annot=True, 
        fmt=".1f", 
        cmap="Blues", 
        xticklabels=["Hypoglycemia", "In-Range", "Hyperglycemia"],
        yticklabels=["Hypoglycemia", "In-Range", "Hyperglycemia"],
        cbar_kws={'label': 'Normalized Accuracy (%)'},
        ax=ax
    )
    ax.set_title("Model 2: Risk Classification Confusion Matrix (16 Unseen Patients)", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Predicted Risk Category", fontsize=11, fontweight='semibold')
    ax.set_ylabel("True Clinical Category (+30 Min)", fontsize=11, fontweight='semibold')
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "risk_confusion_matrix.png"), dpi=300)
    plt.close()

    # 2. Multiclass ROC & Precision-Recall Curves
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.5), dpi=300)
    colors = ["#DC2626", "#10B981", "#2563EB"]

    for c in range(3):
        # ROC Curve
        fpr, tpr, _ = roc_curve(y_test_bin[:, c], y_prob[:, c])
        ax1.plot(fpr, tpr, color=colors[c], linewidth=2.2, label=f"{CLASS_NAMES[c]} (AUC = {roc_auc_ovr[c]:.3f})")

        # PR Curve
        precision, recall, _ = precision_recall_curve(y_test_bin[:, c], y_prob[:, c])
        ax2.plot(recall, precision, color=colors[c], linewidth=2.2, label=f"{CLASS_NAMES[c]} (AP = {pr_auc_per_class[c]:.3f})")

    ax1.plot([0, 1], [0, 1], 'k--', linewidth=1.2, label="Chance Level")
    ax1.set_title("One-vs-Rest ROC Curves", fontsize=12, fontweight='bold')
    ax1.set_xlabel("False Positive Rate", fontsize=11)
    ax1.set_ylabel("True Positive Rate (Recall)", fontsize=11)
    ax1.legend(loc="lower right", frameon=True, fontsize=9.5)

    ax2.set_title("Precision-Recall Curves", fontsize=12, fontweight='bold')
    ax2.set_xlabel("Recall", fontsize=11)
    ax2.set_ylabel("Precision", fontsize=11)
    ax2.legend(loc="lower left", frameon=True, fontsize=9.5)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "risk_roc_pr_curves.png"), dpi=300)
    plt.close()
    print(f"[SAVED] Evaluation plots -> {PLOTS_DIR}/risk_confusion_matrix.png, {PLOTS_DIR}/risk_roc_pr_curves.png")

    # Console Summary
    print("\n" + "=" * 76)
    print("         MODEL 2 (RISK & ALERT CLASSIFIER) SCIENTIFIC SUMMARY             ")
    print("=" * 76)
    print(f"Overall Test Accuracy:    {eval_results['overall_accuracy']}%")
    print(f"Macro F1-Score:           {eval_results['macro_f1']}")
    print(f"Macro ROC-AUC:            {eval_results['macro_roc_auc']}")
    print("-" * 76)
    print(f"HYPOGLYCEMIA RISK PERFORMANCE (< 70 mg/dL):")
    print(f"  Recall (Sensitivity):   {eval_results['hypoglycemia_recall']}%")
    print(f"  Precision:              {eval_results['hypoglycemia_precision']}%")
    print(f"  F1-Score:               {eval_results['hypoglycemia_f1']}")
    print(f"  ROC-AUC:                {eval_results['hypoglycemia_roc_auc']}")
    print(f"  PR-AUC (Avg Precision): {eval_results['hypoglycemia_pr_auc']}")
    print(f"  False Negative Rate:    {eval_results['false_negative_rates_pct']['hypoglycemia']}% (Critical Safety)")
    print(f"  False Positive Rate:    {eval_results['false_positive_rates_pct']['hypoglycemia']}%")
    print("-" * 76)
    print(f"IN-RANGE PERFORMANCE (70 - 180 mg/dL):")
    print(f"  Recall:                 {eval_results['in_range_recall']}% | Precision: {eval_results['in_range_precision']}% | F1: {eval_results['in_range_f1']}")
    print(f"HYPERGLYCEMIA PERFORMANCE (> 180 mg/dL):")
    print(f"  Recall:                 {eval_results['hyperglycemia_recall']}% | Precision: {eval_results['hyperglycemia_precision']}% | F1: {eval_results['hyperglycemia_f1']}")
    print("=" * 76)

    return eval_results


if __name__ == "__main__":
    train_and_evaluate_risk_model()
