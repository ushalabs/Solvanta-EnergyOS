import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_buildings_crud_flow(async_client: AsyncClient):
    unique_suffix = str(uuid.uuid4())[:8]
    test_email = f"building_tester_{unique_suffix}@solvanta.energy"
    test_password = "SecurePassword123!"

    # 1. Register and login to obtain token
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": "Building Tester",
        },
    )
    login_res = await async_client.post(
        "/api/v1/auth/login",
        data={"username": test_email, "password": test_password},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Building
    create_payload = {
        "name": f"Test Site {unique_suffix}",
        "address": "42 Renewable Way, Karachi",
        "timezone": "Asia/Karachi",
        "pv_capacity_kwp": 12.5,
        "inverter_rating_kw": 10.0,
        "battery_nominal_kwh": 15.0,
        "battery_usable_kwh": 13.5,
        "battery_initial_soc_pct": 80.0,
        "battery_min_soc_pct": 20.0,
        "battery_max_charge_kw": 5.0,
        "battery_max_discharge_kw": 5.0,
        "battery_round_trip_efficiency": 0.92,
    }
    create_res = await async_client.post(
        "/api/v1/buildings/",
        json=create_payload,
        headers=headers,
    )
    assert create_res.status_code == 201
    building_data = create_res.json()
    building_id = building_data["id"]
    assert building_data["name"] == create_payload["name"]
    assert building_data["pv_capacity_kwp"] == 12.5

    # 3. List Buildings
    list_res = await async_client.get("/api/v1/buildings/", headers=headers)
    assert list_res.status_code == 200
    buildings_list = list_res.json()
    assert any(b["id"] == building_id for b in buildings_list)

    # 4. Get Building by ID
    get_res = await async_client.get(f"/api/v1/buildings/{building_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == building_id

    # 5. Patch Building
    patch_res = await async_client.patch(
        f"/api/v1/buildings/{building_id}",
        json={"name": f"Updated Test Site {unique_suffix}", "battery_initial_soc_pct": 85.0},
        headers=headers,
    )
    assert patch_res.status_code == 200
    updated_data = patch_res.json()
    assert updated_data["name"] == f"Updated Test Site {unique_suffix}"
    assert updated_data["battery_initial_soc_pct"] == 85.0

    # 6. Delete Building
    del_res = await async_client.delete(f"/api/v1/buildings/{building_id}", headers=headers)
    assert del_res.status_code == 204

    # 7. Verify deletion
    verify_res = await async_client.get(f"/api/v1/buildings/{building_id}", headers=headers)
    assert verify_res.status_code == 404
