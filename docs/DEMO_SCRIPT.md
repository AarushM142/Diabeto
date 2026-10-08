# Diabeto — 2-Minute Hackathon Demo Script

## Overview
This script outlines the live demonstration flow for the hackathon judges.

---

## ⏱️ Timeline Breakdown

| Time | Speaker / Role | Action on Screen | Core Message / Takeaway |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:30** | Presenter | **Problem Slide + WhatsApp UI** | *"Elderly diabetics in India can't use complex apps. Diabeto works right inside WhatsApp in Hindi, Marathi, and English."* |
| **0:30 - 0:55** | Demonstrator | **Voice Note on WhatsApp** | Senior sends Hindi voice note: *"Mera fasting sugar 140 hai"*. Sarvam AI transcribes $\rightarrow$ bot echoes back for confirmation. |
| **0:55 - 1:20** | Demonstrator | **Missed Dose Alert** | Senior misses scheduled morning pill $\rightarrow$ Caregiver receives instant WhatsApp alert: *"Alert: Ramesh missed his 8:30 AM Metformin."* |
| **1:20 - 1:45** | Demonstrator | **Clinician & Coach Dashboard** | Switch to Next.js Web Dashboard. Show pending AI-generated lifestyle nudge. Coach clicks **Approve** $\rightarrow$ dispatched to patient. Doctor clicks **Verify** on weekly summary. |
| **1:45 - 2:00** | Presenter | **Safety & Future Slide** | *"Zero-AI dependency safety net. Rules operate even if LLMs are down. Future: Live CGM integration."* |

---

## ⚠️ Demo Day Contingency Plan
If venue WiFi is weak or WhatsApp API rate-limits:
1. Play the pre-recorded 1080p backup video (`demo_backup.mp4`).
2. Show the local Next.js dashboard populated with the golden seed data (`seed_patients.json`).
