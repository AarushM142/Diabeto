"""
Diabeto Platform — Comprehensive Clinical & Statistical Evaluation Engine for CGM Forecasting
"""

import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, mean_absolute_percentage_error
from typing import Dict, Any, List, Tuple


def calculate_metrics_bundle(actuals: np.ndarray, predictions: np.ndarray) -> Dict[str, float]:
    """
    Computes a standardized bundle of statistical & error tolerance metrics.
    """
    if len(actuals) == 0:
        return {
            "rmse": np.nan, "mae": np.nan, "med_ae": np.nan,
            "mape": np.nan, "r2": np.nan, "bias": np.nan,
            "pct_within_10": np.nan, "pct_within_15": np.nan,
            "pct_within_20": np.nan, "pct_within_30": np.nan,
            "sample_count": 0
        }

    errors = predictions - actuals
    abs_errors = np.abs(errors)

    rmse = float(np.sqrt(mean_squared_error(actuals, predictions)))
    mae = float(mean_absolute_error(actuals, predictions))
    med_ae = float(np.median(abs_errors))
    mape = float(mean_absolute_percentage_error(actuals, predictions) * 100.0)
    r2 = float(r2_score(actuals, predictions))
    bias = float(np.mean(errors))

    pct_10 = float((abs_errors <= 10.0).mean() * 100.0)
    pct_15 = float((abs_errors <= 15.0).mean() * 100.0)
    pct_20 = float((abs_errors <= 20.0).mean() * 100.0)
    pct_30 = float((abs_errors <= 30.0).mean() * 100.0)

    return {
        "rmse": round(rmse, 2),
        "mae": round(mae, 2),
        "med_ae": round(med_ae, 2),
        "mape": round(mape, 2),
        "r2": round(r2, 4),
        "bias": round(bias, 2),
        "pct_within_10": round(pct_10, 1),
        "pct_within_15": round(pct_15, 1),
        "pct_within_20": round(pct_20, 1),
        "pct_within_30": round(pct_30, 1),
        "sample_count": int(len(actuals))
    }


def evaluate_forecast_performance(
    actuals: np.ndarray,
    lstm_preds: np.ndarray,
    persistence_preds: np.ndarray,
    patient_ids: np.ndarray,
    last_observed_lookback_diffs: np.ndarray = None  # (N,) change over last 5-min step
) -> Dict[str, Any]:
    """
    Evaluates LSTM predictions vs. Persistence baseline across overall,
    per-patient, glycemic range, and rate-of-change categories.
    """
    # 1. Overall Metrics
    lstm_overall = calculate_metrics_bundle(actuals, lstm_preds)
    persist_overall = calculate_metrics_bundle(actuals, persistence_preds)

    # Calculate Improvement
    mae_diff = persist_overall["mae"] - lstm_overall["mae"]
    mae_pct_imp = (mae_diff / persist_overall["mae"] * 100.0) if persist_overall["mae"] > 0 else 0.0
    rmse_diff = persist_overall["rmse"] - lstm_overall["rmse"]
    rmse_pct_imp = (rmse_diff / persist_overall["rmse"] * 100.0) if persist_overall["rmse"] > 0 else 0.0

    improvement = {
        "mae_improvement_mgdl": round(mae_diff, 2),
        "mae_improvement_pct": round(mae_pct_imp, 2),
        "rmse_improvement_mgdl": round(rmse_diff, 2),
        "rmse_improvement_pct": round(rmse_pct_imp, 2),
        "lstm_beats_persistence": bool(lstm_overall["rmse"] < persist_overall["rmse"])
    }

    # 2. Per-Patient Breakdown
    unique_pids = np.unique(patient_ids)
    per_patient = {}
    for pid in unique_pids:
        mask = (patient_ids == pid)
        p_act = actuals[mask]
        p_lstm = lstm_preds[mask]
        p_persist = persistence_preds[mask]
        per_patient[str(pid)] = {
            "lstm": calculate_metrics_bundle(p_act, p_lstm),
            "persistence": calculate_metrics_bundle(p_act, p_persist)
        }

    # 3. Glycemic Range Breakdown
    # Low: < 70 mg/dL, Normal: 70 - 180 mg/dL, High: > 180 mg/dL
    hypo_mask = (actuals < 70.0)
    normal_mask = ((actuals >= 70.0) & (actuals <= 180.0))
    hyper_mask = (actuals > 180.0)

    range_breakdown = {
        "low_hypo_lt70": {
            "lstm": calculate_metrics_bundle(actuals[hypo_mask], lstm_preds[hypo_mask]),
            "persistence": calculate_metrics_bundle(actuals[hypo_mask], persistence_preds[hypo_mask])
        },
        "target_normal_70_180": {
            "lstm": calculate_metrics_bundle(actuals[normal_mask], lstm_preds[normal_mask]),
            "persistence": calculate_metrics_bundle(actuals[normal_mask], persistence_preds[normal_mask])
        },
        "high_hyper_gt180": {
            "lstm": calculate_metrics_bundle(actuals[hyper_mask], lstm_preds[hyper_mask]),
            "persistence": calculate_metrics_bundle(actuals[hyper_mask], persistence_preds[hyper_mask])
        }
    }

    # 4. Rate of Change Breakdown
    # If last_observed_lookback_diffs provided (change over previous 5-min step, mg/dL/min = diff / 5)
    roc_breakdown = {}
    if last_observed_lookback_diffs is not None:
        roc = last_observed_lookback_diffs / 5.0  # mg/dL per minute
        falling_mask = (roc < -1.5)
        stable_mask = ((roc >= -1.5) & (roc <= 1.5))
        rising_mask = (roc > 1.5)

        roc_breakdown = {
            "rapidly_falling_lt_neg1_5": {
                "lstm": calculate_metrics_bundle(actuals[falling_mask], lstm_preds[falling_mask]),
                "persistence": calculate_metrics_bundle(actuals[falling_mask], persistence_preds[falling_mask])
            },
            "stable_neg1_5_to_pos1_5": {
                "lstm": calculate_metrics_bundle(actuals[stable_mask], lstm_preds[stable_mask]),
                "persistence": calculate_metrics_bundle(actuals[stable_mask], persistence_preds[stable_mask])
            },
            "rapidly_rising_gt_pos1_5": {
                "lstm": calculate_metrics_bundle(actuals[rising_mask], lstm_preds[rising_mask]),
                "persistence": calculate_metrics_bundle(actuals[rising_mask], persistence_preds[rising_mask])
            }
        }

    return {
        "lstm_overall": lstm_overall,
        "persistence_overall": persist_overall,
        "improvement": improvement,
        "per_patient": per_patient,
        "range_breakdown": range_breakdown,
        "roc_breakdown": roc_breakdown
    }
