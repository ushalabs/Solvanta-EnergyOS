from datetime import datetime
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    environment: str = "development"
    timestamp: datetime

class ReadyResponse(BaseModel):
    ready: bool = True
    database: str = "connected"
    engines: str = "uninitialized (scheduled Phase 5+)"
    timestamp: datetime
