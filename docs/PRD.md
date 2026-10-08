# Diabeto — Elderly Diabetes Care Platform
## Master Product Requirements Document (PRD)

---

## 1. Executive Summary & Vision

**Diabeto** is a closed-loop diabetes care management platform designed specifically for elderly patients in India. Unlike passive tracking apps that require digital literacy, Diabeto interacts with seniors through **WhatsApp (interactive buttons, text, and multilingual voice notes)** in English, Hindi, and Marathi. 

The platform bridges the gap between elderly patients, family caregivers, lifestyle coaches, and clinicians through automated medication adherence tracking, deterministic clinical safety nets, explainable AI lifestyle nudges, and proactive caregiver escalation ladders.

---

## 2. Target Users & Key Personas

| Actor | Description & Needs | Primary Interface |
| :--- | :--- | :--- |
| **Elderly Patient (60+ yrs)** | Low digital literacy, prefers voice or simple buttons in regional languages (Hindi, Marathi, English). | WhatsApp (Meta Business API) |
| **Family Caregiver (Son/Daughter)** | Wants peace of mind, daily adherence confirmation, and immediate alerts when safety thresholds are breached. | WhatsApp Alerts & Caregiver Portal |
| **Lifestyle Coach / Nurse** | Monitors patient trends, reviews and approves AI-generated lifestyle nudges. | Web Dashboard (Coach Portal) |
| **Clinician of Record (Doctor)** | Configures medication schedules and clinical thresholds, reviews verified weekly summaries. | Web Dashboard (Clinician Portal) |
| **Clinic Administrator** | Manages clinic onboarding, staff assignments, and system audit logs. | Web Dashboard (Admin Console) |

---

## 3. Core Closed-Loop Workflow

$$\text{Capture (WhatsApp/Voice)} \rightarrow \text{Validate} \rightarrow \text{Derive State} \rightarrow \text{Detect (Rules + ML)} \rightarrow \text{Decide (Rules + Human Approval)} \rightarrow \text{Act (WhatsApp)} \rightarrow \text{Feedback}$$

1. **Capture & Ingestion:** Senior sends text or voice notes. Sarvam AI converts speech to text. System validates plausibility (20–600 mg/dL) and echoes back for confirmation before storing in an immutable event log.
2. **Deterministic Safety (Zero AI):** Ingestion synchronously triggers rule evaluations for threshold breaches (<70 mg/dL, >250 mg/dL, consecutive highs).
3. **Escalation Ladder:** Unacknowledged alerts or missed medication doses escalate automatically ($T_1 \text{ Caregiver} \rightarrow T_2 \text{ Coach/Doctor} \rightarrow \text{Emergency 112/108 Guidance}$).
4. **Explainable AI Nudges:** Non-critical lifestyle patterns are analyzed by ML, drafted by Groq/Gemini LLM with strict number-fidelity guardrails, routed to human coaches for approval, and sent to patients.
5. **Verified Weekly Summary:** Weekly clinical synthesis generated for the doctor, marked as unverified until the doctor approves it with one click.

---

## 4. Key Clinical Boundaries & Directives

> [!CAUTION]
> 1. **No Autonomous Clinical Actions:** The platform does not diagnose conditions or modify medication doses.
> 2. **Zero AI Dependency for Safety:** All emergency escalations, critical threshold alerts, and missed-dose ladders run exclusively on deterministic Python rules and pre-approved static templates.
> 3. **Privacy by Design:** No PII (names, phone numbers) is ever sent to LLM providers. Consent-scoped Row Level Security (RLS) restricts caregiver access.

---

## 5. Technology Stack Summary

* **Backend:** FastAPI (Python 3.11+, Async), Pydantic validation, modular monolith.
* **Database & Jobs:** Supabase PostgreSQL, SQLAlchemy 2.0 async, Alembic migrations, Postgres Outbox jobs (`SKIP LOCKED`).
* **Voice & Language:** Sarvam AI Saaras v3 STT (Hindi, Marathi, English, code-mixed).
* **Channel:** WhatsApp Cloud API (Meta) / Twilio sandbox.
* **ML & Deep Learning:** scikit-learn, LightGBM, statsmodels, SHAP, PyTorch (CGM LSTM demo).
* **Generative AI:** Groq / Google Gemini API with JSON Schema enforcement and number guardrails.
* **Dashboards:** Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Recharts.

---

## 6. Team PRD References

For detailed sub-task specifications assigned to individual team members, refer to:
* [Teammate 1: Multilingual Templates & Voice Audio PRD](file:///c:/Users/Asus/Downloads/Diabeto/docs/team_prds/PRD_TEAMMATE_1_TEMPLATES_AND_VOICE.md)
* [Teammate 2: Seed Data, Patient Personas & Schedules PRD](file:///c:/Users/Asus/Downloads/Diabeto/docs/team_prds/PRD_TEAMMATE_2_SEED_DATA_AND_PERSONAS.md)
* [Teammate 3: Third-Party Accounts, API Keys & Postman PRD](file:///c:/Users/Asus/Downloads/Diabeto/docs/team_prds/PRD_TEAMMATE_3_ACCOUNTS_APIS_AND_POSTMAN.md)
* [Teammate 4: CGM ML Dataset & Hackathon Pitch Deck PRD](file:///c:/Users/Asus/Downloads/Diabeto/docs/team_prds/PRD_TEAMMATE_4_CGM_DATA_AND_PRESENTATION.md)
