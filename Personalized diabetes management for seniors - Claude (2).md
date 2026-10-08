10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

# **Elderly Diabetes Care Platform: Technical Blueprint** 

Labels used: **[PRODUCT]** product decision, **[CLINICAL]** needs clinical validation, **[FUTURE]** production only, **[NOW]** build for the hackathon. 

## **Part 1: Foundation** 

### **1.1 Core objective** 

A **closed-loop care workflow system** , not a tracker: 

```
Capture → Validate → Derive state → Detect → Decide (rules + humans) → Act (WhatsApp) →
Feedback
```

- **Capture:** WhatsApp messages (buttons, text, voice, photo) produce structured events. 

- **Derive state:** adherence, baselines, and trends are computed from the event log. 

- **Detect:** rules first, then statistics/ML. 

- **Decide:** deterministic rules for safety, humans (coach/doctor) for anything personalized or clinical. 

- **Act:** reminders, nudges, alerts, and escalations through a channel adapter. 

- **Feedback:** acknowledgements and outcomes update baselines and the intervention history. 

### **1.2 Actors** 

|**Actor**|**Sees**|**Creates**|**Modifies**|**Receives**|
|---|---|---|---|---|
|Patient|Own<br>summaries,<br>own<br>approved tips|Glucose, meds yes/no,<br>meals, symptoms, consents|Own consent,<br>language,<br>reminder<br>preferences|Reminders,<br>approved<br>tips, safety<br>protocol<br>messages|
|Caregiver (family)|Only what<br>patient<br>consented to<br>(default:<br>adherence +<br>alerts, not raw<br>glucose)|Logs on patient's behalf<br>(<br>`reported_by=caregiver`)|Own<br>notification<br>prefs|Escalations,<br>daily digest|
|Coach<br>(family/hired/hospital)|Assigned<br>patients'<br>trends, nudge<br>queue|Approvals, care notes,<br>goals|Reminder<br>timing,<br>lifestyle goals|Approval<br>requests,<br>non-<br>response<br>alerts|
|Clinician of record|Own clinic's<br>patients, full<br>history,<br>summaries|Thresholds, med schedule,<br>approvals|Thresholds,<br>protocols|Risk<br>escalations,<br>weekly<br>summaries|



https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

1/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

Admin 

|Clinic config,|Clinics, users, templates|Role|System|
|---|---|---|---|
|user||assignments|health|
|mapping, no||||
|clinical data||||
|by default||||



### **1.3 Boundaries** 

### **External** 

**Ours External** Event log, patient state, rules, approvals, escalation, WhatsApp Cloud API / Twilio, LLM provider, dashboards, AI orchestration speech-to-text, auth provider **[FUTURE]** CGM/band adapters CGM vendors, wearables, EHR/hospital systems 

CGM vendors, wearables, EHR/hospital systems 

Responsibility split (to avoid unsafe claims): we do **tracking, risk flagging, and pre-approved guidance** . We do **not** diagnose, change doses, or replace emergency services. Emergency response means telling the patient to call 112/108 and alerting humans. 

## **Part 2: End-to-End Workflow** 



<!-- Start of picture text -->
Onboard: clinic registers<br>patient, consent captured<br>Clinician sets meds,<br>thresholds, clinician-of-<br>record<br>Routine setup: meal times,<br>language, caregiver links<br>Daily WhatsApp check-ins:<br>meds, glucose, meals,<br>symptoms<br>Validate + store events<br><!-- End of picture text -->

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

2/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 



<!-- Start of picture text -->
Derive state: adherence,<br>baselines, trends<br>Rules: threshold or missed-<br>Weekly clinician summary<br>dose breach?<br>no<br>Pattern detection<br>Personalization: build<br>yes<br>context<br>LLM phrases finding<br>Approval queue: coach or<br>Escalation state machine<br>doctor<br>Send tip with reason,  Protocol message,<br>confidence, reviewer caregiver, coach, doctor<br>Patient reaction logged<br><!-- End of picture text -->



<!-- Start of picture text -->
Technical steps:<br><!-- End of picture text -->

1. **Onboarding:** admin/clinician creates patient; patient consents via WhatsApp opt-in; the system refuses to enable alerts without a clinician of record. 

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

