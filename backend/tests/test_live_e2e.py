import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_authenticated_e2e_flow_against_app(async_client: AsyncClient):
    """Verifies that an authenticated user can query their profile and seeded building."""
    # 1. Health check
    h_res = await async_client.get("/health")
    assert h_res.status_code == 200

    # 2. Login as seeded engineer
    login_res = await async_client.post(
        "/api/v1/auth/login",
        data={"username": "demo@solvanta.energy", "password": "Solvanta2026!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Query authenticated profile
    me_res = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "demo@solvanta.energy"

    # 4. Query buildings list
    b_res = await async_client.get("/api/v1/buildings/", headers=headers)
    assert b_res.status_code == 200
    buildings = b_res.json()
    assert len(buildings) >= 1
    target = buildings[0]
    assert "battery" in target
    assert target["battery"]["nominal_capacity_kwh"] == 10.0
