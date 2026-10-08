import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.models.entities import BackgroundJob

async def enqueue_job(
    session: AsyncSession,
    job_type: str,
    payload: Dict[str, Any],
    run_at: Optional[datetime] = None,
    idempotency_key: Optional[str] = None,
) -> str:
    """
    Enqueues a job into the durable Postgres jobs table as part of the current transaction.
    """
    job_id = str(uuid.uuid4())
    run_timestamp = run_at or datetime.now(timezone.utc)
    
    job = BackgroundJob(
        id=job_id,
        job_type=job_type,
        payload=payload,
        status="pending",
        run_at=run_timestamp,
        idempotency_key=idempotency_key,
        created_at=datetime.now(timezone.utc),
    )
    session.add(job)
    await session.flush()
    return job.id

async def fetch_and_lock_next_job(session: AsyncSession) -> Optional[Dict[str, Any]]:
    """
    Claims the next pending job using SELECT ... FOR UPDATE SKIP LOCKED.
    """
    query = text("""
        WITH next_job AS (
            SELECT id
            FROM background_jobs
            WHERE status = 'pending' AND run_at <= NOW()
            ORDER BY run_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        UPDATE background_jobs j
        SET status = 'processing', started_at = NOW()
        FROM next_job
        WHERE j.id = next_job.id
        RETURNING j.id, j.job_type, j.payload, j.retry_count;
    """)
    result = await session.execute(query)
    row = result.fetchone()
    if row:
        return {
            "id": row[0],
            "job_type": row[1],
            "payload": row[2],
            "retry_count": row[3],
        }
    return None
