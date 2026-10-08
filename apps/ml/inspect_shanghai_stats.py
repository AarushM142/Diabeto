import os
import sys
import pandas as pd
import numpy as np

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

data_dir = 'ml/data/Shanghai_T2DM'
files = sorted(os.listdir(data_dir))

patient_records = {}

for f in files:
    if not (f.endswith('.xlsx') or f.endswith('.xls')):
        continue
    pid = f.split('_')[0]
    path = os.path.join(data_dir, f)
    try:
        xl = pd.ExcelFile(path)
        for sname in xl.sheet_names:
            df = xl.parse(sname)
            date_col, cgm_col = None, None
            for c in df.columns:
                c_str = str(c).lower()
                if 'date' in c_str or 'time' in c_str:
                    date_col = c
                if 'cgm' in c_str:
                    cgm_col = c
            if date_col and cgm_col:
                sub_df = df[[date_col, cgm_col]].dropna()
                sub_df.columns = ['ts', 'glucose_mgdl']
                sub_df['ts'] = pd.to_datetime(sub_df['ts'], errors='coerce')
                sub_df['glucose_mgdl'] = pd.to_numeric(sub_df['glucose_mgdl'], errors='coerce')
                sub_df = sub_df.dropna()
                if pid not in patient_records:
                    patient_records[pid] = []
                patient_records[pid].append(sub_df)
    except Exception as e:
        print(f"Error reading {f}: {e}")

print(f"Successfully parsed {len(patient_records)} patients from Shanghai T2DM.")

summary_list = []
for pid, dfs in sorted(patient_records.items()):
    combined = pd.concat(dfs).sort_values('ts').drop_duplicates('ts').reset_index(drop=True)
    diffs = combined['ts'].diff().dt.total_seconds() / 60.0
    med_diff = diffs.median() if len(diffs) > 1 else np.nan
    days = (combined['ts'].max() - combined['ts'].min()).total_seconds() / 86400.0 if len(combined) > 1 else 0.0
    
    summary_list.append({
        'pid': pid,
        'rows': len(combined),
        'days': round(days, 1),
        'median_interval_min': med_diff,
        'min_glucose': combined['glucose_mgdl'].min(),
        'max_glucose': combined['glucose_mgdl'].max(),
        'mean_glucose': round(combined['glucose_mgdl'].mean(), 1)
    })

sum_df = pd.DataFrame(summary_list)
print("\nFirst 15 Shanghai patients:")
print(sum_df.head(15).to_string(index=False))

print("\nShanghai T2DM Aggregate Stats:")
print(f"Total raw readings across all patients: {sum_df['rows'].sum()}")
print(f"Total monitored days: {sum_df['days'].sum():.1f} days")
print(f"Intervals distribution:\n{sum_df['median_interval_min'].value_counts()}")
print(f"Average readings per patient: {sum_df['rows'].mean():.1f}")
print(f"Average days per patient: {sum_df['days'].mean():.1f}")
