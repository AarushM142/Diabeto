"""
Diabeto Platform — Scientific PyTorch LSTM Training & Evaluation on OhioT1DM Dataset
Rigorous patient-level splitting, gap-aware sequence extraction, and honest baseline comparison.
"""

import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import json
import math
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import matplotlib.pyplot as plt

from apps.ml.ohio_data_loader import prepare_ohio_dataloaders, extract_gap_aware_windows, parse_ohiot1dm_directory
from apps.ml.model import GlucoseLSTM
from apps.ml.evaluate import evaluate_forecast_performance, calculate_metrics_bundle

# Set deterministic random seeds
RANDOM_SEED = 42
torch.manual_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(RANDOM_SEED)

# Hyperparameters
LOOKBACK_STEPS = 12       # 12 * 5-min = 60 minutes history
HORIZON_STEPS = 6         # 6 * 5-min = 30 minutes forecast horizon
BATCH_SIZE = 64
HIDDEN_DIM = 64
NUM_LAYERS = 2
DROPOUT = 0.2
LEARNING_RATE = 0.001
WEIGHT_DECAY = 1e-5
MAX_EPOCHS = 35
EARLY_STOPPING_PATIENCE = 6

# Paths
DATA_DIR = "ml/data/ohiot1dm"
MODEL_SAVE_PATH = "ml/models/ohio_lstm_best.pt"
RESULTS_JSON_PATH = "ml/results/ohio_evaluation_results.json"
PREDICTIONS_CSV_PATH = "ml/results/ohio_test_predictions.csv"
PLOTS_DIR = "ml/plots"

os.makedirs("ml/models", exist_ok=True)
os.makedirs("ml/results", exist_ok=True)
os.makedirs(PLOTS_DIR, exist_ok=True)


def evaluate_multi_horizons(model, scaler, patient_dfs, test_pids, device, lookback_steps=12):
    """
    Evaluates model across multiple forecast horizons (15m, 30m, 45m, 60m).
    """
    horizons = {
        "15_min (+3 steps)": 3,
        "30_min (+6 steps)": 6,
        "45_min (+9 steps)": 9,
        "60_min (+12 steps)": 12
    }
    horizon_results = {}

    model.eval()
    for h_name, h_steps in horizons.items():
        all_act, all_lstm, all_persist = [], [], []
        for pid in test_pids:
            df = patient_dfs[pid]
            X, y, last_obs, times, raw_y, _ = extract_gap_aware_windows(
                df, lookback_steps=lookback_steps, horizon_steps=h_steps
            )
            if len(X) == 0:
                continue
            
            # Normalize X with training scaler
            X_norm = scaler.transform(X.reshape(-1, 1)).reshape(X.shape)
            X_tensor = torch.tensor(X_norm, dtype=torch.float32).unsqueeze(-1).to(device)
            
            with torch.no_grad():
                preds_norm = model(X_tensor).cpu().numpy().flatten()
            
            preds_unscaled = scaler.inverse_transform(preds_norm.reshape(-1, 1)).flatten()
            all_act.extend(raw_y)
            all_lstm.extend(preds_unscaled)
            all_persist.extend(last_obs)

        all_act = np.array(all_act)
        all_lstm = np.array(all_lstm)
        all_persist = np.array(all_persist)

        lstm_metrics = calculate_metrics_bundle(all_act, all_lstm)
        persist_metrics = calculate_metrics_bundle(all_act, all_persist)

        horizon_results[h_name] = {
            "horizon_minutes": h_steps * 5,
            "lstm_rmse": lstm_metrics["rmse"],
            "lstm_mae": lstm_metrics["mae"],
            "lstm_r2": lstm_metrics["r2"],
            "persist_rmse": persist_metrics["rmse"],
            "persist_mae": persist_metrics["mae"],
            "persist_r2": persist_metrics["r2"],
            "sample_count": len(all_act)
        }

    return horizon_results


