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
    engines: str = "PV estimate available; energy and outage simulation scheduled Phase 7"
    timestamp: datetime
