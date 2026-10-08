"""
Diabeto Platform — PyTorch LSTM Time-Series CGM Glucose Forecasting
Teammate 4 Production Training & Evaluation Script
"""

import os
import math
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error

# Set random seeds for deterministic reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Configuration Hyperparameters
LOOKBACK_STEPS = 12       # 12 steps * 5-min intervals = 60 minutes history
PREDICT_STEPS = 6         # 6 steps * 5-min intervals = 30 minutes forecast horizon
BATCH_SIZE = 32
HIDDEN_DIM = 64
NUM_LAYERS = 2
LEARNING_RATE = 0.001
EPOCHS = 45
DATA_PATH = "ml/data/cgm_demo_data.csv"
MODEL_SAVE_PATH = "ml/models/cgm_lstm_model.pt"
PREDICTION_PLOT_PATH = "ml/plots/cgm_prediction_chart.png"
LOSS_PLOT_PATH = "ml/plots/loss_curve.png"
ERROR_PLOT_PATH = "ml/plots/error_distribution.png"

# Ensure output directories exist
os.makedirs("ml/data", exist_ok=True)
os.makedirs("ml/models", exist_ok=True)
os.makedirs("ml/plots", exist_ok=True)


def generate_realistic_cgm_dataset(n_points: int = 2880) -> pd.DataFrame:
    """
    Generates a physiologically realistic Continuous Glucose Monitoring (CGM) dataset
    for a Type-2 Diabetes patient over 10 days at 5-minute intervals.
    Includes circadian baseline, meal-induced glucose spikes, insulin responses,
    dawn phenomenon, and sensor noise.
    """
    print(f"Generating realistic clinical CGM dataset ({n_points} samples, 5-min sampling)...")
    
    start_time = pd.Timestamp("2026-09-01 00:00:00")
    timestamps = [start_time + pd.Timedelta(minutes=5 * i) for i in range(n_points)]
    
    glucose_levels = []
    current_glucose = 125.0
    
    for i, ts in enumerate(timestamps):
        # Time of day in decimal hours (0.0 to 24.0)
        hour = ts.hour + ts.minute / 60.0
        
        # Basal circadian rhythm (higher in early morning due to Dawn Phenomenon, lower overnight)
        circadian_base = 115.0 + 10.0 * np.sin((hour - 4.0) * np.pi / 12.0)
        
        # Meal spikes modeling (Breakfast ~08:00, Lunch ~13:00, Dinner ~19:30, Snack ~16:30)
        meal_contribution = 0.0
        
        # Breakfast response
        if 8.0 <= hour <= 11.0:
            dt = hour - 8.0
            meal_contribution += 65.0 * (dt / 1.0) * np.exp(-dt / 1.0)
        # Lunch response
        if 13.0 <= hour <= 16.0:
            dt = hour - 13.0
            meal_contribution += 80.0 * (dt / 1.1) * np.exp(-dt / 1.1)
        # Evening snack
        if 16.5 <= hour <= 18.5:
            dt = hour - 16.5
            meal_contribution += 30.0 * (dt / 0.8) * np.exp(-dt / 0.8)
        # Dinner response
        if 19.5 <= hour <= 23.5:
            dt = hour - 19.5
            meal_contribution += 90.0 * (dt / 1.3) * np.exp(-dt / 1.3)
            
        # Target glucose for this instant
        target = circadian_base + meal_contribution
        
        # Autoregressive smoothing (glucose cannot jump instantaneously)
        alpha = 0.08  # Inertia factor
        noise = np.random.normal(0, 1.2)
        current_glucose = (1 - alpha) * current_glucose + alpha * target + noise
        
        # Clip to realistic physiological bounds for T2D (60 to 320 mg/dL)
        clipped_val = float(np.clip(current_glucose, 65.0, 310.0))
        glucose_levels.append(round(clipped_val, 1))
        
    df = pd.DataFrame({
        "timestamp": [ts.strftime("%Y-%m-%d %H:%M:%S") for ts in timestamps],
        "glucose_mgdl": glucose_levels,
        "patient_id": "pt_cgm_01"
    })
    
    df.to_csv(DATA_PATH, index=False)
    print(f"Saved {len(df)} CGM records to {DATA_PATH}")
    return df


def load_or_generate_cgm_data() -> pd.DataFrame:
    if os.path.exists(DATA_PATH):
        print(f"Loading CGM dataset from {DATA_PATH}...")
        df = pd.read_csv(DATA_PATH)
        if len(df) < 2000 or "glucose_mgdl" not in df.columns:
            print("Existing dataset too small or invalid. Re-generating...")
            df = generate_realistic_cgm_dataset()
    else:
        df = generate_realistic_cgm_dataset()
    return df


