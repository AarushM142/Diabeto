import os
import sys
import pandas as pd
import numpy as np

# Configure standard output to handle UTF-8 cleanly
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

data_dir = 'ml/data/Shanghai_T2DM'
files = sorted(os.listdir(data_dir))
print(f"Total files in {data_dir}: {len(files)}")

# Group files by patient ID (e.g. 2000, 2001, etc.)
patient_files = {}
for f in files:
    if f.endswith('.xlsx') or f.endswith('.xls'):
        pid = f.split('_')[0]
        if pid not in patient_files:
            patient_files[pid] = []
        patient_files[pid].append(f)

print(f"Unique patient IDs identified: {len(patient_files)}")
print(f"Patient IDs: {sorted(list(patient_files.keys()))[:20]} ... (total {len(patient_files)})")

# Inspect the structure of first few files
for pid in sorted(list(patient_files.keys()))[:5]:
    for f in patient_files[pid]:
        path = os.path.join(data_dir, f)
        print(f"\n================ File: {f} ================")
        try:
            xl = pd.ExcelFile(path)
            for sname in xl.sheet_names:
                df = xl.parse(sname)
                print(f"  Sheet: {repr(sname)} | Rows: {len(df)} | Cols: {[str(c) for c in df.columns]}")
                print("  Sample rows:")
                for i, row in df.head(3).iterrows():
                    print("    ", {str(k): str(v) for k, v in row.items()})
        except Exception as e:
            import traceback
            print(f"  Error reading {f}: {e}")
            traceback.print_exc()
