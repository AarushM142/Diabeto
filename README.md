# Diabeto — Elderly Diabetes Care Platform 🩺

> A closed-loop diabetes management platform tailored for Indian seniors, powered by WhatsApp, Sarvam AI speech-to-text, deterministic clinical safety rules, and explainable AI nudges.

---

## 👥 Team Quick Links

👉 **[Master Team Roles & Task Assignment Guide](file:///c:/Users/Asus/Downloads/Diabeto/docs/TEAM_ROLES_AND_TASKS.md)** — Start here! Explains what each of the 5 members will do.

| Team Member | Role | Assigned PRD | Focus Area |
| :--- | :--- | :--- | :--- |
| **Tech Lead** | **Lead Developer** | [`docs/PRD.md`](file:///c:/Users/Asus/Downloads/Diabeto/docs/PRD.md) | FastAPI backend, Supabase DB/RLS, Rule Engine, Next.js UI |
| **Teammate 1** | **Content & Audio** | [`docs/team_prds/PRD_TEAMMATE_1_TEMPLATES_AND_VOICE.md`](file:///c:/Users/Asus/Downloads/Diabeto/docs/team_prds/PRD_TEAMMATE_1_TEMPLATES_AND_VOICE.md) | WhatsApp templates (EN/HI/MR) + Voice audio test suite |
| **Teammate 2** | **Data & Personas** | [`docs/team_prds/PRD_TEAMMATE_2_SEED_DATA_AND_PERSONAS.md`](file:///c:/Users/Asus/Downloads/Diabeto/docs/team_prds/PRD_TEAMMATE_2_SEED_DATA_AND_PERSONAS.md) | 3 Golden Demo Patient Personas & 14-day history |
| **Teammate 3** | **APIs & QA** | [`docs/team_prds/PRD_TEAMMATE_3_ACCOUNTS_APIS_AND_POSTMAN.md`](file:///c:/Users/Asus/Downloads/Diabeto/docs/team_prds/PRD_TEAMMATE_3_ACCOUNTS_APIS_AND_POSTMAN.md) | Third-party API credentials + Postman test collection |
| **Teammate 4** | **ML Data & Slides** | [`docs/team_prds/PRD_TEAMMATE_4_CGM_DATA_AND_PRESENTATION.md`](file:///c:/Users/Asus/Downloads/Diabeto/docs/team_prds/PRD_TEAMMATE_4_CGM_DATA_AND_PRESENTATION.md) | Public CGM dataset + Hackathon pitch deck & demo video |

---

## 📁 Monorepo Structure

```text
├── apps/
│   ├── api/                    # FastAPI backend modular monolith
│   │   ├── app/
│   │   │   ├── core/           # Config, database, auth, jobs
│   │   │   ├── modules/        # Ingestion, adherence, risk, trend, ai_gateway, approvals
│   │   │   ├── channels/       # WhatsApp webhook handlers
│   │   │   └── main.py         # App entrypoint
│   │   └── requirements.txt    # Python dependencies
│   ├── web/                    # Next.js frontend dashboards (Clinician, Coach, Admin)
│   └── ml/                     # ML worker & PyTorch CGM time-series scripts
│       └── data/               # CGM dataset storage
├── data/                       # Synthetic seed data (seed_patients.json)
├── templates/                  # Multilingual WhatsApp message templates (messages.json)
├── tests/
│   ├── fixtures/
│   │   └── audio/              # Voice note audio samples (.mp3/.wav)
│   ├── diabeto_api.postman_collection.json # API test collection
│   ├── test_risk_engine.py     # Deterministic risk engine tests
│   └── test_guardrails.py      # AI guardrails & number-fidelity tests
├── docs/                       # Project documentation & team PRDs
│   ├── TEAM_ROLES_AND_TASKS.md # Master team assignment guide
│   ├── PRD.md                  # Master PRD
│   ├── ARCHITECTURE.md         # System architecture & sequence flows
│   ├── DATABASE.md             # Schema & RLS policies
│   ├── API.md                  # API contracts
│   ├── DECISIONS.md            # Architecture Decision Records
│   ├── DEMO_SCRIPT.md          # 2-minute live demo script
│   └── team_prds/              # PRDs for Teammates 1 to 4
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
└── pytest.ini                  # Pytest configuration
```

---

## 🚀 Quickstart (Backend)

1. **Copy Environment Variables:**
   ```bash
   cp .env.example .env
   ```
2. **Install Python Dependencies:**
   ```bash
   pip install -r apps/api/requirements.txt
   ```
3. **Run Unit Tests:**
   ```bash
   python -m pytest
   ```
4. **Run API Locally:**
   ```bash
   python apps/api/app/main.py
   ```
   API live at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).