def generate_publication_plots(
    actuals, lstm_preds, persist_preds, times, patient_ids, 
    history, horizon_results, results_bundle
):
    """
    Generates 6 high-resolution publication & demo plots.
    """
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

    # 1. Continuous Time-Series Test Period Plot (First 300 steps = 25 hours)
    fig, ax = plt.subplots(figsize=(14, 6.5), dpi=300)
    n_show = min(300, len(actuals))
    time_indices = np.arange(n_show) * 5 / 60.0  # Hours

    # Glycemic bands
    ax.axhspan(70, 180, color='#10B981', alpha=0.12, label='Target Glycemic Range (70-180 mg/dL)')
    ax.axhspan(180, 420, color='#EF4444', alpha=0.08, label='Hyperglycemic Zone (>180 mg/dL)')
    ax.axhspan(0, 70, color='#DC2626', alpha=0.15, label='Hypoglycemic Zone (<70 mg/dL)')

    ax.plot(time_indices, actuals[:n_show], label='Actual CGM Glucose (Ground Truth)', color='#0F172A', linewidth=2.2)
    ax.plot(time_indices, lstm_preds[:n_show], label='Diabeto LSTM Forecast (+30 min)', color='#2563EB', linewidth=2.0, linestyle='-')
    ax.plot(time_indices, persist_preds[:n_show], label='Persistence Baseline (+30 min lag)', color='#EA580C', linewidth=1.6, linestyle='--')

    ax.axhline(180, color='#DC2626', linestyle=':', linewidth=1.0)
    ax.axhline(70, color='#991B1B', linestyle=':', linewidth=1.0)

    ax.set_title("OhioT1DM Test Patient Glucose Trajectory: LSTM vs. Persistence Baseline (+30 Min)", fontsize=14, fontweight='bold', pad=12)
    ax.set_xlabel("Elapsed Time (Hours)", fontsize=11, fontweight='semibold')
    ax.set_ylabel("Sensor Blood Glucose (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_ylim(40, 360)
    ax.set_xlim(0, time_indices[-1])
    ax.legend(loc='upper right', frameon=True, framealpha=0.95, fontsize=9.5)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "ohio_timeseries_forecast.png"), dpi=300)
    plt.close()

    # 2. Residual Error Distribution (LSTM vs. Persistence)
    fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)
    lstm_err = lstm_preds - actuals
    persist_err = persist_preds - actuals

    bins = np.linspace(-60, 60, 61)
    ax.hist(persist_err, bins=bins, alpha=0.5, color='#EA580C', density=True, label=f'Persistence Baseline (MAE: {results_bundle["persistence_overall"]["mae"]:.1f} mg/dL)')
    ax.hist(lstm_err, bins=bins, alpha=0.6, color='#2563EB', density=True, label=f'LSTM Forecast (MAE: {results_bundle["lstm_overall"]["mae"]:.1f} mg/dL)')
    ax.axvline(0, color='black', linestyle='--', linewidth=1.2, label='Zero Error')

    ax.set_title("Forecast Error Residual Distribution (+30 Min Horizon)", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Forecast Error: Predicted - Actual (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_ylabel("Probability Density", fontsize=11, fontweight='semibold')
    ax.legend(frameon=True, fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "ohio_error_distribution.png"), dpi=300)
    plt.close()

    # 3. Predicted vs. Actual Scatter Plot
    fig, ax = plt.subplots(figsize=(8, 7.5), dpi=300)
    ax.scatter(actuals, lstm_preds, alpha=0.25, s=12, color='#2563EB', edgecolors='none', label='Test Predictions')
    min_val, max_val = 30, 410
    ax.plot([min_val, max_val], [min_val, max_val], 'k--', linewidth=1.5, label='Ideal 1:1 Identity')
    ax.plot([min_val, max_val], [min_val + 15, max_val + 15], 'r:', linewidth=1.0, label='±15 mg/dL Boundary')
    ax.plot([min_val, max_val], [min_val - 15, max_val - 15], 'r:', linewidth=1.0)
    ax.fill_between([min_val, max_val], [min_val - 15, max_val - 15], [min_val + 15, max_val + 15], color='red', alpha=0.06)

    ax.set_title(f"OhioT1DM Test: Predicted vs. Actual Glucose (R² = {results_bundle['lstm_overall']['r2']:.3f})", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Actual CGM Glucose (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_ylabel("LSTM Predicted Glucose (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_xlim(min_val, max_val)
    ax.set_ylim(min_val, max_val)
    ax.legend(loc='upper left', frameon=True, fontsize=9.5)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "ohio_predicted_vs_actual_scatter.png"), dpi=300)
    plt.close()

    # 4. Error vs Actual Glucose
    fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)
    ax.scatter(actuals, np.abs(lstm_err), alpha=0.3, s=14, color='#6366F1', label='LSTM Absolute Error')
    
    # Calculate binned mean error
    bins_val = np.linspace(40, 360, 17)
    bin_centers = 0.5 * (bins_val[:-1] + bins_val[1:])
    binned_mae = [np.mean(np.abs(lstm_err[(actuals >= bins_val[k]) & (actuals < bins_val[k+1])])) 
                  if np.sum((actuals >= bins_val[k]) & (actuals < bins_val[k+1])) > 5 else np.nan 
                  for k in range(len(bins_val)-1)]
    ax.plot(bin_centers, binned_mae, color='#DC2626', linewidth=2.5, marker='o', label='Mean Absolute Error by Glucose Level')

    ax.set_title("Prediction Error vs. Actual Blood Glucose Level", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Actual Blood Glucose (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_ylabel("Absolute Forecast Error (mg/dL)", fontsize=11, fontweight='semibold')
    ax.legend(frameon=True, fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "ohio_error_vs_actual.png"), dpi=300)
    plt.close()

    # 5. Training & Validation Loss Curves
    fig, ax = plt.subplots(figsize=(8.5, 5), dpi=300)
    epochs_ran = len(history["train_loss"])
    epochs_range = range(1, epochs_ran + 1)
    ax.plot(epochs_range, history["train_loss"], label='Train Loss (MSE)', color='#2563EB', linewidth=2)
    ax.plot(epochs_range, history["val_loss"], label='Validation Loss (MSE - Patient Level)', color='#10B981', linewidth=2, linestyle='--')
    best_epoch = int(np.argmin(history["val_loss"])) + 1
    ax.axvline(best_epoch, color='#DC2626', linestyle=':', label=f'Best Val Checkpoint (Epoch {best_epoch})')

    ax.set_title("PyTorch LSTM Convergence: Training vs. Validation Loss (OhioT1DM)", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Epoch", fontsize=11, fontweight='semibold')
    ax.set_ylabel("Normalized Mean Squared Error", fontsize=11, fontweight='semibold')
    ax.legend(frameon=True, fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "ohio_loss_curves.png"), dpi=300)
    plt.close()

    # 6. Multi-Horizon Degradation Plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5), dpi=300)
    h_labels = list(horizon_results.keys())
    mins = [horizon_results[h]["horizon_minutes"] for h in h_labels]
    l_rmse = [horizon_results[h]["lstm_rmse"] for h in h_labels]
    p_rmse = [horizon_results[h]["persist_rmse"] for h in h_labels]
    l_mae = [horizon_results[h]["lstm_mae"] for h in h_labels]
    p_mae = [horizon_results[h]["persist_mae"] for h in h_labels]

    # RMSE subplot
    ax1.plot(mins, l_rmse, marker='o', linewidth=2.2, color='#2563EB', label='LSTM Model')
    ax1.plot(mins, p_rmse, marker='s', linewidth=2.0, color='#EA580C', linestyle='--', label='Persistence Baseline')
    ax1.set_title("RMSE Across Forecasting Horizons", fontsize=12, fontweight='bold')
    ax1.set_xlabel("Horizon (Minutes)", fontsize=11)
    ax1.set_ylabel("RMSE (mg/dL)", fontsize=11)
    ax1.set_xticks(mins)
    ax1.legend(frameon=True)

    # MAE subplot
    ax2.plot(mins, l_mae, marker='o', linewidth=2.2, color='#2563EB', label='LSTM Model')
    ax2.plot(mins, p_mae, marker='s', linewidth=2.0, color='#EA580C', linestyle='--', label='Persistence Baseline')
    ax2.set_title("MAE Across Forecasting Horizons", fontsize=12, fontweight='bold')
    ax2.set_xlabel("Horizon (Minutes)", fontsize=11)
    ax2.set_ylabel("MAE (mg/dL)", fontsize=11)
    ax2.set_xticks(mins)
    ax2.legend(frameon=True)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "ohio_multi_horizon.png"), dpi=300)
    plt.close()


