"""
Diabeto Platform — Unified Multi-Cohort PyTorch LSTM Training & Evaluation Pipeline
Trained on OhioT1DM (Type-1) + ShanghaiT2DM (Type-2) with strict patient-level separation.
"""

import sys
import os

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import json
import math
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import matplotlib.pyplot as plt

from apps.ml.unified_data_loader import prepare_unified_dataloaders
from apps.ml.ohio_data_loader import extract_gap_aware_windows
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
BATCH_SIZE = 128
HIDDEN_DIM = 64
NUM_LAYERS = 2
DROPOUT = 0.2
LEARNING_RATE = 0.001
WEIGHT_DECAY = 1e-5
MAX_EPOCHS = 30
EARLY_STOPPING_PATIENCE = 5

# Paths
MODEL_SAVE_PATH = "ml/models/unified_lstm_best.pt"
RESULTS_JSON_PATH = "ml/results/unified_evaluation_results.json"
PREDICTIONS_CSV_PATH = "ml/results/unified_test_predictions.csv"
PLOTS_DIR = "ml/plots"

os.makedirs("ml/models", exist_ok=True)
os.makedirs("ml/results", exist_ok=True)
os.makedirs(PLOTS_DIR, exist_ok=True)


def evaluate_multi_horizons_unified(model, scaler, all_patients, test_pids, device, lookback_steps=12):
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
            df = all_patients[pid]
            X, y, last_obs, times, raw_y, _ = extract_gap_aware_windows(
                df, lookback_steps=lookback_steps, horizon_steps=h_steps
            )
            if len(X) == 0:
                continue
            
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