class CGMDataset(Dataset):
    """
    Sliding window dataset for sequence-to-one forecasting.
    Takes `lookback` past points and targets the point `horizon` steps ahead.
    """
    def __init__(self, data: np.ndarray, lookback: int, horizon: int):
        self.X, self.y = [], []
        for i in range(len(data) - lookback - horizon + 1):
            self.X.append(data[i : i + lookback])
            self.y.append(data[i + lookback + horizon - 1])
        self.X = torch.tensor(np.array(self.X), dtype=torch.float32)
        self.y = torch.tensor(np.array(self.y), dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


class GlucoseLSTM(nn.Module):
    """
    2-Layer Stacked LSTM network with Dropout and Dense output head
    optimized for continuous glucose trajectory forecasting.
    """
    def __init__(self, input_dim=1, hidden_dim=64, num_layers=2, output_dim=1):
        super(GlucoseLSTM, self).__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0.0,
        )
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, output_dim),
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        last_hidden = out[:, -1, :]  # Extract last hidden representation
        return self.fc(last_hidden)


def train_and_evaluate():
    print("==================================================================")
    print("      DIABETO: DEEP LEARNING CGM TIME-SERIES MODEL TRAINING       ")
    print("==================================================================")
    
    df = load_or_generate_cgm_data()
    raw_values = df["glucose_mgdl"].values.reshape(-1, 1)

    # Normalize data between 0 and 1
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_values = scaler.fit_transform(raw_values)

    # Train (80%) / Test (20%) Split
    train_size = int(len(scaled_values) * 0.8)
    train_data = scaled_values[:train_size]
    test_data = scaled_values[train_size:]

    train_dataset = CGMDataset(train_data, LOOKBACK_STEPS, PREDICT_STEPS)
    test_dataset = CGMDataset(test_data, LOOKBACK_STEPS, PREDICT_STEPS)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Hardware Compute Device: {device}")
    print(f"Training Samples: {len(train_dataset)} | Test Samples: {len(test_dataset)}")
    print(f"Lookback Window: {LOOKBACK_STEPS * 5} mins ({LOOKBACK_STEPS} steps) | Prediction Horizon: {PREDICT_STEPS * 5} mins ahead ({PREDICT_STEPS} steps)")

    model = GlucoseLSTM(input_dim=1, hidden_dim=HIDDEN_DIM, num_layers=NUM_LAYERS, output_dim=1).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

    history = {"train_loss": [], "val_loss": []}

    print("\n--- Training Progress ---")
    for epoch in range(1, EPOCHS + 1):
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
        
        train_loss /= len(train_dataset)
        
        # Validation loss
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for X_batch, y_batch in test_loader:
                X_batch, y_batch = X_batch.to(device), y_batch.to(device)
                preds = model(X_batch)
                loss = criterion(preds, y_batch)
                val_loss += loss.item() * len(X_batch)
        val_loss /= len(test_dataset)
        
        scheduler.step(val_loss)
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)

        if epoch % 5 == 0 or epoch == EPOCHS:
            print(f"Epoch [{epoch:02d}/{EPOCHS:02d}] - Train Loss: {train_loss:.6f} | Val Loss: {val_loss:.6f}")

    # Final Evaluation on Full Test Set
    model.eval()
    test_preds, test_actuals = [], []
    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            X_batch = X_batch.to(device)
            preds = model(X_batch)
            test_preds.extend(preds.cpu().numpy())
            test_actuals.extend(y_batch.numpy())

    # Invert scaling back to original clinical units (mg/dL)
    inv_preds = scaler.inverse_transform(np.array(test_preds).reshape(-1, 1)).flatten()
    inv_actuals = scaler.inverse_transform(np.array(test_actuals).reshape(-1, 1)).flatten()

    # Calculate Core Clinical Metrics
    rmse = math.sqrt(mean_squared_error(inv_actuals, inv_preds))
    mae = mean_absolute_error(inv_actuals, inv_preds)
    mape = mean_absolute_percentage_error(inv_actuals, inv_preds) * 100
    errors = inv_preds - inv_actuals

    # Percentage of predictions within +- 15 mg/dL (ISO 15197 accuracy standard)
    iso_accuracy = (np.abs(errors) <= 15.0).mean() * 100

    print("\n==================================================================")
    print("                    EVALUATION METRICS SUMMARY                   ")
    print("==================================================================")
    print(f"  Test RMSE:               {rmse:.2f} mg/dL  (Acceptance: < 15.0 mg/dL)")
    print(f"  Test MAE:                {mae:.2f} mg/dL")
    print(f"  Mean Absolute % Error:   {mape:.2f}%")
    print(f"  ISO Standard Accuracy:   {iso_accuracy:.1f}% within +-15 mg/dL")
    print("==================================================================")

    # Save Model Weights Checkpoint
    torch.save({
        'model_state_dict': model.state_dict(),
        'lookback': LOOKBACK_STEPS,
        'horizon': PREDICT_STEPS,
        'hidden_dim': HIDDEN_DIM,
        'num_layers': NUM_LAYERS,
        'scaler_min': float(scaler.data_min_[0]),
        'scaler_max': float(scaler.data_max_[0]),
        'rmse': rmse,
        'mae': mae
    }, MODEL_SAVE_PATH)
    print(f"\n[OK] Model weights & metadata saved to: {MODEL_SAVE_PATH}")

    # 1. Main Slide Deck Visual: Actual vs Predicted Trajectory Plot
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, ax = plt.subplots(figsize=(14, 6.5), dpi=300)
    
    n_plot = min(180, len(inv_actuals))  # Show 15 hours of predictions (180 points * 5 min)
    time_steps = np.arange(n_plot) * 5   # Convert to minutes

    # Target glycemic range band (70 - 180 mg/dL)
    ax.axhspan(70, 180, color='#10B981', alpha=0.12, label='Target Glycemic Range (70-180 mg/dL)')
    ax.axhspan(180, 320, color='#EF4444', alpha=0.08, label='Hyperglycemic Zone (>180 mg/dL)')
    ax.axhspan(0, 70, color='#DC2626', alpha=0.15, label='Hypoglycemic Danger Zone (<70 mg/dL)')

    # Curves
    ax.plot(time_steps, inv_actuals[:n_plot], label='Actual CGM Glucose (Continuous Sensor)', 
            color='#1E40AF', linewidth=2.5, alpha=0.9)
    ax.plot(time_steps, inv_preds[:n_plot], label='Diabeto LSTM 30-Min Ahead Forecast', 
            color='#EA580C', linestyle='--', linewidth=2.5)

    # Threshold lines
    ax.axhline(180, color='#DC2626', linestyle=':', linewidth=1.2, alpha=0.8)
    ax.axhline(70, color='#991B1B', linestyle=':', linewidth=1.2, alpha=0.8)

    ax.set_title("Diabeto Clinical AI — Deep Learning CGM 30-Minute Trajectory Forecasting", 
                 fontsize=15, fontweight='bold', pad=15, color='#0F172A')
    ax.set_xlabel("Elapsed Time (Minutes)", fontsize=12, fontweight='semibold', labelpad=8)
    ax.set_ylabel("Blood Glucose Level (mg/dL)", fontsize=12, fontweight='semibold', labelpad=8)
    ax.set_ylim(50, 310)
    ax.set_xlim(0, time_steps[-1])
    
    # Annotate metrics box
    metrics_text = f"Model Performance:\nRMSE: {rmse:.2f} mg/dL\nMAE: {mae:.2f} mg/dL\nForecast Horizon: +30 mins"
    ax.text(0.02, 0.95, metrics_text, transform=ax.transAxes, fontsize=10.5,
            verticalalignment='top', bbox=dict(boxstyle='round,pad=0.6', facecolor='#F8FAFC', edgecolor='#CBD5E1', alpha=0.95))

    ax.legend(loc='upper right', frameon=True, framealpha=0.95, fontsize=10)
    plt.tight_layout()
    plt.savefig(PREDICTION_PLOT_PATH, dpi=300)
    plt.close()
    print(f"[OK] Prediction plot saved to: {PREDICTION_PLOT_PATH}")

    # 2. Training and Validation Loss Curve Plot
    fig, ax = plt.subplots(figsize=(9, 5), dpi=300)
    epochs_range = range(1, EPOCHS + 1)
    ax.plot(epochs_range, history["train_loss"], label="Train Loss (MSE)", color="#2563EB", linewidth=2)
    ax.plot(epochs_range, history["val_loss"], label="Validation Loss (MSE)", color="#10B981", linewidth=2, linestyle="--")
    ax.set_title("LSTM Convergence: Training & Validation Loss Over Epochs", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Epoch", fontsize=11, fontweight='semibold')
    ax.set_ylabel("Mean Squared Error (Normalized)", fontsize=11, fontweight='semibold')
    ax.legend(frameon=True, fontsize=10.5)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(LOSS_PLOT_PATH, dpi=300)
    plt.close()
    print(f"[OK] Loss curve plot saved to: {LOSS_PLOT_PATH}")

    # 3. Prediction Error Residuals Distribution Plot
    fig, ax = plt.subplots(figsize=(9, 5), dpi=300)
    ax.hist(errors, bins=35, color="#6366F1", edgecolor="#312E81", alpha=0.85, density=True)
    ax.axvline(0, color="red", linestyle="--", linewidth=1.5, label="Zero Error Line")
    ax.axvline(np.mean(errors), color="black", linestyle=":", linewidth=1.5, label=f"Mean Error ({np.mean(errors):.2f} mg/dL)")
    ax.set_title("Forecast Error Residual Distribution (Predicted - Actual)", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Forecast Error (mg/dL)", fontsize=11, fontweight='semibold')
    ax.set_ylabel("Probability Density", fontsize=11, fontweight='semibold')
    ax.legend(frameon=True, fontsize=10.5)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(ERROR_PLOT_PATH, dpi=300)
    plt.close()
    print(f"[OK] Error distribution plot saved to: {ERROR_PLOT_PATH}")

    print("\n=== Model Training & Visual Generation Finished Successfully! ===")


if __name__ == "__main__":
    train_and_evaluate()