3/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

2. **Setup:** `medication_schedule` rows create scheduled reminder jobs. 

3. **Daily loop:** webhook receives message, dedupes on provider message ID, parses, **echoes back for confirmation** , then writes an event. 

4. **Post-write:** the event triggers rule evaluation (synchronous, fast) and enqueues pattern/trend jobs (async). 

5. **Nudges:** a pattern becomes a structured finding, then a context object, then an LLM draft, then validation, then the approval queue, then delivery. 

6. **Weekly job** creates the summary for the doctor, labeled AI-generated, with a verify button. 

## **Part 3: System Architecture** 



<!-- Start of picture text -->
Clients API: Modular Monolith<br>Web Dashboard: coach,  API + Webhooks Ingestion Risk Engine<br>caregiver, clinician<br>Adherence<br>Notifications + Escalation<br>Trend Approvals<br>Personalization AI Gateway<br>Reporting<br>Data<br>Job Queue<br>Postgres<br>ML Worker: Python<br>External<br>LLM Provider<br>Speech-to-text<br>Patient on WhatsApp WhatsApp Provider<br>Component Does Owns Called by / Sync? Form<br>calls<br>API + Auth, nothing Clients, Sync Module<br>Webhooks routing, WhatsApp /<br>webhook modules<br>intake<br>Ingestion Parse, events API / DB, Risk, Sync Module<br>validate, STT<br>normalize,<br>confirm, write<br>events<br>Adherence Schedules, medication_schedule  , Queue / DB, Async Module<br><!-- End of picture text -->

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

4/21 

|10/5/26, 11:26 PM|missed-dose<br>detection|`med_logs`<br>Elderly Diabetes Care P|Notif<br>latform: Technical Bluepri|nt||
|---|---|---|---|---|---|
|Risk Engine|Threshold<br>and rule<br>evaluation,<br>severity|`risk_events`|Ingestion,<br>Queue / Notif|**Sync on**<br>**write**|Module|
|Trend|Aggregates,<br>baselines,<br>slopes|`daily_aggregates`,<br>`baselines`|Queue / DB|Async|Module|
|Personalization|Builds<br>context, picks<br>candidate<br>nudges|`intervention_history`|Queue / AI<br>Gateway|Async|Module|
|AI Gateway|Prompting,<br>schema<br>validation,<br>logging|`ai_requests`|Personalization<br>/ LLM|Async|Module|
|Approvals|Routes drafts<br>by message<br>class|`approvals`|Dashboard /<br>Notif|Async<br>(human)|Module|
|Notifications +|Channel|`notifications`,|Risk, Approvals|Async,|Module|
|Escalation|adapter, state<br>machine,<br>timers|`escalations`|/ WhatsApp|durable||
|Reporting|Summaries,<br>clinician<br>views|none (reads)|Dashboard,<br>Queue|Mixed|Module|
|ML Worker|Model<br>training and|model registry table|Queue / DB|Async|**Separate**<br>**process**|
||scoring||||(Python<br>deps)|



Independent service: **only the ML worker** . Everything else stays in one deployable. 

## **Part 4: Internal Module Design** 



<!-- Start of picture text -->
Raw message<br><!-- End of picture text -->

Validate: range, units, jumps 

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

5/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint g , , j p 



<!-- Start of picture text -->
Echo-confirm with patient<br>Write event + dedupe key<br>Aggregate job Rule evaluation<br>Baselines + trends Risk event + severity<br>Pattern detector Escalation state machine<br>Finding: pattern, evidence,<br>confidence<br>Context builder<br>AI Gateway<br>Approval router<br><!-- End of picture text -->

**Health data:** rejects implausible values (e.g., glucose <20 or >600) into a "please re-check" flow rather than storing silently. 

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

6/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

- **Adherence:** each scheduled dose creates a job. States: `scheduled → reminded → (confirmed | retry → retry → missed)` . Missed triggers caregiver ladder. 

- **Trend:** daily aggregates, 7/14/28-day medians, Theil-Sen slope, CUSUM change detection. 

- **Risk:** deterministic rules produce `risk_event(type, severity, evidence_ids)` . Statistical flags can only _add_ risk events, never suppress a rule. 

