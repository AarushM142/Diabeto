# Database Design & Rules

## 1. Primary Store: PostgreSQL (Supabase)
- Pure relational database using PostgreSQL with JSONB columns for flexible measurements.
- Uses **SQLAlchemy 2.0 async** and **Alembic** for forward migrations.

## 2. Core Tables
- `clinics`: Multi-clinic tenancy root.
- `users`: Clinicians, coaches, admins, and caregivers.
- `patients`: Patient demographics, language (`hi`, `mr`, `en`), clinic link.
- `care_relationships`: Permissions mapping for caregivers (`view_adherence`, `view_alerts`, `view_raw_glucose`).
- `patient_thresholds`: Per-patient low/high glucose boundaries.
- `medication_schedules`: Scheduled recurring daily medications.
- `health_events`: Append-only immutable log of glucose, meals, activities, and symptoms.
- `risk_events`: Breaches detected by the deterministic rule engine.
- `recommendations`: LLM-generated lifestyle nudges awaiting coach review.
- `approvals`: Audit record of human approval/rejection decisions.
- `background_jobs`: Transactional outbox job queue.
- `audit_logs`: Append-only tamper-evident security audit trail.
- `care_messages`: Shared real-time care thread messages across patient, AI companion, caregiver, and doctor. Subscribed live via Supabase Realtime broadcast.

## 3. Row-Level Security (RLS) Rules & Realtime
- Clinicians only access patients within their `clinic_id` or connected roster.
- Caregivers only access patients mapped via `care_relationships` and only the fields permitted in `care_relationships.permissions`.
- `care_messages` has RLS enabled and is registered in `supabase_realtime` publication for live multi-party chat sync.
