from fastapi import APIRouter
from .endpoints import system, auth, buildings

api_router = APIRouter()

api_router.include_router(system.router, prefix="/system", tags=["System"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(buildings.router, prefix="/buildings", tags=["Buildings"])
