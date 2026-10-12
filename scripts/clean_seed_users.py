import sys
import os
sys.path.insert(0, os.path.abspath("."))

import asyncio
from sqlalchemy import text
from apps.api.app.core.database import async_session_factory

async def clean_seed():
    async with async_session_factory() as session:
        print("Cleaning up seed users and data...")
        await session.execute(text("ALTER TABLE patients ALTER COLUMN clinician_of_record_id DROP NOT NULL;"))
        await session.execute(text("""
            DELETE FROM approvals 
            WHERE recommendation_id IN (SELECT id FROM recommendations WHERE patient_id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003')) 
               OR approver_id IN ('doc_mehta_101', 'cg_rohit_201', 'cg_pooja_202', 'cg_amit_203', 'usr_dev_clinician_01', 'coach_kavita_02');
        """))
        await session.execute(text("DELETE FROM recommendations WHERE patient_id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003')"))
        await session.execute(text("DELETE FROM risk_events WHERE patient_id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003')"))
        await session.execute(text("DELETE FROM health_events WHERE patient_id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003')"))
        await session.execute(text("DELETE FROM medication_schedules WHERE patient_id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003')"))
        await session.execute(text("DELETE FROM patient_thresholds WHERE patient_id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003')"))
        await session.execute(text("DELETE FROM care_relationships WHERE patient_id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003') OR user_id IN ('doc_mehta_101', 'cg_rohit_201', 'cg_pooja_202', 'cg_amit_203', 'usr_dev_clinician_01', 'coach_kavita_02')"))
        await session.execute(text("DELETE FROM audit_logs WHERE target_id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003') OR actor_id IN ('doc_mehta_101', 'cg_rohit_201', 'cg_pooja_202', 'cg_amit_203', 'usr_dev_clinician_01', 'coach_kavita_02')"))
        await session.execute(text("DELETE FROM patients WHERE id IN ('pt_ramesh_001', 'pt_shanti_002', 'pt_ananya_003')"))
        await session.execute(text("UPDATE patients SET clinician_of_record_id = NULL WHERE clinician_of_record_id IN ('doc_mehta_101', 'usr_dev_clinician_01')"))
        await session.execute(text("DELETE FROM users WHERE id IN ('doc_mehta_101', 'cg_rohit_201', 'cg_pooja_202', 'cg_amit_203', 'usr_dev_clinician_01', 'coach_kavita_02')"))
        await session.commit()
        print("Seed data successfully removed from database.")

if __name__ == "__main__":
    asyncio.run(clean_seed())
