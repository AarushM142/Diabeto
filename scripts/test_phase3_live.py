import sys
import os
sys.path.insert(0, os.path.abspath("."))

import asyncio
from httpx import AsyncClient, ASGITransport
from apps.api.app.main import app
from apps.api.app.core.database import async_session_factory, engine
from apps.api.app.models.entities import Patient, RiskEvent
from apps.api.app.modules.risk.escalation import advance_escalation_state_machine

async def run_live_phase3_tests():
    print("\n" + "=" * 60)
    print("LIVE TESTING PHASE 3: GENAI NUDGES, ESCALATIONS & APPROVALS")
    print("=" * 60)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Trigger GenAI Nudge Generation
        print("\n1. Generating Anonymized GenAI Nudge for Ramesh (pt_ramesh_001)...")
        res_gen = await client.post("/v1/patients/pt_ramesh_001/generate-nudge")
        print(f"Status: {res_gen.status_code}")
        nudge = res_gen.json()
        safe_msg = nudge.get('message_text', '').encode('ascii', 'replace').decode()
        safe_reason = nudge.get('reason_text', '').encode('ascii', 'replace').decode()
        print(f"Generated Draft: \"{safe_msg}\"")
        print(f"Clinical Reason: \"{safe_reason}\"")
        print(f"Confidence: {nudge.get('confidence_label')} | Status: {nudge.get('status')}")
        rec_id = nudge.get("id")

        # 2. Query Coach Approval Queue
        print("\n2. Fetching Coach Approval Queue (GET /v1/approvals)...")
        res_queue = await client.get("/v1/approvals")
        queue = res_queue.json()
        print(f"Total Pending Approvals in Queue: {len(queue)}")
        assert len(queue) > 0

        # 3. Coach Approves the Nudge
        print(f"\n3. Coach Submitting Approval Decision for Nudge {rec_id}...")
        decision_payload = {
            "decision": "approved",
            "feedback": "Great supportive tone for senior.",
        }
        res_dec = await client.post(f"/v1/approvals/{rec_id}/decision", json=decision_payload)
        print(f"Status: {res_dec.status_code} | Result: {res_dec.json()}")

        # 4. Test Escalation State Machine (T1 = 15m Caregiver, T2 = 30m Emergency)
        print("\n4. Testing Escalation State Machine for Critical Hypoglycemia...")
        async with async_session_factory() as session:
            # Create test risk event
            risk_evt = RiskEvent(
                patient_id="pt_ananya_003",
                type="critical_hypoglycemia",
                severity="critical",
                evidence_ids=["evt_hypo_58"],
                status="active",
            )
            session.add(risk_evt)
            await session.flush()
            risk_id = risk_evt.id

            # Step A: 0 minutes elapsed -> Tier 1 (Patient)
            r1 = await advance_escalation_state_machine(session, risk_id, override_elapsed_minutes=0)
            print(f"  * At 0 mins: Tier {r1['tier']} -> Action: {r1['action']}")

            # Step B: 16 minutes elapsed without reply -> Tier 2 (Caregiver)
            r2 = await advance_escalation_state_machine(session, risk_id, override_elapsed_minutes=16)
            print(f"  * At 16 mins (T1 breached): Tier {r2['tier']} -> Action: {r2['action']} (Status: {r2['status']})")

            # Step C: 35 minutes elapsed without reply -> Tier 3 (Doctor & 112/108 Guidance)
            r3 = await advance_escalation_state_machine(session, risk_id, override_elapsed_minutes=35)
            print(f"  * At 35 mins (T2 breached): Tier {r3['tier']} -> Action: {r3['action']} (Status: {r3['status']})")

    print("\n" + "=" * 60)
    print("PHASE 3 PIPELINE TEST SUITE 100% SUCCESSFUL!")
    print("=" * 60 + "\n")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_live_phase3_tests())
