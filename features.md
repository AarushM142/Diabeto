# 🩺 Diabeto Platform — Implemented Features & Architecture Reference

> **Tagline:** AI-Powered, Zero-App Diabetes Care Platform Tailored for Indian Seniors, Clinicians, Coaches, and Families.

---

## 📌 Executive Summary

**Diabeto** is a closed-loop diabetes care management ecosystem built specifically to solve healthcare access barriers for elderly patients in India:
1. **Zero-App Barrier for Seniors:** Seniors never need to install a smartphone app; they log glucose readings, meals, and symptoms directly over **WhatsApp** via text, voice notes (Hindi/Marathi/English), or photos of glucometer screens.
2. **Clinical Command Center:** Clinicians and endocrinologists get a real-time risk-stratified triage dashboard, ADA-compliant glycemic indicators, automated weekly summaries, and 1-click hospital-grade OPD consultation PDF reports.
3. **Caregiver Escalation Ladder:** Critical events (hypoglycemia < 54 mg/dL or hyperosmolar crises > 300 mg/dL) automatically trigger immediate multi-channel alerts (WhatsApp, SMS, Twilio Voice calls) to designated family members.
4. **Multilingual Senior Sanctuary Web Experience:** High-contrast (19px minimum typography) web interface with large tap targets and zero cognitive friction.

---

## 🏗️ System Architecture & Technology Stack

