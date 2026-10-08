import sys
import os
sys.path.insert(0, os.path.abspath("."))

import asyncio
from httpx import AsyncClient, ASGITransport
from apps.api.app.main import app
from apps.api.app.core.database import engine

async def run_live_phase5_tests():
    print("\n" + "=" * 65)
    print("LIVE TESTING PHASE 5: TRENDS, ANALYTICS & CLINICIAN SYNTHESIS")
    print("=" * 65)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Query Comprehensive Trends for Ramesh Kulkarni
        print("\n1. Querying 14-Day Analytical Glycemic Trends for Ramesh (pt_ramesh_001)...")
        res_trends = await client.get("/v1/patients/pt_ramesh_001/trends?days=14")
        print(f"Status: {res_trends.status_code}")
        trends = res_trends.json()
        glycemic = trends["glycemic_metrics"]
        print(f"  * Total Readings: {glycemic['total_readings']}")
        print(f"  * Mean Glucose: {glycemic['mean_glucose']} mg/dL (Median: {glycemic['median_glucose']} mg/dL, MAD: {glycemic['mad_glucose']})")
        print(f"  * Time in Range (70-180 mg/dL): {glycemic['tir_percentage']}%")
        print(f"  * Time Above Range (>180 mg/dL): {glycemic['tar_percentage']}%")
        print(f"  * Time Below Range (<70 mg/dL): {glycemic['tbr_percentage']}%")
        print(f"  * Glucose Variability (CV%): {glycemic['coefficient_of_variation_pct']}% (SD: {glycemic['standard_deviation']})")
        print(f"  * Clinical Status: {glycemic['clinical_status']}")

        adherence = trends["adherence_metrics"]
        print(f"  * Medication Compliance: {adherence['compliance_score_pct']}% ({adherence['status']})")
        print(f"  * Logging Frequency: {adherence['readings_per_day']} readings/day")

        # 2. Generate Automated Weekly Synthesis for Doctor Review
        print("\n2. Generating Weekly Clinical Synthesis (POST /v1/patients/pt_ramesh_001/weekly-summary)...")
        res_sum = await client.post("/v1/patients/pt_ramesh_001/weekly-summary")
        print(f"Status: {res_sum.status_code}")
        summary = res_sum.json()
        print(f"  * Patient: {summary['patient_name']} (Age {summary['age']})")
        print(f"  * Status: {summary['status']} (Default unverified until Doctor signs off)")
        print(f"  * Highlights: {summary['clinical_highlights']}")
        print(f"  * Recommended Doctor Action: \"{summary['doctor_action_recommendation']}\"")
        assert summary["status"] == "unverified"

        # 3. Doctor Verification & Sign-Off Gate
        print("\n3. Attending Clinician Submitting Sign-Off Decision...")
        verify_payload = {
            "notes": "Reviewed fasting readings. Patient is well controlled on Metformin 500mg. Continue current plan.",
        }
        res_verify = await client.post("/v1/patients/pt_ramesh_001/weekly-summary/verify", json=verify_payload)
        print(f"Status: {res_verify.status_code}")
        verified = res_verify.json()
        print(f"  * Updated Status: {verified['status']}")
        print(f"  * Verified By: {verified['verified_by']} at {verified['verified_at']}")
        print(f"  * Doctor Clinical Notes: \"{verified['clinician_notes']}\"")
        assert verified["status"] == "verified"

    print("\n" + "=" * 65)
    print("PHASE 5 LIVE TEST SUITE 100% COMPLETE & PASSING!")
    print("=" * 65 + "\n")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_live_phase5_tests())
