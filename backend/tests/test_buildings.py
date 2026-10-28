import pytest
import uuid
from httpx import AsyncClient
from app.db.session import AsyncSessionLocal
from app.models.user import User, Organization, UserRole
from app.core.security import hash_password

async def create_user_with_role(email: str, role: UserRole, org_name: str | None = None, is_superuser: bool = False) -> tuple[str, str]:
    password = "SecurePassword123!"
    async with AsyncSessionLocal() as session:
        org_id = None
        if org_name:
            org = Organization(name=org_name, is_active=True)
            session.add(org)
            await session.flush()
            org_id = org.id

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=f"User {email}",
            role=role,
            organization_id=org_id,
            is_active=True,
            is_superuser=is_superuser,
        )
        session.add(user)
        await session.commit()
    return email, password

@pytest.mark.asyncio
async def test_buildings_contract_nested_payload_crud(async_client: AsyncClient):
    """Verifies that building creation with the contract's nested battery payload works and returns both structures."""
    suffix = str(uuid.uuid4())[:8]
    email, password = await create_user_with_role(f"contract_user_{suffix}@solvanta.energy", UserRole.CUSTOMER)
    
    login_res = await async_client.post("/api/v1/auth/login", data={"username": email, "password": password})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Contract payload matching docs/API_CONTRACT.md Section 2.2
    payload = {
        "name": f"Demo Site Contract {suffix}",
        "timezone": "Asia/Karachi",
        "address": "Lahore, Pakistan",
        "pv_capacity_kwp": 10.0,
        "inverter_rating_kw": 8.0,
        "battery": {
            "nominal_capacity_kwh": 10.0,
            "usable_capacity_kwh": 9.0,
            "initial_soc_pct": 70.0,
            "minimum_soc_pct": 20.0,
            "max_charge_kw": 4.0,
            "max_discharge_kw": 4.0,
            "round_trip_efficiency": 0.90,
        },
    }

    create_res = await async_client.post("/api/v1/buildings/", json=payload, headers=headers)
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["name"] == payload["name"]
    assert data["battery"]["nominal_capacity_kwh"] == 10.0
    assert data["battery"]["usable_capacity_kwh"] == 9.0
    assert data["battery_nominal_kwh"] == 10.0
    building_id = data["id"]

    # Retrieve
    get_res = await async_client.get(f"/api/v1/buildings/{building_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == building_id

    # Update with nested battery
    patch_res = await async_client.patch(
        f"/api/v1/buildings/{building_id}",
        json={"battery": {"initial_soc_pct": 85.0}},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["battery"]["initial_soc_pct"] == 85.0

    # Delete
    del_res = await async_client.delete(f"/api/v1/buildings/{building_id}", headers=headers)
    assert del_res.status_code == 204

@pytest.mark.asyncio
async def test_building_validation_constraints(async_client: AsyncClient):
    """Verifies that invalid capacities, SoC relationships, and negative ratings return 422."""
    suffix = str(uuid.uuid4())[:8]
    email, password = await create_user_with_role(f"val_user_{suffix}@solvanta.energy", UserRole.CUSTOMER)
    login_res = await async_client.post("/api/v1/auth/login", data={"username": email, "password": password})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    base_payload = {
        "name": f"Validation Site {suffix}",
        "pv_capacity_kwp": 10.0,
        "inverter_rating_kw": 8.0,
        "battery_nominal_kwh": 10.0,
        "battery_usable_kwh": 9.0,
        "battery_initial_soc_pct": 70.0,
        "battery_min_soc_pct": 20.0,
        "battery_max_charge_kw": 4.0,
        "battery_max_discharge_kw": 4.0,
        "battery_round_trip_efficiency": 0.90,
    }

    # 1. Negative PV capacity
    neg_pv = {**base_payload, "pv_capacity_kwp": -5.0}
    res = await async_client.post("/api/v1/buildings/", json=neg_pv, headers=headers)
    assert res.status_code == 422

    # 2. Usable capacity > Nominal capacity
    invalid_usable = {**base_payload, "battery_usable_kwh": 15.0, "battery_nominal_kwh": 10.0}
    res = await async_client.post("/api/v1/buildings/", json=invalid_usable, headers=headers)
    assert res.status_code == 422

    # 3. Initial SoC < Minimum SoC
    invalid_soc = {**base_payload, "battery_initial_soc_pct": 15.0, "battery_min_soc_pct": 25.0}
    res = await async_client.post("/api/v1/buildings/", json=invalid_soc, headers=headers)
    assert res.status_code == 422

    # 4. Create valid building first, then verify partial update constraint checking
    create_res = await async_client.post("/api/v1/buildings/", json=base_payload, headers=headers)
    assert create_res.status_code == 201
    b_id = create_res.json()["id"]

    # Partial update: increase usable capacity beyond existing nominal (10.0)
    patch_invalid_usable = await async_client.patch(
        f"/api/v1/buildings/{b_id}",
        json={"battery_usable_kwh": 14.0},
        headers=headers,
    )
    assert patch_invalid_usable.status_code == 422

    # Partial update: lower initial SoC below existing min SoC (20.0)
    patch_invalid_soc = await async_client.patch(
        f"/api/v1/buildings/{b_id}",
        json={"battery_initial_soc_pct": 10.0},
        headers=headers,
    )
    assert patch_invalid_soc.status_code == 422

@pytest.mark.asyncio
async def test_multi_tenant_cross_organization_isolation(async_client: AsyncClient):
    """Ensures engineer and customer access is scoped to authorized organizations, denying cross-tenant actions."""
    suffix = str(uuid.uuid4())[:8]

    # Setup User in Org Alpha
    email_a, pass_a = await create_user_with_role(f"eng_alpha_{suffix}@solvanta.energy", UserRole.ENGINEER, f"Org Alpha {suffix}")
    login_a = await async_client.post("/api/v1/auth/login", data={"username": email_a, "password": pass_a})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Setup User in Org Beta
    email_b, pass_b = await create_user_with_role(f"eng_beta_{suffix}@solvanta.energy", UserRole.ENGINEER, f"Org Beta {suffix}")
    login_b = await async_client.post("/api/v1/auth/login", data={"username": email_b, "password": pass_b})
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup Customer in Org Alpha
    email_cust, pass_cust = await create_user_with_role(f"cust_alpha_{suffix}@solvanta.energy", UserRole.CUSTOMER)
    login_cust = await async_client.post("/api/v1/auth/login", data={"username": email_cust, "password": pass_cust})
    token_cust = login_cust.json()["access_token"]
    headers_cust = {"Authorization": f"Bearer {token_cust}"}

    # Setup System Administrator
    email_admin, pass_admin = await create_user_with_role(f"sysadmin_{suffix}@solvanta.energy", UserRole.ADMIN, is_superuser=True)
    login_admin = await async_client.post("/api/v1/auth/login", data={"username": email_admin, "password": pass_admin})
    token_admin = login_admin.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    # 1. Org Alpha Engineer creates Building Alpha
    b_alpha_res = await async_client.post(
        "/api/v1/buildings/",
        json={
            "name": f"Building Alpha {suffix}",
            "pv_capacity_kwp": 10.0,
            "inverter_rating_kw": 8.0,
            "battery_nominal_kwh": 10.0,
            "battery_usable_kwh": 9.0,
        },
        headers=headers_a,
    )
    assert b_alpha_res.status_code == 201
    b_alpha_id = b_alpha_res.json()["id"]

    # 2. Org Beta Engineer creates Building Beta
    b_beta_res = await async_client.post(
        "/api/v1/buildings/",
        json={
            "name": f"Building Beta {suffix}",
            "pv_capacity_kwp": 15.0,
            "inverter_rating_kw": 12.0,
            "battery_nominal_kwh": 20.0,
            "battery_usable_kwh": 18.0,
        },
        headers=headers_b,
    )
    assert b_beta_res.status_code == 201
    b_beta_id = b_beta_res.json()["id"]

    # 3. Org Alpha Engineer listing buildings sees Building Alpha, NOT Building Beta
    list_a = await async_client.get("/api/v1/buildings/", headers=headers_a)
    assert list_a.status_code == 200
    ids_a = [b["id"] for b in list_a.json()]
    assert b_alpha_id in ids_a
    assert b_beta_id not in ids_a

    # 4. Org Beta Engineer listing buildings sees Building Beta, NOT Building Alpha
    list_b = await async_client.get("/api/v1/buildings/", headers=headers_b)
    assert list_b.status_code == 200
    ids_b = [b["id"] for b in list_b.json()]
    assert b_beta_id in ids_b
    assert b_alpha_id not in ids_b

    # 5. Negative: Org Alpha Engineer attempts GET Building Beta -> 403 Forbidden
    cross_get = await async_client.get(f"/api/v1/buildings/{b_beta_id}", headers=headers_a)
    assert cross_get.status_code == 403

    # 6. Negative: Org Alpha Engineer attempts PATCH Building Beta -> 403 Forbidden
    cross_patch = await async_client.patch(
        f"/api/v1/buildings/{b_beta_id}",
        json={"name": "Hacked Site"},
        headers=headers_a,
    )
    assert cross_patch.status_code == 403

    # 7. Negative: Org Alpha Engineer attempts DELETE Building Beta -> 403 Forbidden
    cross_del = await async_client.delete(f"/api/v1/buildings/{b_beta_id}", headers=headers_a)
    assert cross_del.status_code == 403

    # 8. Customer isolation: Customer cannot access Org Alpha or Beta buildings
    cust_get = await async_client.get(f"/api/v1/buildings/{b_alpha_id}", headers=headers_cust)
    assert cust_get.status_code == 403

    # 9. Super Admin privilege: System administrator sees both buildings
    admin_list = await async_client.get("/api/v1/buildings/", headers=headers_admin)
    assert admin_list.status_code == 200
    admin_ids = [b["id"] for b in admin_list.json()]
    assert b_alpha_id in admin_ids
    assert b_beta_id in admin_ids
