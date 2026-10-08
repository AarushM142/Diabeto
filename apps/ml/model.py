"""
Diabeto Platform — PyTorch LSTM Architecture for OhioT1DM CGM Forecasting
"""

import torch
import torch.nn as nn


class GlucoseLSTM(nn.Module):
    """
    2-Layer Stacked LSTM network for continuous glucose time-series forecasting.
    Includes recurrent dropout and a multi-layer perceptron regression head.
    """
    def __init__(self, input_dim: int = 1, hidden_dim: int = 64, num_layers: int = 2, dropout: float = 0.2):
        super(GlucoseLSTM, self).__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (Batch, Sequence_Length, Input_Dim)
        lstm_out, _ = self.lstm(x)
        last_step = lstm_out[:, -1, :]  # (Batch, Hidden_Dim)
        prediction = self.head(last_step)  # (Batch, 1)
        return prediction
