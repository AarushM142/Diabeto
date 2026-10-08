"""
Diabeto Platform — Feature Extraction Engine for Model 2 (Personalized Risk Classifier)
Combines current CGM telemetry, trend derivatives, volatility, and Model 1 LSTM forecasts.
"""

import os
import sys
import numpy as np
import pandas as pd
import torch
from sklearn.preprocessing import MinMaxScaler
from typing import Dict, List, Tuple

from apps.ml.model import GlucoseLSTM
from apps.ml.unified_data_loader import (
    load_ohiot1dm_patients, 
    load_and_resample_shanghai_patients,
    extract_gap_aware_windows
)

FEATURE_NAMES = [
    "current_glucose",       # G_t (mg/dL)
    "roc_5min",              # 5-min derivative (mg/dL/min)
    "roc_15min",             # 15-min derivative (mg/dL/min)
    "roc_30min",             # 30-min derivative (mg/dL/min)
    "glycemic_accel",        # Acceleration (ROC_5 - ROC_15) / 10
    "std_60min",             # 60-min glucose standard deviation
    "mean_60min",            # 60-min glucose mean
    "min_60min",             # 60-min glucose minimum
    "max_60min",             # 60-min glucose maximum
    "pred_glucose_15m",      # Model 1 +15 min prediction
    "pred_glucose_30m",      # Model 1 +30 min prediction
    "pred_glucose_45m",      # Model 1 +45 min prediction
    "pred_glucose_60m",      # Model 1 +60 min prediction
    "pred_min_trajectory",   # min(pred_15m..60m)
    "pred_max_trajectory",   # max(pred_15m..60m)
    "pred_delta_30m",        # pred_30m - current_glucose
    "dist_to_hypo_70",       # current_glucose - 70
    "dist_to_hyper_180"      # current_glucose - 180
]


def load_model1_checkpoints(model1_path: str = "ml/models/unified_lstm_best.pt", device: str = "cpu"):
    """
    Loads trained Model 1 LSTM and its normalization parameters.
    """
    if not os.path.exists(model1_path):
        raise FileNotFoundError(f"Model 1 weights not found at: {model1_path}")
    
    ckpt = torch.load(model1_path, map_location=device)
    model = GlucoseLSTM(
        input_dim=1,
        hidden_dim=ckpt.get("hidden_dim", 64),
        num_layers=ckpt.get("num_layers", 2),
        dropout=0.2
    ).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    scaler_min = ckpt.get("scaler_min", 39.6)
    scaler_max = ckpt.get("scaler_max", 421.2)

    return model, scaler_min, scaler_max, ckpt


def extract_features_from_windows(
    X_unscaled: np.ndarray, 
    model1: GlucoseLSTM, 
    scaler_min: float, 
    scaler_max: float,
    device: str = "cpu"
) -> np.ndarray:
    """
    Given a batch of unscaled 12-step (60 min) glucose windows (N, 12):
    Computes derivatives, statistical aggregates, and queries Model 1 for multi-horizon forecasts.
    Returns feature matrix (N, 18).
    """
    N = len(X_unscaled)
    if N == 0:
        return np.empty((0, len(FEATURE_NAMES)))

    # 1. Current glucose and historical telemetry features
    G_t = X_unscaled[:, -1]
    G_t_minus_1 = X_unscaled[:, -2]
    G_t_minus_3 = X_unscaled[:, -4]
    G_t_minus_6 = X_unscaled[:, -7]

    roc_5min = (G_t - G_t_minus_1) / 5.0
    roc_15min = (G_t - G_t_minus_3) / 15.0
    roc_30min = (G_t - G_t_minus_6) / 30.0
    glycemic_accel = (roc_5min - roc_15min) / 10.0

    std_60min = np.std(X_unscaled, axis=1)
    mean_60min = np.mean(X_unscaled, axis=1)
    min_60min = np.min(X_unscaled, axis=1)
    max_60min = np.max(X_unscaled, axis=1)

    dist_to_hypo_70 = G_t - 70.0
    dist_to_hyper_180 = G_t - 180.0

    # 2. Query Model 1 for forward multi-horizon predictions
    # Normalize X using Model 1's training scaler
    denom = max(1e-5, scaler_max - scaler_min)
    X_norm = np.clip((X_unscaled - scaler_min) / denom, 0.0, 1.0)
    X_tensor = torch.tensor(X_norm, dtype=torch.float32).unsqueeze(-1).to(device)

    with torch.no_grad():
        preds_norm = model1(X_tensor).cpu().numpy().flatten()
    
    # Invert scaling to true mg/dL
    pred_30m = preds_norm * denom + scaler_min

    # Approximate multi-horizon trajectory based on LSTM 30m forecast & momentum
    pred_15m = G_t + (pred_30m - G_t) * 0.52
    pred_45m = G_t + (pred_30m - G_t) * 1.38
    pred_60m = G_t + (pred_30m - G_t) * 1.65

    pred_stack = np.column_stack([pred_15m, pred_30m, pred_45m, pred_60m])
    pred_min = np.min(pred_stack, axis=1)
    pred_max = np.max(pred_stack, axis=1)
    pred_delta_30m = pred_30m - G_t

    feature_matrix = np.column_stack([
        G_t,
        roc_5min,
        roc_15min,
        roc_30min,
        glycemic_accel,
        std_60min,
        mean_60min,
        min_60min,
        max_60min,
        pred_15m,
        pred_30m,
        pred_45m,
        pred_60m,
        pred_min,
        pred_max,
        pred_delta_30m,
        dist_to_hypo_70,
        dist_to_hyper_180
    ])

    return feature_matrix


def assign_risk_class_labels(y_future: np.ndarray, hypo_thresh: float = 70.0, hyper_thresh: float = 180.0) -> np.ndarray:
    """
    Assigns clinical ground-truth risk categories based on future glucose value:
    0: LOW / Hypoglycemia Risk (< 70 mg/dL)
    1: NORMAL / In-Range Stable (70 - 180 mg/dL)
    2: HIGH / Hyperglycemia Risk (> 180 mg/dL)
    """
    labels = np.ones(len(y_future), dtype=int)  # Default: 1 (Normal)
    labels[y_future < hypo_thresh] = 0           # 0: Hypo
    labels[y_future > hyper_thresh] = 2          # 2: Hyper
    return labels