- **Personalization:** context builder (deterministic) → candidate action chosen from an **action library** (clinician-approved action types) → LLM phrases it. 

## **Part 5: AI Architecture** 



<!-- Start of picture text -->
Events + state<br>Select relevant context<br>Permission + PII filter:<br>pseudonymous ID, no<br>name/phone<br>Prompt builder: fixed<br>system prompt + JSON<br>context<br>LLM: JSON-schema output<br>Schema + content<br>validation<br>Safety checks: no dose, no<br><!-- End of picture text -->

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

7/21 

10/5/26, 11:26 PM 



<!-- Start of picture text -->
Elderly Diabetes Care Platform: Technical Blueprint<br>diagnosis, numbers match  invalid<br>source<br>fail<br>Fallback: pre-approved<br>Approval queue<br>template<br>Patient / caregiver / clinician<br><!-- End of picture text -->

**Sent to model:** pseudonymous patient ID, language, finding ( `pattern` , `evidence` numbers, `confidence_label` ), 2-3 relevant memory items (routine, last accepted tip, care note), allowed action type. **Never sent:** name, phone, address, raw message history, free-text from third parties unsanitized. 

**Structured output:** `{action_type, message_text, reason_text, confidence_label, language}` . Validation rules: 

- `action_type` ∈ allowed enum 

- every number in text must exist in the evidence payload 

