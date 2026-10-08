"""
Diabeto Platform — PyTorch LSTM Time-Series CGM Glucose Forecasting
Teammate 4 Starter Training Script
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
from sklearn.metrics import mean_squared_error, mean_absolute_error

# Set random seeds for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Configuration Hyperparameters
LOOKBACK_STEPS = 12       # 12 steps = 1 hour of past history (if 5-min intervals)
PREDICT_STEPS = 6         # 6 steps = 30 minutes into future
BATCH_SIZE = 32
HIDDEN_DIM = 64
NUM_LAYERS = 2
LEARNING_RATE = 0.001
EPOCHS = 40
DATA_PATH = "ml/data/cgm_demo_data.csv"
MODEL_SAVE_PATH = "ml/models/cgm_lstm_model.pt"
PLOT_SAVE_PATH = "ml/plots/cgm_prediction_chart.png"

# Ensure output directories exist
os.makedirs("ml/data", exist_ok=True)
os.makedirs("ml/models", exist_ok=True)
os.makedirs("ml/plots", exist_ok=True)

# 1. Dataset Generation / Loading
def load_or_generate_cgm_data() -> pd.DataFrame:
    if os.path.exists(DATA_PATH):
        print(f"Loading real CGM dataset from {DATA_PATH}...")
        df = pd.read_csv(DATA_PATH)
    else:
        print(f"No file at {DATA_PATH} found. Generating realistic synthetic CGM data for demo...")
        # Generate 2000 points simulating realistic daily glucose cycles (meals, basal, spikes)
        time_index = pd.date_range("2026-09-01 00:00", periods=2000, freq="5min")
        t = np.linspace(0, 50, 2000)
        # Circadian rhythm + meal spikes + random variation
        glucose = (
            120
            + 25 * np.sin(t / 2)
            + 35 * np.sin(t * 1.5) * (np.sin(t * 1.5) > 0.3)
            + np.random.normal(0, 4, 2000)
        )
        glucose = np.clip(glucose, 65, 320)
        df = pd.DataFrame({
            "timestamp": time_index,
            "glucose_mgdl": glucose.round(1),
            "patient_id": "pt_demo_cgm_01",
        })
        df.to_csv(DATA_PATH, index=False)
        print(f"Generated synthetic CGM data and saved to {DATA_PATH}")

    return df

# 2. PyTorch Dataset Definition
class CGMDataset(Dataset):
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

# 3. PyTorch LSTM Architecture
class GlucoseLSTM(nn.Module):
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
            nn.Linear(32, output_dim),
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]  # Take last time step hidden output
        return self.fc(out)

# 4. Training Pipeline
def train_model():
    print("=== Starting CGM LSTM Model Training ===")
    df = load_or_generate_cgm_data()
    raw_values = df["glucose_mgdl"].values.reshape(-1, 1)

    # Normalize between 0 and 1
    scaler = MinMaxScaler()
    scaled_values = scaler.fit_transform(raw_values)

    # Split into 80% train, 20% test
    train_size = int(len(scaled_values) * 0.8)
    train_data = scaled_values[:train_size]
    test_data = scaled_values[train_size:]

    train_dataset = CGMDataset(train_data, LOOKBACK_STEPS, PREDICT_STEPS)
    test_dataset = CGMDataset(test_data, LOOKBACK_STEPS, PREDICT_STEPS)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")

    model = GlucoseLSTM(input_dim=1, hidden_dim=HIDDEN_DIM, num_layers=NUM_LAYERS, output_dim=1).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

    # Training Loop
    for epoch in range(1, EPOCHS + 1):
        model.train()
        total_loss = 0.0
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            optimizer.zero_grad()
            predictions = model(X_batch)
            loss = criterion(predictions, y_batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        if epoch % 10 == 0 or epoch == EPOCHS:
            avg_loss = total_loss / len(train_loader)
            print(f"Epoch [{epoch}/{EPOCHS}] - Loss (MSE): {avg_loss:.5f}")

    # Evaluation on Test Set
    model.eval()
    test_preds, test_actuals = [], []
    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            X_batch = X_batch.to(device)
            preds = model(X_batch)
            test_preds.extend(preds.cpu().numpy())
            test_actuals.extend(y_batch.numpy())

    # Invert scaling back to original mg/dL units
    inv_preds = scaler.inverse_transform(np.array(test_preds).reshape(-1, 1))
    inv_actuals = scaler.inverse_transform(np.array(test_actuals).reshape(-1, 1))

    rmse = math.sqrt(mean_squared_error(inv_actuals, inv_preds))
    mae = mean_absolute_error(inv_actuals, inv_preds)
    print(f"\n=== Evaluation Metrics ===")
    print(f"Test RMSE: {rmse:.2f} mg/dL")
    print(f"Test MAE:  {mae:.2f} mg/dL")

    # Save trained model
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"Model weights saved to {MODEL_SAVE_PATH}")

    # Generate and Save Comparison Plot for Slide Deck
    plt.figure(figsize=(12, 6))
    plt.plot(inv_actuals[:150], label="Actual Glucose (mg/dL)", color="#2563EB", linewidth=2)
    plt.plot(inv_preds[:150], label="LSTM 30-min Predicted Glucose", color="#EA580C", linestyle="--", linewidth=2)
    plt.title("Diabeto Deep Learning — 30-Minute Ahead Glucose Trajectory Prediction", fontsize=14, fontweight="bold")
    plt.xlabel("Time Steps (5-min intervals)", fontsize=12)
    plt.ylabel("Blood Glucose Level (mg/dL)", fontsize=12)
    plt.axhline(y=180, color="red", linestyle=":", label="High Threshold (180 mg/dL)")
    plt.axhline(y=70, color="darkred", linestyle=":", label="Critical Low (70 mg/dL)")
    plt.legend(loc="upper right", frameon=True)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(PLOT_SAVE_PATH, dpi=300)
    plt.close()
    print(f"Evaluation plot saved to {PLOT_SAVE_PATH}")
    print("=== Complete! ===")

if __name__ == "__main__":
    train_model()
