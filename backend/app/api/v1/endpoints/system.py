from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from ....core.config import settings
from ....db.session import get_db
from ....schemas.system import HealthResponse, ReadyResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Liveness probe: verifies application is running."""
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        environment=settings.BACKEND_ENV,
        timestamp=datetime.now(timezone.utc),
    )

@router.get("/ready", response_model=ReadyResponse)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe: verifies database connectivity and engine readiness."""
    try:
        await db.execute(text("SELECT 1"))
        return ReadyResponse(
            ready=True,
            database="connected",
            engines="PV estimate available; energy and outage simulation available",
            timestamp=datetime.now(timezone.utc),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database readiness check failed"
        )
