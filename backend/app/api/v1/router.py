from fastapi import APIRouter
from .endpoints import system, auth, buildings
from .endpoints import roofs
from .endpoints import pv, appliances

api_router = APIRouter()

api_router.include_router(system.router, prefix="/system", tags=["System"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(buildings.router, prefix="/buildings", tags=["Buildings"])
api_router.include_router(roofs.router, prefix="/buildings", tags=["Rooftops"])
api_router.include_router(pv.router, prefix="/buildings", tags=["PV design"])

api_router.include_router(appliances.router, prefix="/buildings", tags=["Appliances"])

from .endpoints import simulation
api_router.include_router(simulation.router, prefix="/buildings", tags=["Simulation"])

from .endpoints import forecast
api_router.include_router(forecast.router,prefix="/buildings",tags=["Forecast"])

from .endpoints import scheduling
api_router.include_router(scheduling.router,prefix="/buildings",tags=["Scheduling"])

from .endpoints import resilience
api_router.include_router(resilience.router,prefix="/buildings",tags=["Resilience"])

from .endpoints import plans
api_router.include_router(plans.router,prefix="/buildings",tags=["Plans"])

from .endpoints import automation
api_router.include_router(automation.router,prefix="/buildings",tags=["Automation"])

from .endpoints import telemetry
api_router.include_router(telemetry.router,prefix="/buildings",tags=["Simulated telemetry"])

from .endpoints import operations
api_router.include_router(operations.router, prefix="/operations", tags=["Operations tools"])