- banned patterns (dose, drug names not on the patient's list, "diagnosis") 

- length limit for seniors (≤ 2 sentences) 

**Hallucination control:** the LLM receives conclusions, not data to interpret. It rephrases. Explanations (SHAP/rule evidence) are computed _before_ the LLM. Invalid output → fallback template, never a retry loop of unchecked text. 

**Medical decisions stay outside:** severity, escalation, thresholds, and message class are determined by rules. 

**Logging/versioning:** `ai_requests` stores prompt version, model name/version, schema version, context hash (not full context), latency, tokens, validation result. **Cost control:** only generate nudges for patterns that pass a minimum-confidence gate; cache by `(finding_hash, language)` ; small fast model by default; cap per patient per day. **Prompt injection:** user text is never placed in the system prompt; free text is parsed in a separate low-privilege call whose output is schema-only and goes through patient confirmation. 

|**Technique**|**Decision**|
|---|---|
|Traditional ML (GBM, regression)|**Build**(small scale)|
|Time-series DL (LSTM/GRU)|**Demo on public CGM data only**[FUTURE live]|
|LLM|**Build**(phrasing + parsing only)|
|RAG, vector DB, embeddings|**Do not build.**No unstructured corpus; context fits in the prompt|
|Fine-tuning|**Do not build**|



https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

8/21 

10/5/26, 11:26 PM Fine tuning 

Elderly Diabetes Care Platform: Technical Blueprint 

**Do not build** 

Agents 

**Do not build.** Autonomous tool-calling is the wrong risk profile 



<!-- Start of picture text -->
Part 6: Risk Detection<br>Raw reading<br>Validation<br>Layer 1: rule engine, per-<br>Layer 2: stats/ML, async<br>patient thresholds<br>Risk event<br>Severity: info, watch,<br>urgent, critical<br>Escalation logic<br>Layer 3: LLM explanation,  Pre-approved protocol<br>non-critical only message, critical<br>User-facing action<br><!-- End of picture text -->

**Layer 1 (rules)** [CLINICAL]: low/high thresholds, consecutive-high days, missed doses N in a window, dh d i l ibl j Th h l it https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

9/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

adherence drop, implausible jump. These run synchronously on write. 

- **Layer 2 (stats/ML):** robust anomaly detection (median/MAD), CUSUM, miss-likelihood model. Output feeds `watch` -level events only unless the doctor chooses otherwise. 

- **Layer 3 (LLM):** explains already-detected non-critical patterns. **Critical alerts use pre-translated, clinician-reviewed templates only.** 

- **False positives / alert fatigue:** cooldowns per risk type, severity tiers, daily digest for low severity, track acknowledged-but-useless alerts. 

- **False negatives:** rules are the safety net; unreviewed thresholds fall back to conservative defaults; missing data itself triggers "no check-in for 24h" [CLINICAL]. 

- **Escalation ladder** [CLINICAL timings]: 



<!-- Start of picture text -->
protocol message<br>Sent<br>no reply in T1<br>patient replies CaregiverAlerted<br>reply or caregiver confirms no ack in T2<br>Acknowledged CoachDoctorAlerted<br>severe or unreachable<br>EmergencyGuidance<br><!-- End of picture text -->

**Part 7: Events** 

All events are rows in an append-only `events` table plus a job enqueued where async work is needed ( **transactional outbox pattern** : event insert and job insert in the same transaction). No Kafka. 

|**Event**|**Producer**|**Consumer**|**Async**|**Idempotency**<br>**key**|**Ordering**|
|---|---|---|---|---|---|
|GlucoseRecorded|Ingestion|Risk (sync),|Risk|provider msg|by|
|||Trend|sync,|ID|timestamp,|



https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

10/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

||||rest<br>async||not arrival|
|---|---|---|---|---|---|
|MedicationScheduled|Adherence|Notifications|Async|schedule_id +<br>date|none|
|MedicationTaken|Ingestion|Adherence,<br>Trend|Async|msg ID|per dose|
|MedicationMissed|Adherence|Risk,<br>Notifications|Async|dose_id|after<br>retries|
|MealLogged /<br>ActivityLogged /<br>SymptomReported|Ingestion|Trend, Risk<br>(symptoms)|Async|msg ID|by<br>timestamp|
|RiskDetected|Risk Engine|Escalation|Sync<br>dispatch|risk type +<br>window|strict per<br>patient|
|RecommendationGenerated|AI Gateway|Approvals|Async|finding_hash|none|
|NotificationSent|Notifications|Audit,<br>Escalation<br>timers|Async|notification_id|none|
|CaregiverEscalated|Escalation|Audit,|Async|escalation_id|strict per|
|||Dashboard||+ step|escalation|



Retries: exponential backoff with a max, then dead-letter table visible on an admin screen. Audit trail required for RiskDetected, approvals, escalations, and notification sends. 



<!-- Start of picture text -->
Trend<br>Risk Escalation timers, persisted Notifications<br>Ingestion event + job, one tx Worker<br>events + jobs<br>Adherence<br>Dead-letter table<br>Part 8: Data Architecture<br>CLINIC<br>employs owns<br>USER PATIENT<br>has<br>participates acts takes generates triggers receives gets<br>CARE_RELATIONSHIP AUDIT_LOG MEDICATION HEALTH_EVENT RISK_EVENT RECOMMENDATION NOTIFICATION<br><!-- End of picture text -->

follows 

needs 

starts 

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

11/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

follows 

needs 

starts 

|MEDICATION_SCHEDULE|ESCALATION|
|---|---|



APPROVAL 

|**Entity**|produces<br>MED_LOG<br>**Key fields**|
|---|---|
|`users`|id, clinic_id (nullable for family), role, language, phone_hash|
|`patients`|id, clinic_id, clinician_of_record_id, language, consent flags,<br>thresholds_reviewed_at|
|`care_relationships`|patient_id, user_id, role (<br>`coach`/<br>`caregiver`/<br>`clinician`), permissions<br>JSONB, consent_at|
|`medications`,<br>`medication_schedules`,<br>`med_logs`|drug, dose, times, status,<br>`reported_by`,<br>`source_msg_id`|
|`health_events`|id, patient_id, type (glucose/meal/activity/symptom/sleep/weight),<br>value JSONB,<br>`measured_at`,<br>`received_at`,<br>`reported_by`,<br>`source_msg_id`UNIQUE|
|`patient_thresholds`|patient_id, low, critical_low, high, escalation timings, version|
|`daily_aggregates`,<br>`baselines`|derived, rebuildable|
|`risk_events`|type, severity, evidence_event_ids, rule_version|
|`recommendations`|finding JSONB, text, class (<br>`template/coach/doctor`), status,<br>ai_request_id|
|`approvals`|recommendation_id, approver_id, decision, at|
|`notifications`,<br>`escalations`|channel, template_id, state, step, timestamps|
|`ai_requests`|model, prompt_version, context_hash, latency, tokens,<br>validation_result|
|`audit_logs`|actor, action, target, at (append-only)|



Skipped tables: separate tables per measurement type, a vector store, a feature store, conversation history beyond a summarized window. 

**Indexes:** `(patient_id, type, measured_at DESC)` on health_events; unique on `source_msg_id` ; `(patient_id, status)` on approvals; partial index on open escalations; `(status, run_at)` on jobs. **Relational vs NoSQL:** relational. The data is highly relational, needs transactions (event + job), and rowlevel security. JSONB handles flexible payloads. **Time-series:** at hackathon scale, plain Postgres. At production scale, partition `health_events` by month; add TimescaleDB or a columnar store for CGM streams [FUTURE]. **Retention [CLINICAL/LEGAL]:** raw events retained per clinic policy; AI logs store 

hashes not full context with a short retention window **Sensitive fields:** all health events phone numbers 

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

12/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

hashes, not full context, with a short retention window. **Sensitive fields:** all health_events, phone numbers (store hashed + encrypted), care notes, consent records. **Ownership:** patient owns data; clinic is the data fiduciary; caregivers get consent-scoped views via Postgres RLS keyed on `clinic_id` and `care_relationships` . 

## **Part 9: Hackathon vs Production** 

|Mana<br>Sup|ged Postgres:<br>abase/Neon|Hackathon<br>Next.js dashboard on Vercel<br>FastAPI monolith + worker<br>process on Render<br>Twilio sandbox / Meta test<br>number<br>LLM API|
|---|---|---|
|**Area**|**Hackathon [NOW]**|**Production [FUTURE]**|
|Backend|Python monolith, one<br>worker|Same modules, split ingestion/notification workers; ML<br>worker autoscaled|
|Database|One Postgres|Primary + replicas, partitioned events, Timescale for CGM|
|Cache|None|Redis for sessions/rate limits|
|Queue|Postgres jobs table|SQS/RabbitMQ or Kafka for CGM streams|
|AI|Hosted LLM API, small<br>model|Gateway with fallback providers, India-region/self-hosted<br>options|
|Notifications|Twilio sandbox / Meta<br>test|Approved WhatsApp templates, SMS/IVR fallback|
|Storage|Skip (no images stored)|Object storage with encryption for glucometer photos|
|Observability|Structured logs + Sentry|OpenTelemetry, Prometheus/Grafana, audit pipeline|
|Deployment|Vercel + Render|Kubernetes/ECS, multi-AZ, multi-region only if regulations<br>demand|
|Security<br>https://claude.ai/chat/5c11cfe|JWT, RLS, HTTPS, audit<br>c-3ceb-4c87-b0b5-204395a6375d?|Managed IdP, KMS, WAF, pen tests, DPDP compliance<br>artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14|



13/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint g p p 

y 

Scaling 

table Vertical 

program 

Horizontal workers, read replicas, partitioning 

**Do NOT build for the hackathon:** Kafka, Kubernetes, microservices, Redis, feature store, vector DB, live CGM/band integration, EHR integration, offline sync engine, leaderboards, multi-region. 

## **Part 10: Core Sequences** 

**Flow 1: Patient records glucose** 



<!-- Start of picture text -->
Patient WhatsApp API Ingestion Postgres Risk Engine Notifications<br>"sugar 140"<br>webhook<br>parse + validate<br>"140 correct?" [Yes][No]<br>Yes<br>webhook<br>insert event + job (dedupe)<br>evaluate rules<br>none or risk event<br>acknowledgement or protocol message<br>Patient WhatsApp API Ingestion Postgres Risk Engine Notifications<br><!-- End of picture text -->

**Flow 2: Medication missed:** scheduler job fires → reminder → no reply → retry (T) → still none → `MedicationMissed` → Notifications asks caregiver "did they take it?" → caregiver reply logs `reported_by=caregiver` , else digest + coach flag. 

**Flow 3: Risk detected:** write → rules breach → `RiskDetected(severity)` → escalation record created → protocol message → timers persisted in jobs. 

**Flow 4: Caregiver escalation** 



<!-- Start of picture text -->
Escalation Jobs Caregiver Coach/Doctor<br>schedule T1 check<br>T1 fires, no ack<br>WhatsApp alert<br>schedule T2 check<br>T2 fires, no ack<br>alert + dashboard flag<br>acknowledge<br><!-- End of picture text -->

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

14/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

Escalation Jobs 

Caregiver 

Coach/Doctor 

**Flow 5: Clinician summary:** dashboard → API (RBAC + RLS) → Reporting reads aggregates + risk events + latest AI summary → response includes "AI-generated, unverified" badge → clinician clicks **Verify** → audit row. 

**Flow 6: Weekly summary:** cron job → per patient: deterministic summary stats → LLM phrases → validate numbers → store as draft → clinician verifies; patient version goes through coach approval. 

## **Part 11: API Surface** 

All under `/v1` . Auth: JWT for dashboards; webhook signature check for WhatsApp. Write endpoints accept `Idempotency-Key` . List endpoints use cursor pagination. Errors use RFC 7807 problem JSON. Validation is schema-based (Pydantic). 

|**Endpoint**|**Purpose**|**Auth**|
|---|---|---|
|`POST /webhooks/whatsapp`|Inbound messages|Provider signature|
|`POST /patients`|Create patient (clinic staff)|Clinic role|
|`GET /patients/{id}/summary`|Overview|Role + RLS|
|`GET /patients/{id}/trends?`|Aggregates|Role + consent scope|
|`from&to`|||
|`POST /patients/{id}/events`|Manual or caregiver-<br>logged events|Caregiver/clinic|
|`PUT /patients/{id}/thresholds`|Set thresholds|Clinician of record only|
|`POST/GET`<br>`/patients/{id}/medications`|Meds + schedules|Clinician|
|`GET /patients/{id}/risks`|Risk events|Role|
|`GET /approvals?status=pending`|Coach/doctor queue|Coach/clinician|
|`POST /approvals/{id}/decision`|Approve/edit/reject|Coach (class<br>`coach`), Doctor<br>(class<br>`doctor`)|
|`POST /escalations/{id}/ack`|Acknowledge|Caregiver/coach/clinician|
|`GET/PUT`|Visibility and notification|Patient (or assisted)|
|`/patients/{id}/consents`|grants||
|`GET /reports/{patient}/weekly`|Summary|Clinician|



Example `POST /patients/{id}/events` body: `{type:"glucose", value:{mgdl:140, context:"fasting"}, measured_at, reported_by}` → `201 {id, risk_status}` . 

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

15/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

## **Part 12: Security** 



<!-- Start of picture text -->
Encryption: TLS, at-rest,<br>field-level for phone<br>Authentication: JWT / OTP Authorization: RBAC Row-level security: clinic + consent Data access layer<br>Monitoring + anomaly<br>Audit log: append-only alerts<br><!-- End of picture text -->

- Least-privilege roles; caregiver access is _data_ in `care_relationships.permissions` . 

- Rate limiting on webhooks and login; webhook signature verification; replay protection via message ID. 

- Secrets in platform secret store, never in the repo. 

- Data minimization in WhatsApp messages (no diagnoses or full names in templates). 

- AI: pseudonymous IDs, no PII in prompts, provider with no-training/zero-retention terms. 

- Legal vs best practice: **India's DPDP Act 2023** (consent, purpose limitation, breach notification) is a legal requirement for Indian deployments; HIPAA applies only if serving US patients; ABDM/NDHM alignment matters for healthcare integration [FUTURE]; WhatsApp Business policies on health data are a platform requirement. Encryption, RBAC, and audit logs are engineering best practice. Get legal review before real patients. **If the software qualifies as a medical device (decision support), regulatory classification applies** [CLINICAL/LEGAL]. 

## **Part 13: Failure Modes** 



<!-- Start of picture text -->
LLM down or invalid output WhatsApp send fails DB down Worker or queue stalls Patient silent<br>Webhooks return 503,<br>Pre-approved templates; rules continue Retry, then SMS fallback, then dashboard alert provider retries; managed  Jobs persisted; stale-job monitor; restart resumes Escalation ladder<br>backups<br>Failure Behavior<br>Duplicate event Unique  source_msg_id  ignores it<br>Bad / implausible data Re-confirm flow; stored as  unverified  if user insists<br>Model timeout Fallback template, no retry storm<br>Caregiver unavailable Next rung of ladder<br>Network loss on patient WhatsApp queues messages; late-arriving events are timestamped by<br>side measured_at<br>Escalation timer lost Timers are rows in  jobs  ; a sweeper re-queues overdue ones<br><!-- End of picture text -->

Safety principle: **rules, templates, and escalations work with zero AI.** 

## **Part 14: Offline** 

Not needed as a custom engine. WhatsApp is the client, and it already queues messages offline. Handle 

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

16/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

late arrival using client-supplied timestamps, store `measured_at` vs `received_at` , and warn that "alerts only fire when messages arrive." An offline-first app with local storage and sync is [FUTURE] if a native app is added; it would need a sync queue, idempotency keys, last-write-wins for profile data, append-only for events. 

## **Part 15: Observability** 

- Structured JSON logs with IDs, **no raw health values or message text** . 

- Metrics: webhook latency, job lag, rule-eval time, notification delivery rate, escalation durations, AI latency/tokens/cost, validation failure rate, approval acceptance/rejection, alerts per patient per day, acknowledged-without-action rate (false-positive proxy). 

- Traces: webhook → event → job → notification. 

- Audit logs are separate from app logs, append-only. 

- Alerts: stuck jobs, DLQ growth, delivery failure spikes. 

## **Part 16: Implementation Choices** 

|**Requirement**|**Technology**|**Reason**|**Tradeoff**|
|---|---|---|---|
|ML + API in one|**FastAPI (Python)**|Python ML|Less type safety than TS;|
|language||ecosystem, one<br>codebase|async discipline needed|
|Relational + RLS|**PostgreSQL (Supabase or**|Transactions, RLS,|Not ideal for CGM-scale|
|+ JSONB|**Neon)**|one datastore|streams later|
|Durable<br>timers/jobs|**Postgres jobs table**with a<br>worker loop (or ARQ/Celery if<br>you already know them)|No extra infra,<br>transactional<br>outbox|Lower throughput than a<br>real broker|
|Dashboards|**Next.js + Tailwind**on Vercel|Fast build, good for<br>tables/charts|Separate deploy from<br>backend|
|Patient channel|**WhatsApp via Twilio sandbox**<br>**/ Meta Cloud API**|Where seniors<br>already are|24-hour window,<br>templates, consent|
|LLM|**Gemini Flash or Groq-hosted**<br>**open model**for drafting;<br>structured JSON mode|Cheap, fast, JSON-<br>schema support|Verify data-handling<br>terms; keep provider<br>swappable|
|STT|**Sarvam / Bhashini**(compare<br>Whisper)|Indian language<br>coverage|Accuracy on mixed<br>speech varies;<br>confirmation step<br>required|
|Auth|**Supabase Auth or JWT + OTP**|Fast|Replace with managed<br>IdP at scale|
|Monitoring|**Sentry + structured logs**|Free tiers|Limited tracing|



https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

17/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

ML **scikit-learn / statsmodels /** Fits small data **LightGBM** , PyTorch only for the CGM demo 



Repo (monorepo): 

`/apps/web            # Next.js dashboards /apps/api            # FastAPI /app/modules/{ingestion,adherence,risk,trend,personalization,ai_gateway,approvals,notifications, /app/core          # config, auth, db, jobs /app/channels      # whatsapp adapter /apps/ml             # training notebooks, CGM demo, model code /db/migrations       # Alembic /templates           # clinician-reviewed message templates (per language) /docs`   

Migrations: Alembic, forward-only. Config: `.env` locally, platform secrets in deploy. CI: GitHub Actions running lint, tests, rule-engine tests, migration check; auto-deploy main. 

## **Part 17: Roadmap** 

|**Phase**|**Build**|**DoD**|
|---|---|---|
|0 Architecture|This doc, threshold defaults,<br>template list|Agreed scope|
|1 Foundation|Repo, DB, auth, roles, clinic<br>scoping, audit table|Staff can log in, RLS verified|
|2 Ingestion|WhatsApp webhook, parse,<br>confirm, events, dedupe|Glucose and meds logged via<br>WhatsApp|
|3 Adherence|Schedules, reminders, retries,<br>missed detection|Missed dose flagged end-to-end|
|4 Risk + escalation|Thresholds, rules, state machine,<br>timers|Critical reading escalates through<br>ladder with LLM disabled|
|5 Trends|Aggregates, baselines, summaries|Dashboard trend charts|
|6 Approvals +<br>personalization|Context builder, action library,<br>queue|Nudge appears only after approval|
|7 AI|Gateway, validation, fallbacks,<br>explanations|Invalid output provably rejected in<br>tests|
|8 Caregiver + clinician|Consent flags, digest, weekly<br>summary|Caregiver sees only permitted data|
|9 CGM demo|Public dataset model + baseline<br>comparison|Chart vs naive baseline|



https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

18/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 

Load test, security review, demo seed data 

Rehearsed demo 

### 10 Hardening 

Tests: unit tests on rules (table-driven threshold cases), integration on webhook→DB, escalation timer tests with fake clock, AI eval set (golden findings → assert schema validity, number fidelity, no banned content) rather than subjective review, RLS tests per role. 

**Part 18: Decisions (Problem → Options → Decision → Tradeoff)** 

|**Problem**|**Options**|**Decision**|**Give up**|
|---|---|---|---|
|Reliable timers|In-memory / Redis / Postgres<br>rows|Postgres rows|Throughput|
|Services|Microservices / monolith|Modular monolith +<br>ML worker|Independent scaling|
|Event backbone|Kafka / outbox in Postgres|Outbox|Stream scale|
|Memory|Vector DB / structured context<br>builder|Structured|Fuzzy recall of long<br>notes|
|Who classifies<br>message risk|LLM / rules on message type|Rules|Flexibility|
|Patient client|Native app / WhatsApp|WhatsApp|Rich UI, offline control|
|Prediction|DL on manual data / simple<br>models + CGM demo|Simple models +<br>demo|"Wow" factor, gained<br>credibility|



**Decide now:** event schema and `source_msg_id` , tenancy ( `clinic_id` ), consent model, message classes, escalation state machine. **Postpone:** CGM ingestion, offline app, multi-region, advanced RBAC UI. **Overengineering:** Kafka, k8s, RAG, agents, fine-tuning, feature store. **Painful to change later:** tenancy, event/idempotency design, consent model, timestamp handling ( `measured_at` vs `received_at` ), audit design. **Needs clinical validation:** all thresholds, timeouts, protocol wording, missed-dose rules, action library, "no data for 24h" rule. **Never depends on an LLM:** severity, escalation, dosing, diagnosis, recipient selection, message class, emergency guidance. 

**Bottlenecks:** coach approval capacity, WhatsApp template approval, STT accuracy. **Security risks:** shared family phones, caregiver over-visibility, PII in AI prompts, webhook spoofing. **Scaling problems:** CGM stream volume, escalation timer fan-out, LLM cost for weekly summaries. **Demo risks:** WhatsApp sandbox limits and join steps, LLM latency (pre-generate drafts), live voice transcription errors (have a fallback), network at venue (record a backup video, seed data). 

## **"If I were building this myself"** 

One FastAPI app with a worker process, one Postgres, a Next.js dashboard, Twilio WhatsApp sandbox. Build in this order: **ingestion with confirmation → reminders with retries → rules + persisted escalation → approval queue → LLM phrasing with fallbacks → trend charts → CGM demo notebook** . Seed one synthetic patient with four weeks of data. Demo script: patient logs sugar by voice note, med reminder is https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

19/21 

10/5/26, 11:26 PM 

sy t et c pat e t t ou ee s o data. 

Elderly Diabetes Care Platform: Technical Blueprint e o sc pt: pat e t ogs suga by o ce ote, ed e de s 

ignored and caregiver gets pinged, a high reading escalates, coach approves a nudge showing reason, confidence, and reviewer, clinician verifies the weekly summary. 

Leave out: CGM/band live integration, offline sync, Kafka, Redis, vector DB, agents, leaderboards. Evolve later by partitioning events, adding a broker when job volume demands it, splitting the ML worker and notification worker first, and only then considering further services. 

https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

20/21 

10/5/26, 11:26 PM 

Elderly Diabetes Care Platform: Technical Blueprint 



https://claude.ai/chat/5c11cfec-3ceb-4c87-b0b5-204395a6375d?artifact=9a36ab2e-3024-4a01-95cc-36b4c00cfa14 

21/21 

