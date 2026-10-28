import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from alembic.config import Config
from alembic import command
from scripts.seed_demo_data import seed

from app.main import app

@pytest_asyncio.fixture(scope="session", autouse=True)
async def ensure_db_schema():
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    await asyncio.to_thread(command.upgrade, cfg, "head")
    await seed()

@pytest_asyncio.fixture(scope="session")
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
