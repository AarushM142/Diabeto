# API Reference & Contracts

## Endpoints

### 1. Ingestion & Patients
* `POST /v1/patients`: Register new patient.
* `POST /v1/patients/{id}/events`: Log a health event (glucose, meal, activity). Validates glucose range (20–600 mg/dL). Synchronously executes risk engine.

### 2. Adherence & Medications
* `POST /v1/patients/{id}/medications`: Create scheduled dose.
* `GET /v1/patients/{id}/medications`: Fetch active medication schedules.

### 3. Approvals Desk
* `GET /v1/approvals`: List pending coach recommendations.
* `POST /v1/approvals/{id}/decision`: Record approval, edit, or rejection.

### 4. Trends & Analytics
* `GET /v1/patients/{id}/trends?days=14`: Retrieve comprehensive ADA glycemic metrics (TIR%, TAR%, TBR%, Mean, Median, MAD, CV%, SD), context breakdown (fasting, postprandial), adherence score, and individual readings.

### 5. Weekly Clinical Synthesis & Doctor Verification Gate
* `POST /v1/patients/{id}/weekly-summary`: Generate an automated clinical weekly synthesis for a patient (defaults to `unverified`).
* `GET /v1/patients/{id}/weekly-summary`: Fetch the latest weekly synthesis and verification status.
* `POST /v1/patients/{id}/weekly-summary/verify`: Clinician sign-off gate. Marks summary as `verified`, attaches doctor notes, and records an immutable `audit_logs` entry.

### 6. Risk, Escalations & Thresholds
* `GET /v1/patients/{id}/risks`: List active risk events for a patient.
* `POST /v1/escalations/{id}/ack`: Acknowledge an active risk event, stopping escalation timers.
* `PUT /v1/patients/{id}/thresholds`: Update per-patient clinical thresholds and escalation timings (Clinician role only).

### 7. Clinician Roster & Doctor-Patient Connection System
* `GET /v1/patients/{id}/connection-code`: Fetch patient's unique 6-character connection code (e.g. `DIA-RAM789`) and invite link.
* `POST /v1/clinicians/connect-patient`: Connect patient to clinician roster using connection code. Updates `clinician_of_record_id`, creates `CareRelationship`, and records immutable `audit_logs` entry.
* `GET /v1/clinicians/{doctor_id}/patients`: Fetch full clinician patient triage roster with computed severity rank (`critical`, `watch`, `stable`), latest glucose reading, ADA TIR %, active alerts, and adherence rate.
* `GET /v1/meals/history/{patient_id}`: Retrieve real chronological food intake logs, carb counts, and glycemic responses.

### 8. Webhooks
* `GET /v1/webhooks/whatsapp`: Meta webhook handshake verification.
* `POST /v1/webhooks/whatsapp`: Process inbound WhatsApp text/audio events (supports TwiML XML instant response and Sarvam STT).


