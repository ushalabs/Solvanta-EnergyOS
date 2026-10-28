import os
import sys

# Ensure test mode and dedicated test database are configured before any application imports
os.environ["BACKEND_ENV"] = "test"
os.environ["POSTGRES_DB"] = "solvanta_test_db"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://solvanta_user:solvanta_dev_password@localhost:5432/solvanta_test_db"
)
# Safety intercept: if an external runner passed a URL ending in /solvanta_db, redirect to test DB
if os.environ["DATABASE_URL"].endswith("/solvanta_db"):
    os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].replace("/solvanta_db", "/solvanta_test_db")

import asyncio
import pytest
import pytest_asyncio
import asyncpg
from httpx import AsyncClient, ASGITransport
from alembic.config import Config
from alembic import command
from scripts.seed_demo_data import seed

from app.core.config import settings
from app.db.session import engine
from app.main import app

async def init_test_database():
    """Connects to Postgres maintenance database to provision the dedicated test DB if missing."""
    settings.assert_test_database_isolated()
    conn = None
    for admin_db in ["postgres", "template1", "solvanta_db"]:
        try:
            conn = await asyncpg.connect(
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                database=admin_db,
            )
            break
        except Exception:
            continue
    if not conn:
        raise RuntimeError("Could not connect to PostgreSQL server to provision test database.")
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", settings.POSTGRES_DB
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{settings.POSTGRES_DB}" OWNER "{settings.POSTGRES_USER}"')
    finally:
        await conn.close()

@pytest_asyncio.fixture(scope="session", autouse=True)
async def ensure_db_schema():
    # 1. Enforce strict isolation guardrail
    settings.assert_test_database_isolated()

    # 2. Provision test database
    await init_test_database()

    # 3. Apply migrations to test DB specifically
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    
    await asyncio.to_thread(command.upgrade, cfg, "head")

    # Invalidate engine connection pool
    await engine.dispose()

    # 4. Seed baseline demo data in test DB
    await seed()

@pytest_asyncio.fixture(scope="session")
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
