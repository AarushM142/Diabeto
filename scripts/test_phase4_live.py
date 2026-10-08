import sys
import os
sys.path.insert(0, os.path.abspath("."))

import asyncio
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, text
from apps.api.app.main import app
from apps.api.app.core.database import async_session_factory, engine
from apps.api.app.models.entities import Patient, RiskEvent, BackgroundJob, PatientThreshold
from apps.api.app.core.worker import _process_one_job

async def run_live_phase4_tests():
    print("\n" + "=" * 60)
    print("LIVE TESTING PHASE 4: DETERMINISTIC RISK, TIMERS & ESCALATIONS")
    print("=" * 60)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        patient_id = "pt_ramesh_001"

        # 1. Test PUT /v1/patients/{id}/thresholds
        print(f"\n1. Configuring Patient Thresholds (PUT /v1/patients/{patient_id}/thresholds)...")
        threshold_payload = {
            "critical_low": 65.0,
            "low": 75.0,
            "high": 170.0,
            "critical_high": 240.0,
            "escalation_timings": {"t1_minutes": 10, "t2_minutes": 25}
        }
        res_th = await client.put(f"/v1/patients/{patient_id}/thresholds", json=threshold_payload)
        print(f"Status: {res_th.status_code}")
        assert res_th.status_code == 200, f"Failed: {res_th.text}"
        th_data = res_th.json()
        print(f"Updated Threshold: crit_low={th_data['critical_low']}, high={th_data['high']}, version={th_data['version']}")
        assert th_data["high"] == 170.0

        # 2. Test Ingesting Events that Trigger Consecutive-High Risk
        print("\n2. Ingesting 3 Consecutive High Glucose Events (175, 185, 190 mg/dL)...")
        readings = [175.0, 185.0, 190.0]
        for val in readings:
            ev_payload = {
                "type": "glucose",
                "value": {"mgdl": val, "context": "post_meal"},
                "measured_at": datetime.now(timezone.utc).isoformat(),
                "reported_by": "patient"
            }
            res_ev = await client.post(f"/v1/patients/{patient_id}/events", json=ev_payload)
            print(f"  Ingested {val} mg/dL -> Status: {res_ev.status_code}, Risk: {res_ev.json().get('risk_status')}")

        # 3. Test GET /v1/patients/{id}/risks
        print(f"\n3. Fetching Active Risks (GET /v1/patients/{patient_id}/risks)...")
        res_risks = await client.get(f"/v1/patients/{patient_id}/risks")
        print(f"Status: {res_risks.status_code}")
        assert res_risks.status_code == 200
        risks = res_risks.json()
        print(f"Active Risks Found: {len(risks)}")
        assert len(risks) > 0
        latest_risk = risks[0]
        risk_id = latest_risk["id"]
        print(f"Latest Risk: id={risk_id}, type={latest_risk['type']}, severity={latest_risk['severity']}, status={latest_risk['status']}")

        # 4. Check that Escalation Timer Outbox Jobs were Enqueued
        print("\n4. Checking Outbox Jobs for Enqueued Escalation Timers...")
        async with async_session_factory() as session:
            jobs_stmt = select(BackgroundJob).where(
                BackgroundJob.job_type == "escalation_check",
                BackgroundJob.status == "pending"
            )
            res_jobs = await session.execute(jobs_stmt)
            jobs = res_jobs.scalars().all()
            print(f"Pending Escalation Timer Jobs in Outbox: {len(jobs)}")
            assert len(jobs) > 0

            # Test Outbox Worker Processing
            print("\n5. Testing Background Outbox Worker Processing...")
            # Set job run_at in past to make it claimable immediately
            await session.execute(
                text("UPDATE background_jobs SET run_at = NOW() - INTERVAL '1 minute' WHERE job_type = 'escalation_check'")
            )
            await session.commit()

        # Run one worker cycle
        processed = await _process_one_job()
        print(f"Worker Processed One Claimed Job: {processed}")
        assert processed is True

        # 6. Test POST /v1/escalations/{id}/ack
        print(f"\n6. Acknowledging Escalation (POST /v1/escalations/{risk_id}/ack)...")
        res_ack = await client.post(f"/v1/escalations/{risk_id}/ack")
        print(f"Status: {res_ack.status_code} | Result: {res_ack.json()}")
        assert res_ack.status_code == 200
        assert res_ack.json()["status"] == "acknowledged"

    print("\n" + "=" * 60)
    print("PHASE 4 LIVE PIPELINE & WORKER TEST SUITE 100% SUCCESSFUL!")
    print("=" * 60 + "\n")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_live_phase4_tests())
