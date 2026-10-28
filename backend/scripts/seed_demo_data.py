import asyncio
import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, Organization, UserRole
from app.models.building import Building

async def seed():
    print("[*] Solvanta EnergyOS -- Seeding Demo Database...")
    async with AsyncSessionLocal() as session:
        # 1. Organization
        org_result = await session.execute(
            select(Organization).where(Organization.name == "Demo EPC Solar")
        )
        org = org_result.scalars().first()
        if not org:
            org = Organization(name="Demo EPC Solar", is_active=True)
            session.add(org)
            await session.flush()
            print("  [+] Created Organization: Demo EPC Solar")
        else:
            print("  [=] Organization Demo EPC Solar already exists.")

        # 2. Engineer / Admin User
        eng_result = await session.execute(
            select(User).where(User.email == "demo@solvanta.energy")
        )
        engineer = eng_result.scalars().first()
        if not engineer:
            engineer = User(
                email="demo@solvanta.energy",
                hashed_password=hash_password("Solvanta2026!"),
                full_name="Solvanta Energy Engineer",
                role=UserRole.ENGINEER,
                organization_id=org.id,
                is_active=True,
            )
            session.add(engineer)
            await session.flush()
            print("  [+] Created Engineer User: demo@solvanta.energy (Role: engineer)")
        else:
            print("  [=] User demo@solvanta.energy already exists.")

        # 3. Customer User
        cust_result = await session.execute(
            select(User).where(User.email == "customer@solvanta.energy")
        )
        customer = cust_result.scalars().first()
        if not customer:
            customer = User(
                email="customer@solvanta.energy",
                hashed_password=hash_password("Solvanta2026!"),
                full_name="Demo Residential Owner",
                role=UserRole.CUSTOMER,
                organization_id=org.id,
                is_active=True,
            )
            session.add(customer)
            await session.flush()
            print("  [+] Created Customer User: customer@solvanta.energy (Role: customer)")
        else:
            print("  [=] User customer@solvanta.energy already exists.")

        # 4. Demo Building Digital Twin
        bld_result = await session.execute(
            select(Building).where(Building.name == "Demo Residential Hybrid Solar")
        )
        building = bld_result.scalars().first()
        if not building:
            building = Building(
                name="Demo Residential Hybrid Solar",
                address="Lahore, Pakistan",
                timezone="Asia/Karachi",
                pv_capacity_kwp=10.0,
                inverter_rating_kw=8.0,
                battery_nominal_kwh=10.0,
                battery_usable_kwh=9.0,
                battery_initial_soc_pct=70.0,
                battery_min_soc_pct=20.0,
                battery_max_charge_kw=4.0,
                battery_max_discharge_kw=4.0,
                battery_round_trip_efficiency=0.90,
                owner_id=customer.id,
                organization_id=org.id,
            )
            session.add(building)
            await session.flush()
            print(f"  [+] Created Building: Demo Residential Hybrid Solar (ID: {building.id})")
        else:
            print(f"  [=] Building Demo Residential Hybrid Solar already exists (ID: {building.id}).")

        await session.commit()
        print("[SUCCESS] Demo seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
