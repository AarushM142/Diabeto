# Current Project State

## Status: Phase 5 Complete ✅

### What Is Built:

#### Phase 1 — Repository Scaffolding ✅
- Monorepo architecture (`apps/api`, `apps/web`, `apps/ml`, `data/`, `templates/`, `tests/`, `docs/`).
- Full documentation suite: `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `DECISIONS.md`, `DEMO_SCRIPT.md`, and 4 teammate PRDs.

#### Phase 2 — FastAPI Backend Core ✅
- Database engine & async sessionmaker (`apps/api/app/core/database.py`).
- Settings management via Pydantic (`apps/api/app/core/config.py`).
- JWT Auth & role checks (`apps/api/app/core/auth.py`).
- Durable Postgres Outbox queue runner (`apps/api/app/core/jobs.py`).
- SQLAlchemy 2.0 Models — 12 tables (`apps/api/app/models/entities.py`).
- Pydantic Schemas (`apps/api/app/schemas/schemas.py`).
- Modular Routers: Ingestion, Adherence, Approvals, Trends, WhatsApp Webhooks.
- Deterministic Risk Engine (`apps/api/app/modules/risk/engine.py`).
- Multi-Tier Escalation State Machine (`apps/api/app/modules/risk/escalation.py`).
- AI Number-Fidelity & Safety Guardrails (`apps/api/app/modules/ai_gateway/guardrails.py`).
- GenAI Nudge Generator with Groq/Gemini + static fallback (`apps/api/app/modules/ai_gateway/llm_client.py`).
- WhatsApp channel via Twilio (`apps/api/app/channels/twilio_client.py`, `whatsapp.py`).
- Sarvam AI STT channel (`apps/api/app/channels/sarvam_stt.py`).

#### Phase 3 & Live Channels Validation ✅
- All 12 tables created in live Supabase PostgreSQL (`scripts/init_db.py`).
- 3-persona demo seed data loaded: Ramesh Kulkarni, Shanti Devi, Ananya Patil (`scripts/seed_db.py`).
- Full end-to-end pipeline tested and passing (`scripts/test_phase3_live.py`).
- Live Twilio WhatsApp Sandbox integration verified end-to-end with TwiML XML real-time inbound & outbound handling for text and Sarvam AI voice note logging.

#### Phase 4 — Deterministic Risk Engine, Timers & Escalation Outbox Worker ✅
- Multi-reading consecutive-high detection rule (`apps/api/app/modules/risk/engine.py`).
- Atomic outbox timer job enqueuing for multi-tier escalation checks (`_enqueue_escalation_timers`).
- Persistent background job dispatcher and outbox worker with `SKIP LOCKED` (`apps/api/app/core/worker.py`, `job_dispatcher.py`).
- FastAPI lifespan integration for background outbox worker management (`apps/api/app/main.py`).
- Phase 4 API Endpoints:
  - `GET /v1/patients/{id}/risks`
  - `POST /v1/escalations/{id}/ack` (with audit log generation)
  - `PUT /v1/patients/{id}/thresholds` (clinician role only, bumps version)
- Automated unit and integration test suites:
  - 34 pytest unit tests (`tests/test_risk_escalation.py`, `tests/test_risk_engine.py`, `tests/test_guardrails.py`, `tests/test_phase3_pipeline.py`).
  - Live pipeline integration script (`scripts/test_phase4_live.py`).

#### Phase 5 — Trends, Analytics & Clinician Synthesis Engine ✅
- Clinical ADA Glycemic Metrics Engine (`apps/api/app/modules/trend/analytics.py`):
  - Time-in-Range (TIR %), Time-Above-Range (TAR %), Time-Below-Range (TBR %).
  - Mean, Median, Median Absolute Deviation (MAD), Standard Deviation, Coefficient of Variation (CV%).
  - Contextual glucose breakdowns (fasting, postprandial, bedtime, random).
  - Medication & logging adherence scoring (7d/14d compliance %).
- Automated Weekly Clinical Synthesis Generator (`apps/api/app/modules/trend/weekly_summary.py`):
  - Structured, bulleted clinical highlights for physicians.
  - Doctor action recommendations based on glycemic status.
- Clinician-in-the-Loop Sign-Off Gate (`POST /v1/patients/{id}/weekly-summary/verify`):
  - Role-protected verification endpoint (`clinician`/`doctor`/`admin`).
  - Immutable audit trail recording (`audit_logs` table).
- Phase 5 API Endpoints:
  - `GET /v1/patients/{id}/trends?days=14`
  - `POST /v1/patients/{id}/weekly-summary`
  - `GET /v1/patients/{id}/weekly-summary`
  - `POST /v1/patients/{id}/weekly-summary/verify`
- Test suites:
  - 42 total passing pytest unit & integration tests (`tests/test_trends_analytics.py`).
  - Live Supabase execution script (`scripts/test_phase5_live.py`).

#### Phase 6 — Web Portals, Multi-Tiered Authorization & Botanical Design System ✅
- **Botanical / Organic Serif Design System**:
  - Implemented across all 4 web views: Clinician Portal, Coach Approvals Desk, Caregiver Sanctuary, and WhatsApp Simulator.
  - Curated palette (Warm Alabaster `#F9F8F4`, Deep Forest `#2D3A31`, Herb Sage `#8C9A84`, Terracotta `#C27B66`), Playfair Display typography, and tactile paper grain overlay.