def generate_unified_plots(
    actuals, lstm_preds, persist_preds, times, patient_ids, 
    history, horizon_results, results_bundle, ohio_test_pids, shanghai_test_pids
):
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

    # 1. Unseen Ohio T1D Test Trajectory
    ohio_mask = np.isin(patient_ids, ohio_test_pids)
    if np.sum(ohio_mask) > 0:
        fig, ax = plt.subplots(figsize=(14, 6.5), dpi=300)
        n_show = min(300, int(np.sum(ohio_mask)))
        o_act = actuals[ohio_mask][:n_show]
        o_lstm = lstm_preds[ohio_mask][:n_show]
        o_persist = persist_preds[ohio_mask][:n_show]
        time_hours = np.arange(n_show) * 5 / 60.0

        ax.axhspan(70, 180, color='#10B981', alpha=0.12, label='Target Glycemic Range (70-180 mg/dL)')
        ax.axhspan(180, 420, color='#EF4444', alpha=0.08, label='Hyperglycemic Zone (>180 mg/dL)')
        ax.axhspan(0, 70, color='#DC2626', alpha=0.15, label='Hypoglycemic Zone (<70 mg/dL)')

        ax.plot(time_hours, o_act, label='Actual Sensor Glucose (Ground Truth)', color='#0F172A', linewidth=2.2)
        ax.plot(time_hours, o_lstm, label='Unified LSTM (+30 min Forecast)', color='#2563EB', linewidth=2.0)
        ax.plot(time_hours, o_persist, label='Persistence Baseline (+30 min Lag)', color='#EA580C', linewidth=1.6, linestyle='--')

        ax.set_title(f"Unseen Ohio T1D Test Patient Trajectory (+30 Min Horizon)", fontsize=14, fontweight='bold', pad=12)
        ax.set_xlabel("Elapsed Time (Hours)", fontsize=11, fontweight='semibold')
        ax.set_ylabel("Glucose Level (mg/dL)", fontsize=11, fontweight='semibold')
        ax.legend(loc='upper right', frameon=True, fontsize=9.5)
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "unified_timeseries_ohio_test.png"), dpi=300)
        plt.close()

    # 2. Unseen Shanghai T2D Test Trajectory
    shanghai_mask = np.isin(patient_ids, shanghai_test_pids)
    if np.sum(shanghai_mask) > 0:
        fig, ax = plt.subplots(figsize=(14, 6.5), dpi=300)
        # Select first unseen Shanghai test patient
        first_shanghai_pid = shanghai_test_pids[0]
        s_pid_mask = (patient_ids == first_shanghai_pid)
        n_show = min(300, int(np.sum(s_pid_mask)))
        s_act = actuals[s_pid_mask][:n_show]
        s_lstm = lstm_preds[s_pid_mask][:n_show]
        s_persist = persist_preds[s_pid_mask][:n_show]
        time_hours = np.arange(n_show) * 5 / 60.0

        ax.axhspan(70, 180, color='#10B981', alpha=0.12, label='Target Glycemic Range (70-180 mg/dL)')
        ax.axhspan(180, 420, color='#EF4444', alpha=0.08, label='Hyperglycemic Zone (>180 mg/dL)')
        ax.axhspan(0, 70, color='#DC2626', alpha=0.15, label='Hypoglycemic Zone (<70 mg/dL)')

        ax.plot(time_hours, s_act, label='Actual Sensor Glucose (Ground Truth)', color='#0F172A', linewidth=2.2)
        ax.plot(time_hours, s_lstm, label='Unified LSTM (+30 min Forecast)', color='#2563EB', linewidth=2.0)
        ax.plot(time_hours, s_persist, label='Persistence Baseline (+30 min Lag)', color='#EA580C', linewidth=1.6, linestyle='--')

        ax.set_title(f"Unseen Shanghai T2D Test Patient ({first_shanghai_pid}) Trajectory (+30 Min)", fontsize=14, fontweight='bold', pad=12)
        ax.set_xlabel("Elapsed Time (Hours)", fontsize=11, fontweight='semibold')
        ax.set_ylabel("Glucose Level (mg/dL)", fontsize=11, fontweight='semibold')
        ax.legend(loc='upper right', frameon=True, fontsize=9.5)
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "unified_timeseries_shanghai_test.png"), dpi=300)
        plt.close()

    # 3. Residual Error Distribution
    fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)
    lstm_err = lstm_preds - actuals
    persist_err = persist_preds - actuals
    bins = np.linspace(-60, 60, 61)

    ax.hist(persist_err, bins=bins, alpha=0.5, color='#EA580C', density=True, label=f'Persistence Baseline (MAE: {results_bundle["persistence_overall"]["mae"]:.1f} mg/dL)')
    ax.hist(lstm_err, bins=bins, alpha=0.6, color='#2563EB', density=True, label=f'Unified LSTM (MAE: {results_bundle["lstm_overall"]["mae"]:.1f} mg/dL)')
    ax.axvline(0, color='black', linestyle='--', linewidth=1.2, label='Zero Error')

    ax.set_title("Unified Multi-Cohort Forecast Error Residuals (16 Unseen Test Patients)", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Forecast Error: Predicted - Actual (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_ylabel("Probability Density", fontsize=11, fontweight='semibold')
    ax.legend(frameon=True, fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "unified_error_distribution.png"), dpi=300)
    plt.close()

    # 4. Scatter Predicted vs Actual
    fig, ax = plt.subplots(figsize=(8, 7.5), dpi=300)
    # Downsample points for scatter if too large for clean rendering
    sample_indices = np.random.choice(len(actuals), size=min(8000, len(actuals)), replace=False)
    ax.scatter(actuals[sample_indices], lstm_preds[sample_indices], alpha=0.25, s=12, color='#2563EB', edgecolors='none')
    min_val, max_val = 30, 420
    ax.plot([min_val, max_val], [min_val, max_val], 'k--', linewidth=1.5, label='Ideal 1:1 Identity')
    ax.plot([min_val, max_val], [min_val + 15, max_val + 15], 'r:', linewidth=1.0, label='±15 mg/dL Boundary')
    ax.plot([min_val, max_val], [min_val - 15, max_val - 15], 'r:', linewidth=1.0)
    ax.fill_between([min_val, max_val], [min_val - 15, max_val - 15], [min_val + 15, max_val + 15], color='red', alpha=0.06)

    ax.set_title(f"Predicted vs. Actual Glucose across 16 Unseen Test Patients (R² = {results_bundle['lstm_overall']['r2']:.3f})", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Actual Blood Glucose (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_ylabel("LSTM Predicted Glucose (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_xlim(min_val, max_val)
    ax.set_ylim(min_val, max_val)
    ax.legend(loc='upper left', frameon=True, fontsize=9.5)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "unified_scatter_predicted_vs_actual.png"), dpi=300)
    plt.close()

    # 5. Training vs Validation Loss Curves
    fig, ax = plt.subplots(figsize=(8.5, 5), dpi=300)
    epochs_ran = len(history["train_loss"])
    epochs_range = range(1, epochs_ran + 1)
    ax.plot(epochs_range, history["train_loss"], label='Train Loss (MSE - 74 Patients)', color='#2563EB', linewidth=2)
    ax.plot(epochs_range, history["val_loss"], label='Validation Loss (MSE - 16 Unseen Val Patients)', color='#10B981', linewidth=2, linestyle='--')
    best_epoch = int(np.argmin(history["val_loss"])) + 1
    ax.axvline(best_epoch, color='#DC2626', linestyle=':', label=f'Best Val Checkpoint (Epoch {best_epoch})')

    ax.set_title("Unified Multi-Cohort Training: Convergence Over Epochs", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Epoch", fontsize=11, fontweight='semibold')
    ax.set_ylabel("Normalized Mean Squared Error", fontsize=11, fontweight='semibold')
    ax.legend(frameon=True, fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "unified_loss_curves.png"), dpi=300)
    plt.close()

    # 6. Multi-Horizon Degradation Curves
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5), dpi=300)
    h_labels = list(horizon_results.keys())
    mins = [horizon_results[h]["horizon_minutes"] for h in h_labels]
    l_rmse = [horizon_results[h]["lstm_rmse"] for h in h_labels]
    p_rmse = [horizon_results[h]["persist_rmse"] for h in h_labels]
    l_mae = [horizon_results[h]["lstm_mae"] for h in h_labels]
    p_mae = [horizon_results[h]["persist_mae"] for h in h_labels]

    ax1.plot(mins, l_rmse, marker='o', linewidth=2.2, color='#2563EB', label='Unified LSTM')
    ax1.plot(mins, p_rmse, marker='s', linewidth=2.0, color='#EA580C', linestyle='--', label='Persistence Baseline')
    ax1.set_title("RMSE Across Forecasting Horizons (16 Test Patients)", fontsize=12, fontweight='bold')
    ax1.set_xlabel("Horizon (Minutes)", fontsize=11)
    ax1.set_ylabel("RMSE (mg/dL)", fontsize=11)
    ax1.set_xticks(mins)
    ax1.legend(frameon=True)

    ax2.plot(mins, l_mae, marker='o', linewidth=2.2, color='#2563EB', label='Unified LSTM')
    ax2.plot(mins, p_mae, marker='s', linewidth=2.0, color='#EA580C', linestyle='--', label='Persistence Baseline')
    ax2.set_title("MAE Across Forecasting Horizons (16 Test Patients)", fontsize=12, fontweight='bold')
    ax2.set_xlabel("Horizon (Minutes)", fontsize=11)
    ax2.set_ylabel("MAE (mg/dL)", fontsize=11)
    ax2.set_xticks(mins)
    ax2.legend(frameon=True)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "unified_multi_horizon.png"), dpi=300)
    plt.close()


