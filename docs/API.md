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

### 4. Trends
* `GET /v1/patients/{id}/trends?days=14`: Retrieve rolling glucose aggregates and summary stats.

### 5. Webhooks
* `GET /v1/webhooks/whatsapp`: Meta webhook handshake verification.
* `POST /v1/webhooks/whatsapp`: Process inbound WhatsApp text/audio events.