- **Multi-Tiered Authorization (RBAC) & Persona Switching**:
  - `clinician` (Dr. Arvind Mehta, MD — Clinician of Record)
  - `coach` (Sister Kavita R. — Diabetes Care Coach)
  - `caregiver` (Ananya Kulkarni — Primary Family Caregiver)
  - `admin` (Clinic Operations Administrator)
  - Header persona selector with instant role-swapping and auto-injected `X-User-Role` and `X-User-ID` headers.
- **DPDP Consent-Gated Privacy & Data Masking**:
  - Family caregiver data masking respecting patient consent.
  - Qualitative status fallback when raw numbers are masked.
- **Audit Governance & Compliance**:
  - PostgreSQL `audit_logs` records doctor sign-offs, coach recommendation approvals/rejections, and patient consent updates.
  - Interactive Audit Trail Drawer in Clinician Portal.
- **Automated Testing & Build**:
  - Zero TypeScript compilation errors (`npm run build`).
  - Automated test coverage: 84 passing pytest tests with 0 failures across all modules.

#### Phase 7 — Personalized Care Onboarding & Dynamic Role Profile Management ✅
- **2-Step Onboarding Flow (`RoleSelectModal.tsx`)**:
  - Step 1: Role Selection with descriptive feature tags for Senior Patients, Caregivers, Clinicians, Coaches, and Administrators.
  - Step 2: Role-specific profile personalization form (Name, Age, Gender, Diabetes Type & Diagnosis, Sarvam voice language, Daily prescription medications, Family caregiver SOS contact, Glycemic targets).
- **Edit Care Profile Management Modal (`EditProfileModal.tsx`)**:
  - Available at any time via the sidebar user profile badge and top navigation bar.
  - Allows senior patients, caregivers, and clinicians to update their medications, emergency contacts, languages, and care preferences.
- **Dynamic Portal Personalization**:
  - `PatientPortal`: Dynamic personalized greetings, customized age/gender/condition hero display, customized medication pill tracker, and linked emergency contacts.
  - `CaregiverPortal`: Dynamic senior reference tags, individualized peace-of-mind fasting checks, and customizable emergency escalation targets.
  - `ClinicianPortal`: Dynamic doctor titles, clinic branding, and integration with the patient care roster.
  - `CoachPortal` & `WhatsAppSimulator`: Dynamic patient name mapping and tailored cultural dietary guardrails.
#### Phase 8 — UI/UX De-Cluttering, Left Sidebar Widgets & Interactive Meal Intelligence ✅
- **Sidebar Sub-Navigation & Quick Action Widgets (`SidebarNav.tsx`)**:
  - Organized feature navigation for Senior Patients: Daily Sanctuary Overview, Medication Schedule, Glucose & CGM Corridor, Indian Meal & Plate Scanner, Attending Physician Touchpoint, and Hydration & Habits.
  - Quick Health Glance Widgets:
    - Fasting Sugar & Target Goal Card (`128 mg/dL 🎯 In Range`).
    - Next Medicine Dose Tracker with instant 1-click confirmation (`Glimepiride 1mg Due 8:00 PM`).
    - Quick Action Button: `📸 Scan Food Plate` trigger with animated sparkles.
    - High-contrast 1-tap SOS Emergency dialer (Caregiver & 108/112 Ambulance).