def run_pipeline():
    print("==========================================================================")
    print("      DIABETO: OHIOT1DM REAL CLINICAL CGM TIME-SERIES LSTM PIPELINE       ")
    print("==========================================================================")

    # 1. Load Data with Patient-Level Split
    (
        train_loader, val_loader, test_loader, 
        train_ds, val_ds, test_ds, 
        scaler, split_info
    ) = prepare_ohio_dataloaders(
        data_dir=DATA_DIR,
        lookback_steps=LOOKBACK_STEPS,
        horizon_steps=HORIZON_STEPS,
        batch_size=BATCH_SIZE,
        random_seed=RANDOM_SEED,
        train_ratio=0.70,
        val_ratio=0.15
    )

    print(f"\n[DATASET SPLIT OVERVIEW]")
    print(f"  Total Patients:     {len(split_info['all_patients'])} ({split_info['all_patients']})")
    print(f"  Training Patients:   {len(split_info['train_patients'])} -> {split_info['train_patients']}")
    print(f"  Validation Patient:  {len(split_info['val_patients'])} -> {split_info['val_patients']}")
    print(f"  Test Patient:        {len(split_info['test_patients'])} -> {split_info['test_patients']}")
    print(f"  Window Sequences:    Train={len(train_ds):,} | Val={len(val_ds):,} | Test={len(test_ds):,}")
    print(f"  Sampling Interval:   5 Minutes")
    print(f"  Lookback Window:     {LOOKBACK_STEPS * 5} Minutes ({LOOKBACK_STEPS} points)")
    print(f"  Forecast Horizon:    {HORIZON_STEPS * 5} Minutes ({HORIZON_STEPS} points)")
    print(f"  Scaler Bounds:       Min={split_info['scaler_min']:.1f} mg/dL, Max={split_info['scaler_max']:.1f} mg/dL (Fit ONLY on Train)")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"  Compute Hardware:    {device}")

    # 2. Initialize Model, Loss, Optimizer & Scheduler
    model = GlucoseLSTM(
        input_dim=1,
        hidden_dim=HIDDEN_DIM,
        num_layers=NUM_LAYERS,
        dropout=DROPOUT
    ).to(device)

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.5, patience=2
    )

    # 3. Training Loop with Early Stopping strictly on Validation Loss
    history = {"train_loss": [], "val_loss": []}
    best_val_loss = float("inf")
    patience_counter = 0

    print("\n--- Model Training & Validation Progress ---")
    for epoch in range(1, MAX_EPOCHS + 1):
        model.train()
        train_loss = 0.0
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            optimizer.zero_grad()
            preds = model(X_batch)
            loss = criterion(preds, y_batch)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(X_batch)
        
        train_loss /= len(train_ds)

        # Validation phase (ZERO test set usage)
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch, y_batch = X_batch.to(device), y_batch.to(device)
                preds = model(X_batch)
                loss = criterion(preds, y_batch)
                val_loss += loss.item() * len(X_batch)
        val_loss /= len(val_ds)

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        scheduler.step(val_loss)

        # Check early stopping and checkpointing
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'val_loss': val_loss,
                'scaler_min': split_info['scaler_min'],
                'scaler_max': split_info['scaler_max'],
                'lookback': LOOKBACK_STEPS,
                'horizon': HORIZON_STEPS,
                'hidden_dim': HIDDEN_DIM,
                'num_layers': NUM_LAYERS,
                'train_patients': split_info['train_patients'],
                'val_patients': split_info['val_patients'],
                'test_patients': split_info['test_patients']
            }, MODEL_SAVE_PATH)
            status_tag = " * [Saved Best Checkpoint]"
        else:
            patience_counter += 1
            status_tag = f" (Patience: {patience_counter}/{EARLY_STOPPING_PATIENCE})"

        current_lr = optimizer.param_groups[0]['lr']
        print(f"Epoch [{epoch:02d}/{MAX_EPOCHS:02d}] - Train Loss: {train_loss:.6f} | Val Loss: {val_loss:.6f} | LR: {current_lr:.6f}{status_tag}")

        if patience_counter >= EARLY_STOPPING_PATIENCE:
            print(f"\n[Early Stopping Triggered at Epoch {epoch}] Best Val Loss: {best_val_loss:.6f}")
            break

    # 4. Final Evaluation on Untouched Test Patients
    print("\n==========================================================================")
    print("         FINAL EVALUATION ON COMPLETELY UNTOUCHED TEST PATIENT(S)        ")
    print("==========================================================================")

    # Load best checkpoint
    checkpoint = torch.load(MODEL_SAVE_PATH, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    print(f"Loaded best checkpoint from Epoch {checkpoint['epoch']} (Val Loss: {checkpoint['val_loss']:.6f})")

    test_preds_norm = []
    with torch.no_grad():
        for X_batch, _ in test_loader:
            X_batch = X_batch.to(device)
            preds = model(X_batch)
            test_preds_norm.extend(preds.cpu().numpy())

    # Invert scaling to true mg/dL
    test_preds_unscaled = scaler.inverse_transform(np.array(test_preds_norm).reshape(-1, 1)).flatten()
    test_actuals = test_ds.raw_y
    test_persistence = test_ds.last_obs
    test_pids = test_ds.patient_ids
    test_times = test_ds.timestamps

    # Calculate rate of change over the last 5-min step before the forecast
    # We can extract the diff between the last two points in X_test
    X_test_unscaled = scaler.inverse_transform(test_ds.X.squeeze(-1).numpy().reshape(-1, 1)).reshape(test_ds.X.shape[0], -1)
    last_step_diffs = X_test_unscaled[:, -1] - X_test_unscaled[:, -2]

    # Run comprehensive evaluation
    results = evaluate_forecast_performance(
        actuals=test_actuals,
        lstm_preds=test_preds_unscaled,
        persistence_preds=test_persistence,
        patient_ids=test_pids,
        last_observed_lookback_diffs=last_step_diffs
    )

    # Multi-horizon evaluation
    horizon_results = evaluate_multi_horizons(
        model=model,
        scaler=scaler,
        patient_dfs=split_info['patient_dfs'],
        test_pids=split_info['test_patients'],
        device=device,
        lookback_steps=LOOKBACK_STEPS
    )
    results["multi_horizon"] = horizon_results
    results["dataset_split"] = {
        "all_patients": split_info["all_patients"],
        "train_patients": split_info["train_patients"],
        "val_patients": split_info["val_patients"],
        "test_patients": split_info["test_patients"],
        "n_train_samples": len(train_ds),
        "n_val_samples": len(val_ds),
        "n_test_samples": len(test_ds)
    }

    # Save results JSON and predictions CSV
    with open(RESULTS_JSON_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n[SAVED] Comprehensive results JSON -> {RESULTS_JSON_PATH}")

    pred_df = pd.DataFrame({
        "timestamp": [str(t) for t in test_times],
        "patient_id": test_pids,
        "actual_glucose": test_actuals.round(1),
        "lstm_predicted": test_preds_unscaled.round(1),
        "persistence_predicted": test_persistence.round(1),
        "lstm_error": (test_preds_unscaled - test_actuals).round(1),
        "persistence_error": (test_persistence - test_actuals).round(1)
    })
    pred_df.to_csv(PREDICTIONS_CSV_PATH, index=False)
    print(f"[SAVED] Test predictions CSV -> {PREDICTIONS_CSV_PATH}")

    # Generate publication-grade plots
    generate_publication_plots(
        actuals=test_actuals,
        lstm_preds=test_preds_unscaled,
        persist_preds=test_persistence,
        times=test_times,
        patient_ids=test_pids,
        history=history,
        horizon_results=horizon_results,
        results_bundle=results
    )
    print(f"[SAVED] All 6 evaluation plots generated in: {PLOTS_DIR}/")

    # Print Formatted Console Report
    print("\n" + "=" * 76)
    print("                     FINAL SCIENTIFIC AUDIT REPORT                        ")
    print("=" * 76)
    print(f"Dataset:                  OhioT1DM Clinical Type-1 Diabetes")
    print(f"Total Patients:           {len(split_info['all_patients'])}")
    print(f"Training Patients:        {split_info['train_patients']} ({len(train_ds):,} windows)")
    print(f"Validation Patients:      {split_info['val_patients']} ({len(val_ds):,} windows)")
    print(f"Test Patients:            {split_info['test_patients']} ({len(test_ds):,} windows)")
    print(f"CGM Sampling Interval:    5 Minutes")
    print(f"Input History (Lookback): 60 Minutes (12 steps)")
    print(f"Forecast Horizon:         30 Minutes (6 steps ahead)")
    print("-" * 76)
    print(f"LSTM MODEL PERFORMANCE (+30 MIN):")
    print(f"  MAE:                    {results['lstm_overall']['mae']} mg/dL")
    print(f"  RMSE:                   {results['lstm_overall']['rmse']} mg/dL")
    print(f"  R² Score:               {results['lstm_overall']['r2']}")
    print(f"  MAPE:                   {results['lstm_overall']['mape']}%")
    print(f"  Median Absolute Error:  {results['lstm_overall']['med_ae']} mg/dL")
    print(f"  Mean Bias:              {results['lstm_overall']['bias']} mg/dL")
    print(f"  Accuracy within ±10:    {results['lstm_overall']['pct_within_10']}%")
    print(f"  Accuracy within ±15:    {results['lstm_overall']['pct_within_15']}%")
    print(f"  Accuracy within ±20:    {results['lstm_overall']['pct_within_20']}%")
    print(f"  Accuracy within ±30:    {results['lstm_overall']['pct_within_30']}%")
    print("-" * 76)
    print(f"PERSISTENCE BASELINE (+30 MIN):")
    print(f"  MAE:                    {results['persistence_overall']['mae']} mg/dL")
    print(f"  RMSE:                   {results['persistence_overall']['rmse']} mg/dL")
    print(f"  R² Score:               {results['persistence_overall']['r2']}")
    print(f"  MAPE:                   {results['persistence_overall']['mape']}%")
    print("-" * 76)
    print(f"HONEST COMPARISON & IMPROVEMENT OVER PERSISTENCE:")
    print(f"  MAE Improvement:        {results['improvement']['mae_improvement_mgdl']} mg/dL ({results['improvement']['mae_improvement_pct']}%)")
    print(f"  RMSE Improvement:       {results['improvement']['rmse_improvement_mgdl']} mg/dL ({results['improvement']['rmse_improvement_pct']}%)")
    print(f"  LSTM Beats Baseline?:   {'YES' if results['improvement']['lstm_beats_persistence'] else 'NO'}")
    print("-" * 76)
    print(f"PER-PATIENT BREAKDOWN:")
    for pid, pdata in results["per_patient"].items():
        print(f"  Patient {pid}: LSTM MAE={pdata['lstm']['mae']} | LSTM RMSE={pdata['lstm']['rmse']} | LSTM R²={pdata['lstm']['r2']}")
        print(f"               Persist MAE={pdata['persistence']['mae']} | Persist RMSE={pdata['persistence']['rmse']} | Persist R²={pdata['persistence']['r2']}")
    print("-" * 76)
    print(f"GLYCEMIC RANGE BREAKDOWN (LSTM vs Persistence):")
    for rname, rdata in results["range_breakdown"].items():
        print(f"  [{rname}] (N={rdata['lstm']['sample_count']}):")
        print(f"    LSTM:    MAE={rdata['lstm']['mae']} mg/dL | RMSE={rdata['lstm']['rmse']} mg/dL | Bias={rdata['lstm']['bias']}")
        print(f"    Persist: MAE={rdata['persistence']['mae']} mg/dL | RMSE={rdata['persistence']['rmse']} mg/dL | Bias={rdata['persistence']['bias']}")
    print("-" * 76)
    print(f"RATE-OF-CHANGE DYNAMICS BREAKDOWN (LSTM vs Persistence):")
    for roc_name, roc_data in results["roc_breakdown"].items():
        print(f"  [{roc_name}] (N={roc_data['lstm']['sample_count']}):")
        print(f"    LSTM:    MAE={roc_data['lstm']['mae']} mg/dL | RMSE={roc_data['lstm']['rmse']} mg/dL")
        print(f"    Persist: MAE={roc_data['persistence']['mae']} mg/dL | RMSE={roc_data['persistence']['rmse']} mg/dL")
    print("-" * 76)
    print(f"MULTI-HORIZON EVALUATION:")
    for hname, hdata in results["multi_horizon"].items():
        print(f"  {hname:20s}: LSTM RMSE={hdata['lstm_rmse']:5.2f}, MAE={hdata['lstm_mae']:5.2f} | Persist RMSE={hdata['persist_rmse']:5.2f}, MAE={hdata['persist_mae']:5.2f}")
    print("=" * 76)


if __name__ == "__main__":
    run_pipeline()
