"""
Diabeto Platform — OhioT1DM Clinical Data Loader & Preprocessing Pipeline
Gap-aware window extraction with zero patient-level and temporal data leakage.
"""

import os
import xml.etree.ElementTree as ET
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from typing import Dict, List, Tuple, Optional


class OhioCGMDataset(Dataset):
    """
    PyTorch Dataset containing normalized sliding windows and target values,
    along with unscaled values and metadata for downstream clinical evaluation.
    """
    def __init__(self, X: np.ndarray, y: np.ndarray, last_obs: np.ndarray, 
                 timestamps: np.ndarray, raw_y: np.ndarray, patient_ids: np.ndarray):
        self.X = torch.tensor(X, dtype=torch.float32).unsqueeze(-1)  # (N, Lookback, 1)
        self.y = torch.tensor(y, dtype=torch.float32).unsqueeze(-1)  # (N, 1)
        self.last_obs = last_obs                                     # Unscaled last observed (N,)
        self.timestamps = timestamps                                 # Target timestamps (N,)
        self.raw_y = raw_y                                           # Unscaled target ground truth (N,)
        self.patient_ids = patient_ids                               # Patient ID strings (N,)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


def parse_ohiot1dm_directory(data_dir: str = "ml/data/ohiot1dm") -> Dict[str, pd.DataFrame]:
    """
    Parses all XML files in the OhioT1DM directory and combines training and testing
    files per patient chronologically with deduplication.
    """
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"OhioT1DM directory not found at: {data_dir}")

    files = sorted([f for f in os.listdir(data_dir) if f.endswith(".xml")])
    if not files:
        raise ValueError(f"No XML files found in {data_dir}")

    patient_records: Dict[str, List[pd.DataFrame]] = {}

    for f in files:
        filepath = os.path.join(data_dir, f)
        tree = ET.parse(filepath)
        root = tree.getroot()
        pid = root.attrib.get("id", f.split("-")[0])

        events = []
        gl_node = root.find("glucose_level")
        if gl_node is not None:
            for event in gl_node.findall("event"):
                ts_str = event.attrib.get("ts")
                val_str = event.attrib.get("value")
                if ts_str and val_str:
                    try:
                        val = float(val_str)
                        if 30.0 <= val <= 500.0:  # Validate physiological sensor bounds
                            events.append((ts_str, val))
                    except ValueError:
                        continue

        df = pd.DataFrame(events, columns=["ts_str", "glucose_mgdl"])
        df["ts"] = pd.to_datetime(df["ts_str"], format="%d-%m-%Y %H:%M:%S")
        df["patient_id"] = pid

        if pid not in patient_records:
            patient_records[pid] = []
        patient_records[pid].append(df)

    # Combine and sort each patient chronologically
    patient_dfs: Dict[str, pd.DataFrame] = {}
    for pid, dfs in patient_records.items():
        combined = pd.concat(dfs, ignore_index=True)
        combined = combined.sort_values("ts").drop_duplicates(subset=["ts"]).reset_index(drop=True)
        patient_dfs[pid] = combined

    return patient_dfs