- **Interactive Indian Meal & Food Plate Scanner (`MealScannerModal.tsx`)**:
  - Multimodal Google Gemini Vision photo analysis for Indian thalis, dosas, curries, and sweets.
  - Interactive plate selector (Roti Thali, Plain Dosa & Sambar, Moong Khichdi, Alphonso Mango) and camera/photo file upload.
  - Automatic carbohydrate breakdown, glycemic impact rating (LOW/MEDIUM/HIGH), sweet detection with high-sugar alerts, senior-friendly multilingual explanations (English, Hindi, Marathi), and simulated 2-hour postprandial glucose curves.
- **De-Cluttered Senior Sanctuary (`PatientPortal.tsx`)**:
  - Category Filter Pill Bar (`All Sanctuary` | `💊 Daily Medicines` | `📈 Glucose & CGM` | `🍲 Food & Meal Scanner` | `🩺 Doctor & Care Team` | `💧 Hydration & Milestones`) allowing seniors to focus on a single care task without visual fatigue.
#### Phase 9 (PRD Phase 0) — Elder-Friendly Design System, PWA Shell & Today Screen ✅
- **Devanagari Typography & Multi-Language Rendering**:
  - Embedded `Noto Sans Devanagari` from Google Fonts to fix tofu/missing glyph rendering for Hindi and Marathi headings.
  - Dynamic `[lang="hi"]` and `[lang="mr"]` typography rules applied to all headings and serif elements.
- **Elder Design Standards & 3-Mode Text Scaling**:
  - Increased base font size to 18px (`html.text-normal: 18px`, `html.text-large: 22px`, `html.text-xl: 26px`).
  - Implemented 56px minimum tap target height across all interactive buttons (`.btn`).
  - Switched from `100vh` to `100dvh` for notch and mobile browser safe-area support.
- **PWA Application Shell**:
  - Created `public/manifest.json` with standalone orientation and theme color tokens.
  - Authored `public/sw.js` with static cache-first shell caching and network-first offline API fallback.
  - Created high-resolution botanical vector PWA icon (`public/pwa-icon.svg`).
  - Registered service worker in `index.html`.
- **Elder Navigation & Today Screen (`TodayScreen.tsx`, `PatientBottomNav.tsx`)**:
  - Implemented mobile bottom-navigation bar with 4 primary elder tabs (Today, Log, Ask, Me) and 56×56px touch targets.
  - Integrated persistent floating Emergency SOS button with 1-tap dialer (`tel:112` / caregiver emergency phone).
  - Built Today screen matching PRD §4 layout: locale-aware greeting and date, high-visibility latest glucose card with status indicators, scheduled medicine card with 56px "Taken" and "Snooze" triggers, daily health checklist with completion tracking, and doctor-verified care guidance card.

#### Phase 10 — Senior-First Ergonomic UI Simplification & Simple Mode (ADR-007) ✅
- **Cognitive & Motor Ergonomics for 60+ Users**:
  - Researched senior UI guidelines (NN/g, AARP, GrandPad, Oscar Senior) to eliminate cognitive fatigue and visual clutter.
  - Applied the **Rule of 3**: elevated immediate action (Next Medication Dose), peace of mind (Latest Blood Sugar), and daily checklist to the primary view hierarchy.
- **Desktop Sidebar Independent Scrolling & Viewport Lock**:
  - Configured `.app-container` with `height: 100dvh; overflow: hidden;`.
  - Locked `.desktop-sidebar` with `height: 100dvh; position: sticky; top: 0; left: 0; overflow-y: auto;` preventing floating/dislodging during page scroll.
  - Cleaned up patient sidebar navigation: streamlined to 5 serene tabs and hid developer jargon (`FastAPI Engine • Live`) from senior patient view.
- **1-Click Senior Simple Mode**:
  - Added `seniorSimpleMode` top-bar toggle (`🌿 Senior Simple Mode: ON/OFF`).
  - Automatically activates 22px high-legibility text scale and reduces UI to essential daily cards.
