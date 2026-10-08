from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.models.entities import HealthEvent, Patient

router = APIRouter(prefix="/v1", tags=["Trends & Analytics"])

@router.get("/patients/{patient_id}/trends")
async def get_patient_trends(
    patient_id: str,
    days: int = Query(14, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch glucose events
    stmt_events = (
        select(HealthEvent)
        .where(HealthEvent.patient_id == patient_id, HealthEvent.type == "glucose")
        .order_by(HealthEvent.measured_at.asc())
    )
    res_events = await db.execute(stmt_events)
    events = res_events.scalars().all()

    values = [float(e.value.get("mgdl", 0)) for e in events if "mgdl" in e.value]
    
    avg_glucose = sum(values) / len(values) if values else 0.0
    min_glucose = min(values) if values else 0.0
    max_glucose = max(values) if values else 0.0

    return {
        "patient_id": patient_id,
        "days": days,
        "reading_count": len(values),
        "summary": {
            "mean_glucose": round(avg_glucose, 1),
            "min_glucose": min_glucose,
            "max_glucose": max_glucose,
        },
        "readings": [
            {
                "measured_at": e.measured_at,
                "mgdl": e.value.get("mgdl"),
                "context": e.value.get("context", "fasting"),
            }
            for e in events
        ],
    }
