import sys
import os
sys.path.insert(0, os.path.abspath("."))

import asyncio
from apps.api.app.core.database import engine, Base
from apps.api.app.models.entities import (
    Clinic, User, Patient, CareRelationship, PatientThreshold,
    MedicationSchedule, HealthEvent, RiskEvent, Recommendation,
    Approval, BackgroundJob, AuditLog
)

async def init_tables():
    print("Connecting to Supabase and creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(" All tables successfully created in Supabase PostgreSQL!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_tables())