- **Devanagari Localization Completeness**:
  - Fixed reactive language switching across all Devanagari labels (`hi`, `mr`, `en`) for checklist tasks, simple mode toggles, status pills, and bottom navigation tabs.

#### Phase 11 — Minimalist Clinician Directory & Dedicated Patient Chart View ✅
- **De-Cluttered Clinician Portal Architecture (`ClinicianPortal.tsx`)**:
  - Eliminated dual-rendering clutter where the 8+ patient roster and detailed patient telemetry were simultaneously stacked on a single endless scrolling page.
  - Implemented 2-stage hierarchical directory workflow:
    1. **Patients Directory View (`viewMode: 'roster'`)**: Clean, minimalist grid of assigned patients with real-time search, triage filter pills (All, Needs Attention, Watch List, Stable), summary metric cards (Active Roster, Average TIR %, Needs Attention), and one-click transition into individual patient dossiers.
    2. **Dedicated Patient Chart View (`viewMode: 'chart'`)**: Full-screen clinical workspace for the selected patient featuring:
       - Top breadcrumb: `Patients → [Patient Name] ([Care Code])` with one-click return to the directory (`← Back to Patients Directory`).
       - In-chart quick switcher (`Prev` / `Next` / dropdown) allowing clinicians to cycle through patients without bouncing back to the directory.
       - Patient metadata hero card with direct OPD consultation sheet PDF download and phone dialer.
       - 4 focused clinical tabs: 📊 Glycemic Telemetry & AGP, 🍲 Meal & Nutrition Logs, 💊 Medication Regimen & Adherence, 🩺 Weekly Consultation & Sign-Off.
- **Multilingual Support**:
  - Full English, Hindi, and Marathi localization for breadcrumbs, directory headers, and patient navigation actions.

#### Phase 12 — Doctor-Patient Connection Code System & Real Meal Inspection ✅
- **Elder-to-Doctor Connection Code Architecture**:
  - Unique 6-letter uppercase codes (e.g. `DIA-RAM789`, `DIA-SHA402`, `DIA-ANA303`) eliminating complex onboarding friction for elderly patients.
  - Endpoints added:
    - `GET /v1/patients/{id}/connection-code`
    - `POST /v1/clinicians/connect-patient`
    - `GET /v1/clinicians/{id}/patients`
    - `GET /v1/meals/history/{patient_id}`
  - Automatically establishes `CareRelationship` and emits an immutable `audit_logs` record for clinical governance.
- **Elderly Patient UI Integration**:
  - Added dedicated **Care Connection Code Card** to the elder's Today Screen and Care Team tab.
  - Features 1-click **[ 📋 Copy Code ]** and **[ 💬 Share with Doctor on WhatsApp ]** deep links.
- **Role-Tailored Left Sidebar Navigation**:
  - Cleaned up quick glance widgets in `SidebarNav.tsx`:
    - Clinicians see active triage overview (Active patients count, TIR average, critical alerts) and quick connection guidance.
    - Caregivers see personalized elder metrics (Fasting sugar, pill confirmation, plate scanner, emergency SOS).
    - Removed food plate scanning and patient pill actions from doctor view.
- **De-Cluttered Clinician Portal with Real Food Logs**:
  - Replaced camera plate scanner in doctor view with photographic patient meal intake history (`GET /v1/meals/history/{patient_id}`).
  - Fast triage sorting (`Needs Attention` first, `Lowest TIR%`, `Adherence %`, `A-Z`) with instant connection modal (`+ Connect Patient`).
- **Automated Test Coverage & Dynamic User Foreign Key Safety**:
  - Automatically ensures all authenticated clinicians (including dynamic Google OAuth IDs `goog_*` and customized personas) are persisted to the PostgreSQL `users` table via `ensure_db_user`, preventing foreign key constraint violations (`care_relationships_user_id_fkey`) upon patient connection.
  - Full pytest suite passing with 0 failures (`tests/test_doctor_patient_connection.py`).
  - Zero TypeScript compilation errors on Vite production build.

### Active Dev Servers:
- **FastAPI Backend**: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)
- **React Web Portal**: `http://localhost:5173`
- **WhatsApp Webhook Tunnel**: `https://slimy-toys-grab.loca.lt/v1/webhooks/whatsapp`






