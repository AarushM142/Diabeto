"""
Job Dispatcher
==============
Maps ``job_type`` values from the ``background_jobs`` outbox table to their
async handler functions.

Add a new branch here whenever a new job type is introduced.
"""
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession


async def dispatch_job(job: Dict[str, Any], session: AsyncSession) -> None:
    """
    Dispatches a claimed background job to the correct handler.

    Args:
        job: Dict with keys ``id``, ``job_type``, ``payload``, ``retry_count``.
        session: An active async SQLAlchemy session scoped to this job execution.

    Raises:
        ValueError: If job_type is unknown (causes the worker to mark it failed).
    """
    job_type = job.get("job_type", "")
    payload = job.get("payload", {})

    if job_type == "escalation_check":
        await _handle_escalation_check(payload, session)

    elif job_type == "calculate_trends":
        # Phase 5 will implement this handler.  Silently skip for now so the
        # job is marked completed without raising an error.
        pass

    else:
        raise ValueError(f"Unknown job_type: '{job_type}'")


async def _handle_escalation_check(payload: Dict[str, Any], session: AsyncSession) -> None:
    """
    Advances the escalation state machine for the given risk event.
    If the event is already acknowledged or resolved this is a no-op.
    """
    from apps.api.app.modules.risk.escalation import advance_escalation_state_machine

    risk_event_id = payload.get("risk_event_id")
    if not risk_event_id:
        raise ValueError("escalation_check job missing 'risk_event_id' in payload")

    result = await advance_escalation_state_machine(
        session=session,
        risk_event_id=risk_event_id,
    )

    # Log outcome for observability (structured print; swap for structured logger in production)
    status = result.get("status", "unknown")
    tier = result.get("tier", 0)
    action = result.get("action", "none")
    print(
        f"[job:escalation_check] risk_event={risk_event_id} "
        f"tier={tier} action={action} status={status}"
    )
