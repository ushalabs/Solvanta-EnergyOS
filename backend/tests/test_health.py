import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_root_health(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data

@pytest.mark.asyncio
async def test_root_ready(async_client: AsyncClient):
    response = await async_client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["ready"] is True
    assert data["database"] == "connected"
    assert "PV estimate available" in data["engines"]

@pytest.mark.asyncio
async def test_v1_system_health(async_client: AsyncClient):
    response = await async_client.get("/api/v1/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

@pytest.mark.asyncio
async def test_v1_system_ready(async_client: AsyncClient):
    response = await async_client.get("/api/v1/system/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["ready"] is True
    assert data["database"] == "connected"
    assert "PV estimate available" in data["engines"]
