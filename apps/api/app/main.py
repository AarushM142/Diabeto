import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apps.api.app.core.config import settings
from apps.api.app.modules.ingestion.router import router as ingestion_router
from apps.api.app.modules.adherence.router import router as adherence_router
from apps.api.app.modules.approvals.router import router as approvals_router
from apps.api.app.modules.trend.router import router as trend_router
from apps.api.app.modules.risk.router import router as risk_router
from apps.api.app.modules.meal_intelligence.router import router as meal_router
from apps.api.app.modules.auth.router import router as auth_router
from apps.api.app.channels.whatsapp import router as whatsapp_router
from apps.api.app.core.worker import run_background_worker



@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Starts the background job worker (Postgres outbox poller) on startup and
    signals it to stop on shutdown.
    """
    stop_event = asyncio.Event()
    worker_task = asyncio.create_task(run_background_worker(stop_event))
    yield
    # Shutdown: signal the worker and allow it to finish cleanly.
    stop_event.set()
    try:
        await asyncio.wait_for(worker_task, timeout=5.0)
    except asyncio.TimeoutError:
        worker_task.cancel()

app = FastAPI(
    title="Diabeto Care Platform API",
    description="Closed-loop diabetes care management system for elderly patients in India.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Sub-Routers
app.include_router(ingestion_router)
app.include_router(adherence_router)
app.include_router(approvals_router)
app.include_router(trend_router)
app.include_router(risk_router)
app.include_router(meal_router)
app.include_router(whatsapp_router)
app.include_router(auth_router)



@app.get("/health", tags=["Health"])
@app.get("/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "diabeto-api",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }

# RFC 7807 Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "type": "about:blank",
            "title": "Internal Server Error",
            "status": 500,
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "instance": str(request.url),
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.api.app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)

