import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_registration_and_login_flow(async_client: AsyncClient):
    unique_suffix = str(uuid.uuid4())[:8]
    test_email = f"tester_{unique_suffix}@solvanta.energy"
    test_password = "SecurePassword123!"

    # 1. Register new user
    reg_response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": "Integration Test User",
            "organization_name": f"Test Org {unique_suffix}",
        },
    )
    assert reg_response.status_code == 201
    user_data = reg_response.json()
    assert user_data["email"] == test_email
    assert user_data["role"] == "customer"
    assert "id" in user_data

    # 2. Duplicate registration should be rejected
    dup_response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": "Duplicate User",
        },
    )
    assert dup_response.status_code == 400

    # 3. Login with wrong password should fail
    bad_login = await async_client.post(
        "/api/v1/auth/login",
        data={"username": test_email, "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 4. Login with correct password should succeed
    login_response = await async_client.post(
        "/api/v1/auth/login",
        data={"username": test_email, "password": test_password},
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    token = token_data["access_token"]

    # 5. Get current profile using bearer token
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
