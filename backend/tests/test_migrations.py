import asyncio
import os
import pytest
from alembic.config import Config
from alembic import command
from scripts.seed_demo_data import seed
from app.db.session import engine
from app.core.config import settings

@pytest.mark.asyncio
async def test_alembic_migrations_downgrade_and_upgrade():
    """Validates that Alembic migrations run cleanly down to base and back up to head on the isolated test DB."""
    # Safety guardrail check
    settings.assert_test_database_isolated()

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_ini_path = os.path.join(backend_dir, "alembic.ini")
    
    cfg = Config(alembic_ini_path)
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

    # Execute in a separate thread so Alembic's internal asyncio.run() has a clean thread loop
    await asyncio.to_thread(command.downgrade, cfg, "base")
    await asyncio.to_thread(command.upgrade, cfg, "head")

    # Invalidate connection pool so asyncpg prepared statement caches match new table OIDs
    await engine.dispose()

    # Re-seed baseline demo data on isolated test DB so subsequent tests remain ready
    await seed()
