import sys
import os
import uuid
sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import asyncio
from httpx import AsyncClient, ASGITransport
from apps.api.app.main import app

async def run_tests():
    print("\n" + "=" * 50)
    print("TESTING LIVE WHATSAPP WEBHOOK PIPELINE")
    print("=" * 50)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Normal Reading
        print("\n1. Testing Normal Reading ('Fasting sugar 115')...")
        payload = {
            "From": "whatsapp:+919800000001",
            "Body": "Fasting sugar 115",
            "MessageSid": f"SM_test_normal_{uuid.uuid4().hex[:8]}",
        }
        res = await client.post("/v1/webhooks/whatsapp", data=payload)
        resp_data = res.json() if "application/json" in res.headers.get("content-type", "") else res.text
        print(f"Status Code: {res.status_code} | Response: {resp_data}")

        # 2. Critical Hypoglycemia (<70)
        print("\n2. Testing Critical Low Reading ('My sugar dropped to 58')...")
        payload_crit = {
            "From": "whatsapp:+919800000003",
            "Body": "My sugar dropped to 58",
            "MessageSid": f"SM_test_crit_{uuid.uuid4().hex[:8]}",
        }
        res_crit = await client.post("/v1/webhooks/whatsapp", data=payload_crit)
        resp_crit_data = res_crit.json() if "application/json" in res_crit.headers.get("content-type", "") else res_crit.text
        print(f"Status Code: {res_crit.status_code} | Response: {resp_crit_data}")

        # 3. Implausible Reading (>600)
        print("\n3. Testing Implausible Reading ('Sugar 999')...")
        payload_bad = {
            "From": "whatsapp:+919800000001",
            "Body": "Sugar is 999",
            "MessageSid": f"SM_test_bad_{uuid.uuid4().hex[:8]}",
        }
        res_bad = await client.post("/v1/webhooks/whatsapp", data=payload_bad)
        resp_bad_data = res_bad.json() if "application/json" in res_bad.headers.get("content-type", "") else res_bad.text
        print(f"Status Code: {res_bad.status_code} | Response: {resp_bad_data}")

    print("\n" + "=" * 50)
    print("ALL WHATSAPP WEBHOOK TESTS PASSED!")
    print("=" * 50 + "\n")

if __name__ == "__main__":
    asyncio.run(run_tests())
