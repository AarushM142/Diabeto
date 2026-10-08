"""
Background Job Worker
=====================
Polls the Postgres ``background_jobs`` outbox table using ``FOR UPDATE SKIP LOCKED``
and dispatches each job to the appropriate handler.

The worker runs as an asyncio background task started during the FastAPI app
lifespan.  A single worker process is sufficient for the hackathon load.

Architecture note (ADR-002): We intentionally use Postgres as the job queue
instead of Redis/Kafka to keep transactional guarantees and reduce infrastructure
complexity.
"""
import asyncio
import traceback
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.core.database import async_session_factory
from apps.api.app.core.jobs import fetch_and_lock_next_job
from apps.api.app.core.job_dispatcher import dispatch_job

# How long the worker sleeps when no jobs are pending (seconds).
_POLL_INTERVAL_SECONDS = 10

# Maximum number of retry attempts before a job is permanently failed.
_MAX_RETRY_COUNT = 3


async def _mark_job_completed(session: AsyncSession, job_id: str) -> None:
    await session.execute(
        text(
            "UPDATE background_jobs SET status='completed', completed_at=:now WHERE id=:id"
        ),
        {"id": job_id, "now": datetime.now(timezone.utc)},
    )
    await session.commit()


async def _mark_job_failed(
    session: AsyncSession, job_id: str, retry_count: int, error_message: str
) -> None:
    """
    Increments retry counter.  Permanently fails the job once MAX_RETRY_COUNT
    is exceeded so it surfaces in the admin dashboard dead-letter view.
    """
    new_status = "failed" if retry_count >= _MAX_RETRY_COUNT else "pending"
    await session.execute(
        text(
            """
            UPDATE background_jobs
            SET status=:status,
                retry_count=retry_count + 1,
                error_message=:error,
                started_at=NULL
            WHERE id=:id
            """
        ),
        {"id": job_id, "status": new_status, "error": error_message[:1000]},
    )
    await session.commit()


async def _process_one_job() -> bool:
    """
    Attempts to claim and process one pending job.

    Returns True if a job was processed, False if the queue was empty.
    """
    async with async_session_factory() as session:
        job = await fetch_and_lock_next_job(session)
        if not job:
            return False

        job_id = job["id"]
        retry_count = job.get("retry_count", 0)
        try:
            await dispatch_job(job, session)
            await _mark_job_completed(session, job_id)
            return True
        except Exception as exc:
            error_msg = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
            print(f"[worker] Job {job_id} failed (attempt {retry_count + 1}): {exc}")
            try:
                await _mark_job_failed(session, job_id, retry_count, error_msg)
            except Exception:
                # If we can't even update the status, log and move on.
                traceback.print_exc()
        return True


async def run_background_worker(stop_event: Optional[asyncio.Event] = None) -> None:
    """
    Continuous polling loop.  Runs until *stop_event* is set (or forever if
    no event is provided).

    Usage from FastAPI lifespan::

        asyncio.create_task(run_background_worker(app.state.worker_stop))
    """
    print("[worker] Background job worker started.")
    while True:
        if stop_event and stop_event.is_set():
            print("[worker] Stop signal received. Shutting down.")
            break
        try:
            processed = await _process_one_job()
            if not processed:
                # No jobs in queue — back off to avoid busy-polling Postgres.
                await asyncio.sleep(_POLL_INTERVAL_SECONDS)
        except Exception:
            # Unexpected error in the polling loop itself (e.g., DB connection lost).
            traceback.print_exc()
            await asyncio.sleep(_POLL_INTERVAL_SECONDS)
