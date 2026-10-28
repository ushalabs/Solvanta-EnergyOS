from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .core.config import settings
from .db.session import get_db
from .schemas.system import HealthResponse, ReadyResponse
from .api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Deterministic Building Energy Resilience Digital Twin API",
    openapi_url="/api/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.BACKEND_ENV == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health & readiness endpoints (ADR / API Contract compliance)
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def root_health():
    """Liveness probe: verifies application process is running."""
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        environment=settings.BACKEND_ENV,
        timestamp=datetime.now(timezone.utc),
    )

@app.get("/ready", response_model=ReadyResponse, tags=["System"])
async def root_ready(db: AsyncSession = Depends(get_db)):
    """Readiness probe: verifies database connectivity and engine readiness."""
    try:
        await db.execute(text("SELECT 1"))
        return ReadyResponse(
            ready=True,
            database="connected",
            engines="uninitialized (scheduled Phase 5+)",
            timestamp=datetime.now(timezone.utc),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database readiness probe failed: {str(e)}",
        )

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
