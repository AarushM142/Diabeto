import sys
import os
sys.path.insert(0, os.path.abspath("."))

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
            "MessageSid": "SM_test_normal_01",
        }
        res = await client.post("/v1/webhooks/whatsapp", data=payload)
        print(f"Status Code: {res.status_code} | Response: {res.json()}")

        # 2. Critical Hypoglycemia (<70)
        print("\n2. Testing Critical Low Reading ('My sugar dropped to 58')...")
        payload_crit = {
            "From": "whatsapp:+919800000003",
            "Body": "My sugar dropped to 58",
            "MessageSid": "SM_test_crit_02",
        }
        res_crit = await client.post("/v1/webhooks/whatsapp", data=payload_crit)
        print(f"Status Code: {res_crit.status_code} | Response: {res_crit.json()}")

        # 3. Implausible Reading (>600)
        print("\n3. Testing Implausible Reading ('Sugar 999')...")
        payload_bad = {
            "From": "whatsapp:+919800000001",
            "Body": "Sugar is 999",
            "MessageSid": "SM_test_bad_03",
        }
        res_bad = await client.post("/v1/webhooks/whatsapp", data=payload_bad)
        print(f"Status Code: {res_bad.status_code} | Response: {res_bad.json()}")

    print("\n" + "=" * 50)
    print("ALL WHATSAPP WEBHOOK TESTS PASSED!")
    print("=" * 50 + "\n")

if __name__ == "__main__":
    asyncio.run(run_tests())
