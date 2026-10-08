import os
import xml.etree.ElementTree as ET
import pandas as pd
import numpy as np

data_dir = 'ml/data/ohiot1dm'
files = sorted(os.listdir(data_dir))
print('Files found in ml/data/ohiot1dm:', files)

patient_data = {}

for f in files:
    if not f.endswith('.xml'):
        continue
    filepath = os.path.join(data_dir, f)
    tree = ET.parse(filepath)
    root = tree.getroot()
    pid = root.attrib.get('id', f.split('-')[0])
    
    events = []
    gl_node = root.find('glucose_level')
    if gl_node is not None:
        for event in gl_node.findall('event'):
            ts_str = event.attrib.get('ts')
            val_str = event.attrib.get('value')
            if ts_str and val_str:
                try:
                    val = float(val_str)
                    events.append((ts_str, val))
                except ValueError:
                    pass
                
    split_type = 'train' if 'training' in f else 'test'
    if pid not in patient_data:
        patient_data[pid] = {'train': [], 'test': []}
    patient_data[pid][split_type].extend(events)

summary_rows = []

for pid, splits in sorted(patient_data.items()):
    print(f"\n================ Patient {pid} ================")
    all_events = []
    for split_type, evs in splits.items():
        if not evs:
            print(f"  {split_type}: 0 events")
            continue
        df = pd.DataFrame(evs, columns=['ts_str', 'glucose_mgdl'])
        df['ts'] = pd.to_datetime(df['ts_str'], format='%d-%m-%Y %H:%M:%S')
        df = df.sort_values('ts').reset_index(drop=True)
        
        # Check intervals
        df['diff_min'] = df['ts'].diff().dt.total_seconds() / 60.0
        
        # Check duplicates
        dups = int(df['ts'].duplicated().sum())
        
        # Interval distribution
        diffs = df['diff_min'].dropna()
        median_diff = float(diffs.median()) if len(diffs) > 0 else 0.0
        five_min_pct = float((diffs == 5.0).mean() * 100) if len(diffs) > 0 else 0.0
        
        days_span = float((df['ts'].max() - df['ts'].min()).total_seconds() / 86400.0)
        
        print(f"  [{split_type.upper()}] Events: {len(df)} | Duplicates: {dups}")
        print(f"    Time range: {df['ts'].min()} to {df['ts'].max()} ({days_span:.1f} days)")
        print(f"    Glucose range: min={df['glucose_mgdl'].min():.1f}, max={df['glucose_mgdl'].max():.1f}, mean={df['glucose_mgdl'].mean():.1f}, std={df['glucose_mgdl'].std():.1f}")
        print(f"    Sampling interval: median={median_diff} min, exactly 5-min steps={five_min_pct:.1f}%")
        gaps_gt_5 = int((diffs > 5.0).sum())
        gaps_gt_15 = int((diffs > 15.0).sum())
        print(f"    Gaps > 5min: {gaps_gt_5} | Gaps > 15min: {gaps_gt_15}")
        
        all_events.append(df)
        
    combined_df = pd.concat(all_events).sort_values('ts').drop_duplicates(subset=['ts']).reset_index(drop=True)
    total_days = (combined_df['ts'].max() - combined_df['ts'].min()).total_seconds() / 86400.0
    summary_rows.append({
        'patient_id': pid,
        'total_events': len(combined_df),
        'days_span': round(total_days, 1),
        'glucose_mean': round(combined_df['glucose_mgdl'].mean(), 1),
        'glucose_std': round(combined_df['glucose_mgdl'].std(), 1),
        'glucose_min': round(combined_df['glucose_mgdl'].min(), 1),
        'glucose_max': round(combined_df['glucose_mgdl'].max(), 1)
    })

print("\n\n================ SUMMARY TABLE ================")
summary_df = pd.DataFrame(summary_rows)
print(summary_df.to_string(index=False))
