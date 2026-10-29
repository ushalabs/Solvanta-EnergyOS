import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import Solvanta application configuration and models
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.db.base import Base
# Import all models to register with Base.metadata
from app.models.user import User, Organization
from app.models.building import Building
from app.models.audit import AuditLog
from app.models.roof import Roof
from app.models.pv import PVDesign

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Dynamically set sqlalchemy.url from application settings
raw_url = config.get_main_option("sqlalchemy.url")
if not raw_url or "driver://user:pass@localhost/dbname" in raw_url:
    migration_url = settings.DATABASE_URL
    config.set_main_option("sqlalchemy.url", migration_url)
else:
    migration_url = raw_url

from sqlalchemy.engine import make_url

parsed_migration_url = make_url(migration_url)

if settings.BACKEND_ENV == "test":
    settings.assert_test_database_isolated(url_override=migration_url)
else:
    if settings.POSTGRES_DB != parsed_migration_url.database:
        raise RuntimeError(
            f"FATAL SAFETY GUARDRAIL: Mismatched migration target! "
            f"POSTGRES_DB is '{settings.POSTGRES_DB}' but migration URL targets '{parsed_migration_url.database}'. "
            "Both settings must match exactly before migrations can execute."
        )

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
