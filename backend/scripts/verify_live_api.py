import asyncio
import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx

async def main():
    base_url = os.environ.get("SOLVANTA_API_URL", "http://127.0.0.1:8000")
    print(f"[*] Testing Solvanta API against {base_url}...")

    async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as client:
        # 1. Health Probe
        health_res = await client.get("/health")
        assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
        print(f"  [+] Liveness Check: 200 OK (Version: {health_res.json()['version']})")

        # 2. Readiness Probe
        ready_res = await client.get("/ready")
        assert ready_res.status_code == 200, f"Readiness check failed: {ready_res.text}"
        ready_data = ready_res.json()
        assert ready_data["database"] == "connected"
        print(f"  [+] Readiness Check: 200 OK (DB: {ready_data['database']}, Engines: {ready_data['engines']})")

        # 3. Authenticate with seeded demo credentials
        login_res = await client.post(
            "/api/v1/auth/login",
            data={"username": "demo@solvanta.energy", "password": "Solvanta2026!"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        print(f"  [+] Authentication: 200 OK (Bearer JWT acquired: {token[:16]}...)")

        # 4. Authenticated Profile Probe
        auth_headers = {"Authorization": f"Bearer {token}"}
        me_res = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert me_res.status_code == 200, f"Profile request failed: {me_res.text}"
        user_info = me_res.json()
        print(f"  [+] Current User: {user_info['full_name']} <{user_info['email']}> (Role: {user_info['role']})")

        # 5. Authenticated Buildings List
        buildings_res = await client.get("/api/v1/buildings/", headers=auth_headers)
        assert buildings_res.status_code == 200, f"Buildings list failed: {buildings_res.text}"
        buildings = buildings_res.json()
        assert len(buildings) > 0, "No buildings found in seeded database"
        building = buildings[0]
        print(f"  [+] Building Retrieved: '{building['name']}' (ID: {building['id']})")
        print(f"      PV: {building['pv_capacity_kwp']} kWp | Inverter: {building['inverter_rating_kw']} kW")
        print(f"      Battery: {building['battery']['nominal_capacity_kwh']} kWh nominal, {building['battery']['usable_capacity_kwh']} kWh usable")

        print("\n[SUCCESS] All live authenticated API verification checks PASSED!")

if __name__ == "__main__":
    asyncio.run(main())