def run_unified_pipeline():
    print("==========================================================================")
    print("   DIABETO: UNIFIED MULTI-COHORT LSTM TRAINING (OhioT1DM + ShanghaiT2DM)   ")
    print("==========================================================================")

    # 1. Load Data with Unified Patient-Level Split
    (
        train_loader, val_loader, test_loader, 
        train_ds, val_ds, test_ds, 
        scaler, split_info
    ) = prepare_unified_dataloaders(
        ohio_dir="ml/data/ohiot1dm",
        shanghai_dir="ml/data/Shanghai_T2DM",
        lookback_steps=LOOKBACK_STEPS,
        horizon_steps=HORIZON_STEPS,
        batch_size=BATCH_SIZE,
        random_seed=RANDOM_SEED
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n[PIPELINE CONFIGURATION]")
    print(f"  Training Cohort:     {len(split_info['train_patients'])} patients | {len(train_ds):,} window sequences")
    print(f"  Validation Cohort:   {len(split_info['val_patients'])} patients | {len(val_ds):,} window sequences")
    print(f"  Held-Out Test Cohort:{len(split_info['test_patients'])} patients | {len(test_ds):,} window sequences")
    print(f"  Input Window:        60 Minutes ({LOOKBACK_STEPS} points @ 5 min)")
    print(f"  Forecast Horizon:    30 Minutes ({HORIZON_STEPS} points ahead)")
    print(f"  Training Scaler:     Min={split_info['scaler_min']:.1f} mg/dL, Max={split_info['scaler_max']:.1f} mg/dL")
    print(f"  Compute Hardware:    {device}")

    # 2. Model, Loss, Optimizer
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

    # 3. Training Loop with Early Stopping on Validation Loss
    history = {"train_loss": [], "val_loss": []}
    best_val_loss = float("inf")
    patience_counter = 0

    print("\n--- Training Progress Across Combined Cohort ---")
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

        # Validation phase on unseen val patients
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

    # 4. Final Evaluation on 16 Completely Unseen Test Patients
    print("\n==========================================================================")
    print("      FINAL EVALUATION ON 16 COMPLETELY UNSEEN TEST PATIENTS             ")
    print("==========================================================================")

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

    test_preds_unscaled = scaler.inverse_transform(np.array(test_preds_norm).reshape(-1, 1)).flatten()
    test_actuals = test_ds.raw_y
    test_persistence = test_ds.last_obs
    test_pids = test_ds.patient_ids
    test_times = test_ds.timestamps

    # Last step difference for rate-of-change
    X_test_unscaled = scaler.inverse_transform(test_ds.X.squeeze(-1).numpy().reshape(-1, 1)).reshape(test_ds.X.shape[0], -1)
    last_step_diffs = X_test_unscaled[:, -1] - X_test_unscaled[:, -2]

    results = evaluate_forecast_performance(
        actuals=test_actuals,
        lstm_preds=test_preds_unscaled,
        persistence_preds=test_persistence,
        patient_ids=test_pids,
        last_observed_lookback_diffs=last_step_diffs
    )

    # Cohort-Specific Metrics
    ohio_mask = np.isin(test_pids, split_info["ohio_test_patients"])
    shanghai_mask = np.isin(test_pids, split_info["shanghai_test_patients"])

    results["cohort_breakdown"] = {
        "ohio_t1d": {
            "lstm": calculate_metrics_bundle(test_actuals[ohio_mask], test_preds_unscaled[ohio_mask]),
            "persistence": calculate_metrics_bundle(test_actuals[ohio_mask], test_persistence[ohio_mask]),
            "patient_count": len(split_info["ohio_test_patients"])
        },
        "shanghai_t2d": {
            "lstm": calculate_metrics_bundle(test_actuals[shanghai_mask], test_preds_unscaled[shanghai_mask]),
            "persistence": calculate_metrics_bundle(test_actuals[shanghai_mask], test_persistence[shanghai_mask]),
            "patient_count": len(split_info["shanghai_test_patients"])
        }
    }

    # Multi-horizon evaluation across all 16 test patients
    horizon_results = evaluate_multi_horizons_unified(
        model=model,
        scaler=scaler,
        all_patients=split_info["all_patients"],
        test_pids=split_info["test_patients"],
        device=device,
        lookback_steps=LOOKBACK_STEPS
    )
    results["multi_horizon"] = horizon_results
    results["dataset_split"] = {
        "n_train_patients": len(split_info["train_patients"]),
        "n_val_patients": len(split_info["val_patients"]),
        "n_test_patients": len(split_info["test_patients"]),
        "n_train_samples": len(train_ds),
        "n_val_samples": len(val_ds),
        "n_test_samples": len(test_ds)
    }

    # Save JSON & Predictions
    with open(RESULTS_JSON_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n[SAVED] Unified evaluation results JSON -> {RESULTS_JSON_PATH}")

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
    print(f"[SAVED] Unified test predictions CSV -> {PREDICTIONS_CSV_PATH}")

    # Generate Plots
    generate_unified_plots(
        actuals=test_actuals,
        lstm_preds=test_preds_unscaled,
        persist_preds=test_persistence,
        times=test_times,
        patient_ids=test_pids,
        history=history,
        horizon_results=horizon_results,
        results_bundle=results,
        ohio_test_pids=split_info["ohio_test_patients"],
        shanghai_test_pids=split_info["shanghai_test_patients"]
    )
    print(f"[SAVED] High-resolution evaluation plots generated in: {PLOTS_DIR}/")

    # Print Final Summary Report
    print("\n" + "=" * 78)
    print("           UNIFIED MULTI-COHORT (OhioT1DM + ShanghaiT2DM) FINAL REPORT            ")
    print("=" * 78)
    print(f"Total Cohort Patients:    106 unique clinical patients")
    print(f"Training Patients:        {len(split_info['train_patients'])} ({len(train_ds):,} windows)")
    print(f"Validation Patients:      {len(split_info['val_patients'])} ({len(val_ds):,} windows)")
    print(f"Held-Out Test Patients:   {len(split_info['test_patients'])} ({len(test_ds):,} windows across 16 unseen patients)")
    print(f"Sampling Harmonization:   Continuous 5-Minute Grid")
    print(f"Input / Target Window:    60-Min Lookback -> 30-Min Forward Prediction")
    print("-" * 78)
    print(f"OVERALL TEST PERFORMANCE ON 16 UNSEEN PATIENTS (+30 MIN):")
    print(f"  LSTM MAE:               {results['lstm_overall']['mae']} mg/dL (Persistence: {results['persistence_overall']['mae']} mg/dL)")
    print(f"  LSTM RMSE:              {results['lstm_overall']['rmse']} mg/dL (Persistence: {results['persistence_overall']['rmse']} mg/dL)")
    print(f"  LSTM R² Score:          {results['lstm_overall']['r2']} (Persistence: {results['persistence_overall']['r2']})")
    print(f"  LSTM MAPE:              {results['lstm_overall']['mape']}% (Persistence: {results['persistence_overall']['mape']}%)")
    print(f"  MAE Improvement:        {results['improvement']['mae_improvement_mgdl']} mg/dL ({results['improvement']['mae_improvement_pct']}%)")
    print(f"  RMSE Improvement:       {results['improvement']['rmse_improvement_mgdl']} mg/dL ({results['improvement']['rmse_improvement_pct']}%)")
    print(f"  LSTM Beats Persistence: {'YES' if results['improvement']['lstm_beats_persistence'] else 'NO'}")
    print("-" * 78)
    print(f"COHORT-SPECIFIC BREAKDOWN ON UNSEEN PATIENTS:")
    o_res = results['cohort_breakdown']['ohio_t1d']
    s_res = results['cohort_breakdown']['shanghai_t2d']
    print(f"  Ohio T1D Unseen Test:      LSTM RMSE={o_res['lstm']['rmse']} mg/dL, MAE={o_res['lstm']['mae']} mg/dL | Persist RMSE={o_res['persistence']['rmse']} mg/dL, MAE={o_res['persistence']['mae']} mg/dL")
    print(f"  Shanghai T2D Unseen Test:  LSTM RMSE={s_res['lstm']['rmse']} mg/dL, MAE={s_res['lstm']['mae']} mg/dL | Persist RMSE={s_res['persistence']['rmse']} mg/dL, MAE={s_res['persistence']['mae']} mg/dL")
    print("-" * 78)
    print(f"MULTI-HORIZON EVALUATION (16 Unseen Test Patients):")
    for hname, hdata in results["multi_horizon"].items():
        print(f"  {hname:20s}: LSTM RMSE={hdata['lstm_rmse']:5.2f}, MAE={hdata['lstm_mae']:5.2f} | Persist RMSE={hdata['persist_rmse']:5.2f}, MAE={hdata['persist_mae']:5.2f}")
    print("=" * 78)


if __name__ == "__main__":
    run_unified_pipeline()
