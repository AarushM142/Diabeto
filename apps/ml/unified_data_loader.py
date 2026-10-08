"""
Diabeto Platform — Unified Multi-Cohort CGM Data Loader (OhioT1DM + ShanghaiT2DM)
Performs continuous 5-minute harmonization, gap-aware segmenting, and strict patient-level splitting.
"""

import os
import sys
import xml.etree.ElementTree as ET
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import MinMaxScaler
from typing import Dict, List, Tuple, Optional

from apps.ml.ohio_data_loader import extract_gap_aware_windows, OhioCGMDataset


def load_ohiot1dm_patients(data_dir: str = "ml/data/ohiot1dm") -> Dict[str, pd.DataFrame]:
    """
    Parses OhioT1DM XML files (already sampled at 5-minute intervals).
    """
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"OhioT1DM directory not found: {data_dir}")

    files = sorted([f for f in os.listdir(data_dir) if f.endswith(".xml")])
    patient_records = {}

    for f in files:
        filepath = os.path.join(data_dir, f)
        tree = ET.parse(filepath)
        root = tree.getroot()
        pid = f"ohio_{root.attrib.get('id', f.split('-')[0])}"

        events = []
        gl_node = root.find("glucose_level")
        if gl_node is not None:
            for event in gl_node.findall("event"):
                ts_str = event.attrib.get("ts")
                val_str = event.attrib.get("value")
                if ts_str and val_str:
                    try:
                        val = float(val_str)
                        if 30.0 <= val <= 500.0:
                            events.append((ts_str, val))
                    except ValueError:
                        continue

        df = pd.DataFrame(events, columns=["ts_str", "glucose_mgdl"])
        df["ts"] = pd.to_datetime(df["ts_str"], format="%d-%m-%Y %H:%M:%S")
        df["patient_id"] = pid
        df["cohort"] = "OhioT1DM"

        if pid not in patient_records:
            patient_records[pid] = []
        patient_records[pid].append(df)

    patient_dfs = {}
    for pid, dfs in patient_records.items():
        combined = pd.concat(dfs, ignore_index=True).sort_values("ts").drop_duplicates("ts").reset_index(drop=True)
        patient_dfs[pid] = combined

    return patient_dfs


def load_and_resample_shanghai_patients(
    data_dir: str = "ml/data/Shanghai_T2DM", 
    max_gap_minutes: float = 20.0
) -> Dict[str, pd.DataFrame]:
    """
    Parses Shanghai T2DM Excel sheets (15-min CGM readings) and resamples continuous segments
    to uniform 5-minute sampling to match OhioT1DM.
    """
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Shanghai_T2DM directory not found: {data_dir}")

    files = sorted([f for f in os.listdir(data_dir) if f.endswith(".xlsx") or f.endswith(".xls")])
    patient_records = {}

    for f in files:
        pid = f"shanghai_{f.split('_')[0]}"
        path = os.path.join(data_dir, f)
        try:
            xl = pd.ExcelFile(path)
            for sname in xl.sheet_names:
                df = xl.parse(sname)
                date_col, cgm_col = None, None
                for c in df.columns:
                    c_str = str(c).lower()
                    if "date" in c_str or "time" in c_str:
                        date_col = c
                    if "cgm" in c_str:
                        cgm_col = c
                if date_col and cgm_col:
                    sub_df = df[[date_col, cgm_col]].dropna()
                    sub_df.columns = ["ts", "glucose_mgdl"]
                    sub_df["ts"] = pd.to_datetime(sub_df["ts"], errors="coerce")
                    sub_df["glucose_mgdl"] = pd.to_numeric(sub_df["glucose_mgdl"], errors="coerce")
                    sub_df = sub_df.dropna()
                    sub_df = sub_df[(sub_df["glucose_mgdl"] >= 30.0) & (sub_df["glucose_mgdl"] <= 500.0)]
                    sub_df["patient_id"] = pid
                    sub_df["cohort"] = "ShanghaiT2DM"
                    if pid not in patient_records:
                        patient_records[pid] = []
                    patient_records[pid].append(sub_df)
        except Exception as e:
            continue

    patient_dfs = {}
    for pid, dfs in patient_records.items():
        combined = pd.concat(dfs, ignore_index=True).sort_values("ts").drop_duplicates("ts").reset_index(drop=True)
        if len(combined) < 2:
            continue
        
        # Segment by gap > max_gap_minutes (e.g. 20 min for 15-min sensor)
        combined["diff_min"] = combined["ts"].diff().dt.total_seconds() / 60.0
        combined["segment"] = (combined["diff_min"] > max_gap_minutes).cumsum()

        resampled_segs = []
        for _, seg_df in combined.groupby("segment"):
            if len(seg_df) < 2:
                continue
            seg_indexed = seg_df.set_index("ts")
            # Resample strictly to 5-minute grid using time-based linear interpolation
            res_5m = seg_indexed[["glucose_mgdl"]].resample("5min").interpolate(method="time")
            res_5m = res_5m.dropna().reset_index()
            res_5m["patient_id"] = pid
            res_5m["cohort"] = "ShanghaiT2DM"
            resampled_segs.append(res_5m)

        if resampled_segs:
            patient_dfs[pid] = pd.concat(resampled_segs, ignore_index=True)

    return patient_dfs


