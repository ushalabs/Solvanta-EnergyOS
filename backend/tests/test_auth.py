import asyncio
import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_registration_and_login_flow(async_client: AsyncClient):
    unique_suffix = str(uuid.uuid4())[:8]
    test_email = f"tester_{unique_suffix}@solvanta.energy"
    test_password = "SecurePassword123!"
    test_org = f"Test Org {unique_suffix}"

    # 1. Register new user and organization
    reg_response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": "Integration Test User",
            "organization_name": test_org,
        },
    )
    assert reg_response.status_code == 201
    user_data = reg_response.json()
    assert user_data["email"] == test_email
    assert user_data["role"] == "customer"
    assert user_data["is_superuser"] is False
    assert "id" in user_data

    # 2. Duplicate registration with same email should be rejected with 409
    dup_response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": "Duplicate User",
        },
    )
    assert dup_response.status_code == 409

    # 3. Arbitrary user attempting to join existing organization via public registration must be rejected
    other_email = f"intruder_{unique_suffix}@solvanta.energy"
    org_hijack_response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": other_email,
            "password": test_password,
            "full_name": "Org Hijacker",
            "organization_name": test_org,
        },
    )
    assert org_hijack_response.status_code == 409
    assert "already exists" in org_hijack_response.json()["detail"]

    # 4. Invalid email format must be rejected with 422
    invalid_email_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "not-a-valid-email",
            "password": test_password,
            "full_name": "Invalid Email User",
        },
    )
    assert invalid_email_res.status_code == 422

    # 5. Login with wrong password should fail with 401
    bad_login = await async_client.post(
        "/api/v1/auth/login",
        data={"username": test_email, "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 6. Login with correct password should succeed
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": test_email, "password": test_password},
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    token = token_data["access_token"]

    # 7. Get current profile using bearer token
    me_response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == test_email
    assert me_data["full_name"] == "Integration Test User"

@pytest.mark.asyncio
async def test_auth_me_unauthorized(async_client: AsyncClient):
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_concurrent_duplicate_organization_registration(async_client: AsyncClient):
    """Verifies that concurrent duplicate organization creations trigger flush IntegrityError and return 409."""
    suffix = str(uuid.uuid4())[:8]
    org_name = f"Concurrent Org {suffix}"

    res1, res2 = await asyncio.gather(
        async_client.post(
            "/api/v1/auth/register",
            json={
                "email": f"concurrent_1_{suffix}@solvanta.energy",
                "password": "SecurePassword123!",
                "full_name": "Concurrent One",
                "organization_name": org_name,
            },
        ),
        async_client.post(
            "/api/v1/auth/register",
            json={
                "email": f"concurrent_2_{suffix}@solvanta.energy",
                "password": "SecurePassword123!",
                "full_name": "Concurrent Two",
                "organization_name": org_name,
            },
        ),
    )
    statuses = {res1.status_code, res2.status_code}
    assert 201 in statuses
    assert 409 in statuses
