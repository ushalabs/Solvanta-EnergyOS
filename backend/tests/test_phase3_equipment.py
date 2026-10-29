import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_phase3_equipment_full_configuration_crud(async_client: AsyncClient):
    """Verifies Phase 3 building equipment creation, retrieval, and updates with realistic physical entities."""
    # 1. Register test user
    uid = str(uuid.uuid4())[:8]
    email = f"eng_{uid}@solvanta.energy"
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "full_name": f"Engineer {uid}",
            "organization_name": f"Solar EPC {uid}",
        },
    )
    assert reg_res.status_code == 201

    # 2. Login to get token
    login_res = await async_client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create building with full realistic equipment models (nested and verified)
    create_payload = {
        "name": f"Solar Test Villa {uid}",
        "address": "DHA Phase 6, Lahore",
        "timezone": "Asia/Karachi",
        "pv_capacity_kwp": 12.5,
        "inverter_rating_kw": 10.0,
        "solar": {
            "pv_capacity_kwp": 12.5,
            "panel_tilt_deg": 28.0,
            "panel_azimuth_deg": 175.0,
            "system_losses_pct": 13.5,
            "module_count": 22,
            "module_wattage_w": 570.0,
        },
        "inverter": {
            "rating_kw": 10.0,
            "efficiency_pct": 97.2,
            "inverter_type": "hybrid",
        },
        "battery": {
            "nominal_capacity_kwh": 15.0,
            "usable_capacity_kwh": 13.5,
            "initial_soc_pct": 80.0,
            "minimum_soc_pct": 15.0,
            "max_charge_kw": 5.0,
            "max_discharge_kw": 5.0,
            "round_trip_efficiency": 0.92,
            "chemistry": "LFP",
        },
        "generator": {
            "enabled": True,
            "rating_kw": 7.5,
            "fuel_type": "diesel",
            "fuel_consumption_l_per_kwh": 0.32,
            "min_runtime_min": 20,
        },
        "grid": {
            "connection_type": "three_phase",
            "import_limit_kw": 20.0,
            "export_limit_kw": 15.0,
            "has_net_metering": True,
        },
    }

    create_res = await async_client.post("/api/v1/buildings", json=create_payload, headers=headers)
    assert create_res.status_code == 201, f"Create failed: {create_res.text}"
    bld_data = create_res.json()
    bld_id = bld_data["id"]

    # Verify structured returned properties
    assert bld_data["name"] == f"Solar Test Villa {uid}"
    assert bld_data["solar"]["pv_capacity_kwp"] == 12.5
    assert bld_data["solar"]["panel_tilt_deg"] == 28.0
    assert bld_data["solar"]["module_count"] == 22
    assert bld_data["inverter"]["efficiency_pct"] == 97.2
    assert bld_data["battery"]["nominal_capacity_kwh"] == 15.0
    assert bld_data["battery"]["usable_capacity_kwh"] == 13.5
    assert bld_data["battery"]["chemistry"] == "LFP"
    assert bld_data["generator"]["enabled"] is True
    assert bld_data["generator"]["rating_kw"] == 7.5
    assert bld_data["generator"]["fuel_type"] == "diesel"
    assert bld_data["grid"]["connection_type"] == "three_phase"

    # 4. Retrieve decomposed equipment profile via dedicated endpoint
    equip_res = await async_client.get(f"/api/v1/buildings/{bld_id}/equipment", headers=headers)
    assert equip_res.status_code == 200
    equip_data = equip_res.json()
    assert equip_data["building_id"] == bld_id
    assert equip_data["is_valid"] is True
    assert len(equip_data["validation_messages"]) == 0
    assert equip_data["solar"]["panel_tilt_deg"] == 28.0
    assert equip_data["generator"]["rating_kw"] == 7.5

    # 5. Update equipment: expand battery capacity and adjust tilt
    update_payload = {
        "solar": {
            "panel_tilt_deg": 30.0,
        },
        "battery": {
            "nominal_capacity_kwh": 20.0,
            "usable_capacity_kwh": 18.0,
        },
        "generator": {
            "enabled": False,
            "rating_kw": 0.0,
        },
    }
    update_res = await async_client.patch(f"/api/v1/buildings/{bld_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["solar"]["panel_tilt_deg"] == 30.0
    assert updated_data["battery"]["nominal_capacity_kwh"] == 20.0
    assert updated_data["battery"]["usable_capacity_kwh"] == 18.0
    assert updated_data["generator"]["enabled"] is False

    # 6. Verify equipment endpoint reflects the updated state
    equip_res2 = await async_client.get(f"/api/v1/buildings/{bld_id}/equipment", headers=headers)
    assert equip_res2.status_code == 200
    assert equip_res2.json()["battery"]["usable_capacity_kwh"] == 18.0


@pytest.mark.asyncio
async def test_phase3_equipment_validation_constraints(async_client: AsyncClient):
    """Verifies that physical invariant violations in equipment parameters are rejected with 422."""
    uid = str(uuid.uuid4())[:8]
    email = f"val_{uid}@solvanta.energy"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecurePassword123!", "full_name": "Validation User"},
    )
    login_res = await async_client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "SecurePassword123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Negative tilt angle (> 90 degrees or < 0)
    invalid_tilt = {
        "name": "Invalid Tilt Villa",
        "pv_capacity_kwp": 5.0,
        "inverter_rating_kw": 5.0,
        "solar": {"pv_capacity_kwp": 5.0, "panel_tilt_deg": 120.0},
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
    }
    res = await async_client.post("/api/v1/buildings", json=invalid_tilt, headers=headers)
    assert res.status_code == 422

    # Negative solar capacity
    invalid_pv = {
        "name": "Negative PV Villa",
        "pv_capacity_kwp": -5.0,
        "inverter_rating_kw": 5.0,
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
    }
    res = await async_client.post("/api/v1/buildings", json=invalid_pv, headers=headers)
    assert res.status_code == 422

    # Inverter efficiency > 100%
    invalid_eff = {
        "name": "Perpetual Motion Inverter",
        "pv_capacity_kwp": 5.0,
        "inverter_rating_kw": 5.0,
        "inverter": {"rating_kw": 5.0, "efficiency_pct": 105.0},
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
    }
    res = await async_client.post("/api/v1/buildings", json=invalid_eff, headers=headers)
    assert res.status_code == 422

    # Battery usable > nominal
    invalid_battery = {
        "name": "Impossible Battery",
        "pv_capacity_kwp": 5.0,
        "inverter_rating_kw": 5.0,
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 12.0},
    }
    res = await async_client.post("/api/v1/buildings", json=invalid_battery, headers=headers)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_phase3_role_primitives_organization_access(async_client: AsyncClient):
    """Verifies customer ownership and engineer organization access primitives."""
    uid = str(uuid.uuid4())[:8]
    org_name = f"Apex Energy {uid}"

    # 1. Register engineer under Org A
    eng_email = f"apex_eng_{uid}@solvanta.energy"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": eng_email, "password": "SecurePassword123!", "full_name": "Apex Engineer", "organization_name": org_name},
    )
    eng_token = (await async_client.post(
        "/api/v1/auth/login", data={"username": eng_email, "password": "SecurePassword123!"}
    )).json()["access_token"]

    # 2. Register customer under Org B
    cust_email = f"other_cust_{uid}@solvanta.energy"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": cust_email, "password": "SecurePassword123!", "full_name": "Other Customer", "organization_name": f"Other Org {uid}"},
    )
    cust_token = (await async_client.post(
        "/api/v1/auth/login", data={"username": cust_email, "password": "SecurePassword123!"}
    )).json()["access_token"]

    # 3. Customer creates building
    cust_bld = (await async_client.post(
        "/api/v1/buildings",
        json={
            "name": f"Customer Site {uid}",
            "pv_capacity_kwp": 8.0,
            "inverter_rating_kw": 6.0,
            "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 9.0},
        },
        headers={"Authorization": f"Bearer {cust_token}"},
    )).json()

    # 4. Customer can access own building equipment
    res = await async_client.get(
        f"/api/v1/buildings/{cust_bld['id']}/equipment",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert res.status_code == 200

    # 5. Engineer from different Org A is denied access (403 Forbidden)
    denied_res = await async_client.get(
        f"/api/v1/buildings/{cust_bld['id']}/equipment",
        headers={"Authorization": f"Bearer {eng_token}"},
    )
    assert denied_res.status_code == 403


@pytest.mark.asyncio
async def test_phase3_flat_vs_nested_conflict_detection(async_client: AsyncClient):
    """Verifies that contradictory values between flat and nested sub-schemas are rejected with 422."""
    uid = str(uuid.uuid4())[:8]
    email = f"conflict_{uid}@solvanta.energy"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecurePassword123!", "full_name": "Conflict User"},
    )
    token = (await async_client.post(
        "/api/v1/auth/login", data={"username": email, "password": "SecurePassword123!"}
    )).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Conflict on Create: flat pv_capacity_kwp != nested solar.pv_capacity_kwp
    conflict_solar = {
        "name": f"Conflict Solar {uid}",
        "pv_capacity_kwp": 10.0,
        "inverter_rating_kw": 8.0,
        "solar": {"pv_capacity_kwp": 15.0},
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
    }
    res1 = await async_client.post("/api/v1/buildings", json=conflict_solar, headers=headers)
    assert res1.status_code == 422
    assert "Conflicting values provided for 'pv_capacity_kwp'" in res1.text

    # 2. Conflict on Create: flat battery_nominal_kwh != nested battery.nominal_capacity_kwh
    conflict_bat = {
        "name": f"Conflict Battery {uid}",
        "pv_capacity_kwp": 10.0,
        "inverter_rating_kw": 8.0,
        "battery_nominal_kwh": 10.0,
        "battery": {"nominal_capacity_kwh": 14.0, "usable_capacity_kwh": 8.0},
    }
    res2 = await async_client.post("/api/v1/buildings", json=conflict_bat, headers=headers)
    assert res2.status_code == 422
    assert "Conflicting values provided for 'battery_nominal_kwh'" in res2.text

    # 3. Create clean building
    clean_payload = {
        "name": f"Clean Base {uid}",
        "pv_capacity_kwp": 10.0,
        "inverter_rating_kw": 8.0,
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
    }
    bld = (await async_client.post("/api/v1/buildings", json=clean_payload, headers=headers)).json()

    # 4. Conflict on Update: flat inverter_rating_kw != nested inverter.rating_kw
    conflict_update = {
        "inverter_rating_kw": 8.0,
        "inverter": {"rating_kw": 12.0},
    }
    res3 = await async_client.patch(f"/api/v1/buildings/{bld['id']}", json=conflict_update, headers=headers)
    assert res3.status_code == 422
    assert "Conflicting values provided for 'inverter_rating_kw'" in res3.text


