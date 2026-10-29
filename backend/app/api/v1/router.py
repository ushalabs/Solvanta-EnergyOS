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
