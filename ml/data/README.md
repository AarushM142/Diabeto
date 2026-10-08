# Continuous Glucose Monitoring (CGM) Dataset Directory

Teammate 4: Drop your cleaned public T2DM CGM dataset here:

**Target File:** `ml/data/cgm_demo_data.csv`

**Required Format:**
```csv
timestamp,glucose_mgdl,patient_id
2026-09-01 08:00:00,120,pt_cgm_01
2026-09-01 08:15:00,135,pt_cgm_01
2026-09-01 08:30:00,158,pt_cgm_01
```

**Requirements:**
- Exactly 3 columns: `timestamp`, `glucose_mgdl`, `patient_id`
- Continuous time series (e.g. 5-min or 15-min intervals)
- ~2,000 continuous rows
- Zero blank/NaN values