@pytest.mark.asyncio
async def test_phase3_pv_module_capacity_consistency(async_client: AsyncClient):
    """Verifies that PV module count x module wattage is physically consistent with declared capacity."""
    uid = str(uuid.uuid4())[:8]
    email = f"pv_phys_{uid}@solvanta.energy"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecurePassword123!", "full_name": "PV Physics User"},
    )
    token = (await async_client.post(
        "/api/v1/auth/login", data={"username": email, "password": "SecurePassword123!"}
    )).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Inconsistent PV: declared 20.0 kWp, but 10 modules x 400W = 4.0 kWp (exceeds allowable tolerance)
    inconsistent_payload = {
        "name": f"Inconsistent PV {uid}",
        "pv_capacity_kwp": 20.0,
        "pv_module_count": 10,
        "pv_module_wattage_w": 400.0,
        "inverter_rating_kw": 15.0,
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
    }
    res1 = await async_client.post("/api/v1/buildings", json=inconsistent_payload, headers=headers)
    assert res1.status_code == 422
    assert "PV capacity mismatch" in res1.text

    # 2. Consistent PV: declared 10.0 kWp, 18 modules x 550W = 9.9 kWp (within +/- 0.5 kWp tolerance)
    consistent_payload = {
        "name": f"Consistent PV {uid}",
        "pv_capacity_kwp": 10.0,
        "pv_module_count": 18,
        "pv_module_wattage_w": 550.0,
        "inverter_rating_kw": 8.0,
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
    }
    res2 = await async_client.post("/api/v1/buildings", json=consistent_payload, headers=headers)
    assert res2.status_code == 201
    bld_id = res2.json()["id"]

    # 3. Patching PV module count to inconsistent value is rejected
    bad_patch = {
        "solar": {"module_count": 4, "module_wattage_w": 550.0}  # 2.2 kWp vs existing 10.0 kWp
    }
    res3 = await async_client.patch(f"/api/v1/buildings/{bld_id}", json=bad_patch, headers=headers)
    assert res3.status_code == 422
    assert "PV capacity mismatch" in res3.text