def extract_gap_aware_windows(
    df: pd.DataFrame, 
    lookback_steps: int = 12, 
    horizon_steps: int = 6, 
    step_minutes: int = 5,
    max_step_gap_minutes: float = 6.0
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Extracts sliding sequence windows ensuring no missing-data gaps occur
    inside the lookback window or across the forecast horizon.
    """
    times = df["ts"].values
    values = df["glucose_mgdl"].values.astype(np.float32)
    pid = df["patient_id"].iloc[0]

    X_list, y_list, last_obs_list, time_list, raw_y_list, pid_list = [], [], [], [], [], []
    
    total_candidates = len(df) - lookback_steps - horizon_steps + 1
    if total_candidates <= 0:
        return (np.empty((0, lookback_steps)), np.empty(0), np.empty(0), 
                np.empty(0, dtype='datetime64[ns]'), np.empty(0), np.empty(0))

    for i in range(total_candidates):
        t_window = times[i : i + lookback_steps]
        t_target = times[i + lookback_steps + horizon_steps - 1]

        # Check consecutive intervals inside input window
        diffs_sec = np.diff(t_window).astype("timedelta64[s]").astype(float)
        if np.any(diffs_sec > max_step_gap_minutes * 60) or np.any(diffs_sec < 60):
            continue  # Gap or irregular step detected inside input window

        # Check horizon timestamp alignment
        target_span_sec = (t_target - t_window[-1]).astype("timedelta64[s]").astype(float)
        expected_sec = horizon_steps * step_minutes * 60
        # Allow +/- 3 min tolerance for minor sensor clock drifts
        if abs(target_span_sec - expected_sec) > 3 * 60:
            continue

        X_list.append(values[i : i + lookback_steps])
        y_val = values[i + lookback_steps + horizon_steps - 1]
        y_list.append(y_val)
        last_obs_list.append(values[i + lookback_steps - 1])
        time_list.append(t_target)
        raw_y_list.append(y_val)
        pid_list.append(pid)

    return (
        np.array(X_list, dtype=np.float32),
        np.array(y_list, dtype=np.float32),
        np.array(last_obs_list, dtype=np.float32),
        np.array(time_list),
        np.array(raw_y_list, dtype=np.float32),
        np.array(pid_list)
    )


def prepare_ohio_dataloaders(
    data_dir: str = "ml/data/ohiot1dm",
    lookback_steps: int = 12,
    horizon_steps: int = 6,
    batch_size: int = 64,
    random_seed: int = 42,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15
):
    """
    Builds patient-level split datasets and PyTorch DataLoaders.
    Fits MinMaxScaler strictly on the training partition.
    """
    patient_dfs = parse_ohiot1dm_directory(data_dir)
    pids = sorted(list(patient_dfs.keys()))
    
    # Deterministic patient-level split
    rng = np.random.RandomState(random_seed)
    shuffled_pids = list(pids)
    rng.shuffle(shuffled_pids)

    n_patients = len(shuffled_pids)
    n_train = max(1, int(round(n_patients * train_ratio)))
    n_val = max(1, int(round(n_patients * val_ratio)))
    # Ensure at least 1 test patient
    if n_train + n_val >= n_patients:
        n_val = 1
        n_train = n_patients - 2

    train_pids = sorted(shuffled_pids[:n_train])
    val_pids = sorted(shuffled_pids[n_train : n_train + n_val])
    test_pids = sorted(shuffled_pids[n_train + n_val :])

    def collect_split_arrays(target_pids: List[str]):
        all_X, all_y, all_last, all_times, all_raw_y, all_pids = [], [], [], [], [], []
        for pid in target_pids:
            df = patient_dfs[pid]
            X, y, last_obs, times, raw_y, p_arr = extract_gap_aware_windows(
                df, lookback_steps=lookback_steps, horizon_steps=horizon_steps
            )
            if len(X) > 0:
                all_X.append(X)
                all_y.append(y)
                all_last.append(last_obs)
                all_times.append(times)
                all_raw_y.append(raw_y)
                all_pids.append(p_arr)
        
        return (
            np.concatenate(all_X, axis=0),
            np.concatenate(all_y, axis=0),
            np.concatenate(all_last, axis=0),
            np.concatenate(all_times, axis=0),
            np.concatenate(all_raw_y, axis=0),
            np.concatenate(all_pids, axis=0)
        )

    X_train, y_train, last_train, times_train, raw_y_train, pids_train = collect_split_arrays(train_pids)
    X_val, y_val, last_val, times_val, raw_y_val, pids_val = collect_split_arrays(val_pids)
    X_test, y_test, last_test, times_test, raw_y_test, pids_test = collect_split_arrays(test_pids)

    # CRITICAL: Fit scaler ONLY on training data
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(X_train.reshape(-1, 1))

    # Apply training scaler to all splits
    X_train_norm = scaler.transform(X_train.reshape(-1, 1)).reshape(X_train.shape)
    y_train_norm = scaler.transform(y_train.reshape(-1, 1)).flatten()

    X_val_norm = scaler.transform(X_val.reshape(-1, 1)).reshape(X_val.shape)
    y_val_norm = scaler.transform(y_val.reshape(-1, 1)).flatten()

    X_test_norm = scaler.transform(X_test.reshape(-1, 1)).reshape(X_test.shape)
    y_test_norm = scaler.transform(y_test.reshape(-1, 1)).flatten()

    train_ds = OhioCGMDataset(X_train_norm, y_train_norm, last_train, times_train, raw_y_train, pids_train)
    val_ds = OhioCGMDataset(X_val_norm, y_val_norm, last_val, times_val, raw_y_val, pids_val)
    test_ds = OhioCGMDataset(X_test_norm, y_test_norm, last_test, times_test, raw_y_test, pids_test)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    split_info = {
        "all_patients": pids,
        "train_patients": train_pids,
        "val_patients": val_pids,
        "test_patients": test_pids,
        "n_train_samples": len(train_ds),
        "n_val_samples": len(val_ds),
        "n_test_samples": len(test_ds),
        "scaler_min": float(scaler.data_min_[0]),
        "scaler_max": float(scaler.data_max_[0]),
        "patient_dfs": patient_dfs
    }

    return train_loader, val_loader, test_loader, train_ds, val_ds, test_ds, scaler, split_info