```
                          ┌────────────────────────┐
                          │   WhatsApp (Twilio)    │
                          │  Text / Audio / Photo  │
                          └───────────┬────────────┘
                                      │ Webhook (HMAC-SHA1)
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend (:8000)                         │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Ingestion Engine │  │ Risk Escalation  │  │ Trend & OPD PDF Gen   │ │
│  │ (Text, OCR, STT) │  │ (0-min ladder)   │  │ (ADA Metrics, Report) │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────┬───────────┘ │
│           │                     │                        │             │
│           └──────────────┬──────┴────────────────────────┘             │
│                          ▼                                             │
│            Postgres Outbox & Background Jobs (Worker)                  │
│            + Offline / Hackathon Demo Fallback Engine                  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ REST API / CORS
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Vite + React Frontend (:5173)                     │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Senior Sanctuary │  │ Clinician Portal │  │ WhatsApp Simulator    │ │
│  │ (Patient View)   │  │ (Triage & EHR)   │  │ (Interactive Sandbox) │ │
│  └──────────────────┘  └──────────────────┘  └───────────────────────┘ │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Caregiver Portal │  │ Coach Portal     │  │ Multilingual Engine   │ │
│  │ (Family Track)   │  │ (Habits & Diet)  │  │ (EN, HI, MR)          │ │
│  └──────────────────┘  └──────────────────┘  └───────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Comprehensive Feature Catalog

### 1. 📱 WhatsApp Omnichannel Conversational Engine

The primary patient interface requires **no app store downloads or logins**. Seniors communicate with Diabeto just like texting a family member.

* **4 Flexible Ways to Log Blood Glucose:**
  1. **Direct Number / Natural Text:** Accepts `140`, `sugar 140`, `fasting 115`, `khana khane ke baad 180`, `shakkar 160`.
  2. **Indian Language Voice Notes:** Seniors send voice audio clips in **Hindi**, **Marathi**, or **English**. Speech-to-Text via **Sarvam AI** transcribes Indian dialects accurately, and regex/NLP extracts numeric readings and context.
  3. **Glucometer Strip / Screen Photos:** Patients take photos of their glucometer display; image OCR pipeline extracts digits and asks for 1-tap confirmation.
  4. **Interactive Quick-Reply Buttons:** Sends WhatsApp Interactive Message templates with clickable `[Yes, Confirm]` and `[Re-enter]` buttons.
* **Two-Way Echo Confirmation Safeguard:**
  * When a reading is parsed (e.g. `142 mg/dL`), Diabeto responds: *"You logged 142 mg/dL (Post-lunch). Is this correct?"* with buttons.
  * Ensures no erroneous readings contaminate clinical records.
* **Security & Regulatory Compliance:**
  * **Twilio Webhook Signature Validation:** Authenticates HMAC-SHA1 signatures on inbound webhooks to prevent spoofing.
  * **Unknown Senders Rejection:** Prevents unregistered numbers from injecting fake medical records.
  * **Emergency & Opt-Out Protocols:**
    * Responds to `HELP` with emergency clinic contact numbers.
    * Responds to `STOP` with immediate opt-out compliance under TRAI / WhatsApp Business rules.

---

### 2. 🚨 Critical Risk Detection & 0-Minute Escalation Ladder

Automated clinical triage engine enforcing American Diabetes Association (ADA) and RSSDI guidelines.

* **Severe Hypoglycemia Protocol (< 54 mg/dL):**
  * **Immediate Patient Response:** Urgent actionable guidance (Rule of 15: *"Drink 1/2 glass fruit juice or 3 spoons sugar immediately. Rest and re-test in 15 minutes."*).
  * **0-Minute Caregiver Alarm:** Triggers simultaneous notification to linked caregiver phone number via WhatsApp and SMS.
  * **Twilio Automated Voice Call:** Places an automated outbound phone call with spoken TwiML alerts if urgent alerts are unacknowledged.
* **Hyperglycemia Alert (> 300 mg/dL):**
  * Flags potential Diabetic Ketoacidosis (DKA) or Hyperosmolar Hyperglycemic State (HHS).
  * Alerts clinician dashboard and instructs patient on hydration and insulin verification.
* **Implausible Value Guardrails (< 20 or > 1000 mg/dL):**
  * Automatically rejects impossible values, notifying the patient to re-wash hands and test again.

---

### 3. 🖥️ Interactive WhatsApp Web Simulator (Built-in Testing Tool)

A full developer & judge demonstration tool embedded directly inside the web UI.

* **Realistic Chat Interface:** Simulates WhatsApp messaging in real-time, including chat bubbles, timestamps, delivery checkmarks, and button responses.
* **1-Click Test Presets:**
  * `Normal Fasting (115)` — demonstrates standard logging & confirmation.
  * `Critical Low (58)` — demonstrates immediate hypoglycemic alert & caregiver trigger.
  * `Voice Note (Audio)` — tests voice transcription pipeline.
  * `Glucometer Photo (OCR)` — tests image reading.
  * `Help / SOS` — tests emergency protocol.
* **Universal Role Access:** Accessible from the left navigation bar across all roles (`Patient`, `Clinician`, `Coach`, `Caregiver`, `Admin`) for seamless live demos.

---

### 4. 🏥 Clinician Command Center & Risk Triage Dashboard

Designed for busy endocrinologists, general physicians, and clinic staff to review hundreds of patients efficiently.

* **Priority Risk Triage Matrix:**
  * Patients categorized into **Red** (Immediate Attention Needed), **Amber** (Moderate Drift / Poor Adherence), and **Green** (Controlled).
* **ADA Clinical Glycemic Indicators:**
  * **Time in Range (TIR %):** Target: $\ge 70\%$ in 70–180 mg/dL.
  * **Time Below Range (TBR %):** Hypoglycemia threshold tracking ($< 70$ and $< 54$ mg/dL).
  * **Time Above Range (TAR %):** Hyperglycemia threshold tracking ($> 180$ and $> 250$ mg/dL).
  * **Mean Glucose & Estimated HbA1c (GMI):** Dynamic calculated formula: $\text{HbA1c} = \frac{\text{Mean Glucose} + 46.7}{28.7}$.
* **Weekly Automated Clinical Synthesis:**
  * AI summarizes 7-day trends, nocturnal hypoglycemic patterns, and medication adherence.
  * **Clinician-in-the-Loop Sign-Off:** Doctors review, edit notes, and sign off with immutable audit logs before sending feedback to patients.

---

### 5. 📄 1-Click Clinical OPD Consultation Sheet & PDF Exporter

Generates a hospital-grade, ready-to-print or export PDF report for outpatient clinic consultations.

* **Hospital Letterhead:** Includes clinic name, address, doctor credentials, and registration numbers.
* **Patient Demographics:** Patient ID, Age, Gender, Primary Language, and Contact details.
* **ADA Glycemic Report Card:**
  * Mean Blood Glucose (mg/dL)
  * Estimated HbA1c (%)
  * Time in Range (TIR %) with color-coded status badges (Optimal / Moderate / Sub-optimal)
  * Total Readings Recorded
* **Active Medication Regimen Table:** Drug names, dosages, timings (Breakfast / Dinner), and instructions.
* **14-Day Reading History Table:** Detailed chronological table of recent glucose tests with meal contexts (Fasting, Post-breakfast, Post-lunch, Post-dinner).
* **Doctor Signature Box & Consultation Notes:** Space for doctor notes, next review date, and physical/digital signature.
* **Offline / Demo Resilience:** Built-in demo fallback ensures instantaneous PDF generation even when running completely disconnected from cloud databases.

---

### 6. 👴 Senior Sanctuary (Patient Portal)

A web interface specifically crafted with elder accessibility principles (WCAG 2.1 AAA inspired):

* **19px Minimum High-Contrast Typography:** Clear readability for senior eyes without zooming.
* **Soothing Visual Palette:** Warm Sage, Forest Green, and Clean Cream surface tones that reduce anxiety.
* **5 Core Patient Sections:**
  1. **Today's Sanctuary:** Daily checklist, next medication pill due with clear icons, and greeting.
  2. **My Blood Sugar:** Simple large-number cards showing last reading, status (Normal / High / Low), and 7-day trend graph.
  3. **Medication Schedule:** Pill tracker with dosage and timing badges.
  4. **Scan Food Plate:** Visual diet tracker with photo upload.
  5. **Doctor & Family (Care Team):** 1-tap dial buttons for Clinic Doctor and primary Caregiver.
* **1-Tap Emergency SOS:** Prominent Red SOS button initiating immediate help calls.

---

### 7. 🥗 Meal Intelligence & Indian Diet Analyzer

Addresses the high glycemic variability typical of traditional Indian carbohydrate-heavy diets.

* **Plate Recognition:** Identifies standard Indian meal components (Roti, Rice, Dal, Sabzi, Idli, Dosa, Mithai).
* **Glycemic Load & Carb Estimation:** Calculates approximate carb grams and estimates post-meal glycemic surge.
* **Senior-Friendly Diet Guidance:** Offers culturally tailored swaps (e.g., *“Add salad or cucumber before rice to blunt the post-meal glucose spike”*).

---

### 8. 👨‍👩‍👧 Caregiver & Family Portal

Keeps adult children and guardians connected with elderly parents living independently.

* **Elder Sugar & Goal Tracker:** Real-time visibility into parents' daily tests.
* **Adherence & Missed Test Alerts:** Notifies family if the elder hasn't logged fasting sugar by 10:00 AM.
* **Emergency Escalation History:** Audit trail of all hypoglycemia incidents and notifications sent.

---

### 9. 🌐 Multilingual Engine (English, हिंदी, मराठी)

* **Seamless Language Toggle:** Instant switching between English, Hindi (हिंदी), and Marathi (मराठी) without page reload.
* **Culturally Sensitive Terminology:** Respectful terms (e.g., *ज्येष्ठ नागरिक आरोग्य कक्ष*, *मरीज़ कक्ष*, *आज का कार्य*).

---

### 10. ⚙️ Background Job Worker & Outbox Architecture

* **Reliable Outbox Pattern:** Ingested events create background notification jobs to decouple webhooks from external API latency.
* **Automatic Retries & Exponential Backoff:** Retries failed Twilio/SMS requests up to 3 times before moving to a dead-letter state.
* **Graceful Degradation:** Both frontend and backend feature resilient fallbacks that gracefully present mock/demo data if Supabase or network connectivity is temporarily unavailable during offline presentations.

---

## 🚀 Quick Hackathon Demo Cheat Sheet

| Step | Action | What to Say / Observe |
|:---:|---|---|
| **1** | Open **WhatsApp Simulator** tab | *"Seniors don't install an app. They just text on WhatsApp."* |
| **2** | Click preset **`140`** | Show instant parsing, context detection, and two-way verification request. |
| **3** | Click preset **`58`** (Critical Low) | Show Rule-of-15 medical advice and simultaneous **0-minute caregiver alert**. |
| **4** | Switch to **Clinician Portal** | Show patient triage, TIR % calculation, and ADA metrics. |
| **5** | Click **"Download OPD Consultation PDF"** | Instant download of professional hospital consultation sheet. |
| **6** | Switch to **Senior Sanctuary** | Highlight 19px high contrast typography and 1-tap SOS designed for grandparents. |
| **7** | Toggle language to **हिंदी** or **मराठी** | Show complete localization tailored for Indian regional demographics. |

---

*Diabeto — Making diabetes care as simple as a WhatsApp message for every Indian grandparent.*