@pytest.mark.asyncio
async def test_phase3_generator_validation(async_client: AsyncClient):
    """Verifies that an enabled backup generator with 0 or negative rated capacity is rejected."""
    uid = str(uuid.uuid4())[:8]
    email = f"gen_val_{uid}@solvanta.energy"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecurePassword123!", "full_name": "Generator User"},
    )
    token = (await async_client.post(
        "/api/v1/auth/login", data={"username": email, "password": "SecurePassword123!"}
    )).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Enabled generator with 0 kW rating on Create -> rejected
    zero_gen = {
        "name": f"Zero Gen {uid}",
        "pv_capacity_kwp": 10.0,
        "inverter_rating_kw": 8.0,
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
        "generator": {
            "enabled": True,
            "rating_kw": 0.0,
        },
    }
    res1 = await async_client.post("/api/v1/buildings", json=zero_gen, headers=headers)
    assert res1.status_code == 422
    assert "rating greater than 0 kW" in res1.text

    # 2. Disabled generator with 0 kW rating on Create -> valid
    disabled_gen = {
        "name": f"Disabled Gen {uid}",
        "pv_capacity_kwp": 10.0,
        "inverter_rating_kw": 8.0,
        "battery": {"nominal_capacity_kwh": 10.0, "usable_capacity_kwh": 8.0},
        "generator": {
            "enabled": False,
            "rating_kw": 0.0,
        },
    }
    res2 = await async_client.post("/api/v1/buildings", json=disabled_gen, headers=headers)
    assert res2.status_code == 201
    bld_id = res2.json()["id"]

    # 3. Enabling generator without rating on Update -> rejected
    enable_zero = {
        "generator": {
            "enabled": True,
            "rating_kw": 0.0,
        }
    }
    res3 = await async_client.patch(f"/api/v1/buildings/{bld_id}", json=enable_zero, headers=headers)
    assert res3.status_code == 422
    assert "rating greater than 0 kW" in res3.text

    # 4. Enabling generator with positive rating -> valid
    enable_valid = {
        "generator": {
            "enabled": True,
            "rating_kw": 6.5,
            "fuel_type": "diesel",
        }
    }
    res4 = await async_client.patch(f"/api/v1/buildings/{bld_id}", json=enable_valid, headers=headers)
    assert res4.status_code == 200
    assert res4.json()["generator"]["rating_kw"] == 6.5
    assert res4.json()["generator"]["enabled"] is True
