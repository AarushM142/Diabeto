import sys
import os
sys.path.insert(0, os.path.abspath("."))

import asyncio
from sqlalchemy import select
from apps.api.app.core.database import async_session_factory, engine
from apps.api.app.models.entities import Patient, HealthEvent

async def verify():
    async with async_session_factory() as session:
        res = await session.execute(select(Patient))
        patients = res.scalars().all()
        
        evt_res = await session.execute(select(HealthEvent))
        events = evt_res.scalars().all()

        print("\n" + "=" * 50)
        print("SUPABASE CONNECTION CONFIRMED & VERIFIED!")
        print("=" * 50)
        print(f"Total Patients in Database: {len(patients)}")
        for p in patients:
            print(f"  * {p.name} | Phone: {p.phone} | Lang: {p.language} | ID: {p.id}")
        
        print(f"\nTotal Health Events Logged: {len(events)}")
        print("=" * 50 + "\n")
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify())