def prepare_unified_dataloaders(
    ohio_dir: str = "ml/data/ohiot1dm",
    shanghai_dir: str = "ml/data/Shanghai_T2DM",
    lookback_steps: int = 12,
    horizon_steps: int = 6,
    batch_size: int = 64,
    random_seed: int = 42
):
    """
    Harmonizes both datasets, partitions patients into Train / Val / Test,
    extracts gap-free sequence windows, and fits normalization scaler strictly on Train.
    """
    print("Loading and harmonizing OhioT1DM and ShanghaiT2DM datasets...")
    ohio_patients = load_ohiot1dm_patients(ohio_dir)
    shanghai_patients = load_and_resample_shanghai_patients(shanghai_dir)

    print(f"  OhioT1DM Patients Loaded:     {len(ohio_patients)}")
    print(f"  ShanghaiT2DM Patients Loaded: {len(shanghai_patients)}")
    print(f"  Total Combined Cohort:        {len(ohio_patients) + len(shanghai_patients)} unique patients")

    all_patients = {}
    all_patients.update(ohio_patients)
    all_patients.update(shanghai_patients)

    # Stratified Patient-level Split
    rng = np.random.RandomState(random_seed)

    # Split Ohio (6 patients -> 4 train, 1 val, 1 test)
    ohio_pids = sorted(list(ohio_patients.keys()))
    rng.shuffle(ohio_pids)
    ohio_train = sorted(ohio_pids[:4])
    ohio_val = sorted(ohio_pids[4:5])
    ohio_test = sorted(ohio_pids[5:])

    # Split Shanghai (100 patients -> 70 train, 15 val, 15 test)
    shanghai_pids = sorted(list(shanghai_patients.keys()))
    rng.shuffle(shanghai_pids)
    shanghai_train = sorted(shanghai_pids[:70])
    shanghai_val = sorted(shanghai_pids[70:85])
    shanghai_test = sorted(shanghai_pids[85:])

    train_pids = sorted(ohio_train + shanghai_train)
    val_pids = sorted(ohio_val + shanghai_val)
    test_pids = sorted(ohio_test + shanghai_test)

    def extract_cohort_windows(pids_list: List[str]):
        X_all, y_all, last_all, times_all, raw_y_all, pid_all = [], [], [], [], [], []
        for pid in pids_list:
            df = all_patients[pid]
            X, y, last_obs, times, raw_y, p_arr = extract_gap_aware_windows(
                df, lookback_steps=lookback_steps, horizon_steps=horizon_steps
            )
            if len(X) > 0:
                X_all.append(X)
                y_all.append(y)
                last_all.append(last_obs)
                times_all.append(times)
                raw_y_all.append(raw_y)
                pid_all.append(p_arr)
        
        return (
            np.concatenate(X_all, axis=0),
            np.concatenate(y_all, axis=0),
            np.concatenate(last_all, axis=0),
            np.concatenate(times_all, axis=0),
            np.concatenate(raw_y_all, axis=0),
            np.concatenate(pid_all, axis=0)
        )

    print("Extracting sliding sequence windows across patient partitions...")
    X_train, y_train, last_train, times_train, raw_y_train, pids_train = extract_cohort_windows(train_pids)
    X_val, y_val, last_val, times_val, raw_y_val, pids_val = extract_cohort_windows(val_pids)
    X_test, y_test, last_test, times_test, raw_y_test, pids_test = extract_cohort_windows(test_pids)

    print(f"  Training Windows:   {len(X_train):,} ({len(train_pids)} patients: 4 Ohio, 70 Shanghai)")
    print(f"  Validation Windows: {len(X_val):,} ({len(val_pids)} patients: 1 Ohio, 15 Shanghai)")
    print(f"  Test Windows:       {len(X_test):,} ({len(test_pids)} patients: 1 Ohio, 15 Shanghai)")

    # Fit scaler ONLY on training patients
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(X_train.reshape(-1, 1))

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
        "all_patients": all_patients,
        "train_patients": train_pids,
        "val_patients": val_pids,
        "test_patients": test_pids,
        "ohio_test_patients": ohio_test,
        "shanghai_test_patients": shanghai_test,
        "n_train_samples": len(train_ds),
        "n_val_samples": len(val_ds),
        "n_test_samples": len(test_ds),
        "scaler_min": float(scaler.data_min_[0]),
        "scaler_max": float(scaler.data_max_[0])
    }

    return train_loader, val_loader, test_loader, train_ds, val_ds, test_ds, scaler, split_info
