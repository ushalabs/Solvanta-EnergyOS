import os
import pytest
from alembic.config import Config
from alembic import command
from app.core.config import Settings, settings

def test_database_isolation_guardrail():
    """Validates that accidental attempts to run tests against development or production DBs are rejected."""
    # 1. Non-test environment should trigger RuntimeError
    dev_settings = Settings(
        TEST_DATABASE_URL=None,  # Unit configuration must not inherit the runner database override.
        BACKEND_ENV="development",
        POSTGRES_DB="solvanta_db",
        DATABASE_URL="postgresql+asyncpg://solvanta_user:pass@localhost:5432/solvanta_db",
    )
    with pytest.raises(RuntimeError) as exc_info:
        dev_settings.assert_test_database_isolated()
    assert "FATAL SAFETY GUARDRAIL" in str(exc_info.value)
    assert "BACKEND_ENV must be 'test'" in str(exc_info.value)

    # 2. Database URL with 'test' in username/host but targeting production DB must be rejected
    trick_settings = Settings(
        TEST_DATABASE_URL=None,  # Unit configuration must not inherit the runner database override.
        BACKEND_ENV="test",
        POSTGRES_DB="solvanta_production",
        DATABASE_URL="postgresql+asyncpg://test_user:test_pass@test-cluster.internal:5432/solvanta_production",
    )
    with pytest.raises(RuntimeError) as exc_info:
        trick_settings.assert_test_database_isolated()
    assert "FATAL SAFETY GUARDRAIL" in str(exc_info.value)
    assert "solvanta_production" in str(exc_info.value)

    # 3. Dedicated test DB should pass cleanly
    test_settings = Settings(
        TEST_DATABASE_URL=None,  # Unit configuration must not inherit the runner database override.
        BACKEND_ENV="test",
        POSTGRES_DB="solvanta_test_db",
        DATABASE_URL="postgresql+asyncpg://solvanta_user:pass@localhost:5432/solvanta_test_db",
    )
    test_settings.assert_test_database_isolated()

def test_mismatched_postgres_db_and_database_url_rejected():
    """Validates that mismatched POSTGRES_DB and DATABASE_URL settings are rejected before migrations."""
    mismatched = Settings(
        TEST_DATABASE_URL=None,  # Unit configuration must not inherit the runner database override.
        BACKEND_ENV="test",
        POSTGRES_DB="solvanta_test_db",
        DATABASE_URL="postgresql+asyncpg://solvanta_user:pass@localhost:5432/another_test_db",
    )
    with pytest.raises(RuntimeError) as exc_info:
        mismatched.assert_test_database_isolated()
    assert "Mismatched database configuration" in str(exc_info.value)
    assert "POSTGRES_DB is 'solvanta_test_db'" in str(exc_info.value)
    assert "another_test_db" in str(exc_info.value)

def test_regression_destructive_migrations_blocked_on_prod_url(monkeypatch):
    """Regression test: POSTGRES_DB=solvanta_test_db but TEST_DATABASE_URL points to a production-named database.
    Proves that destructive migrations (e.g. Alembic downgrade to base) cannot run.
    """
    test_db_name = "solvanta_test_db"
    prod_url = "postgresql+asyncpg://solvanta_user:prod_secret@prod-host:5432/solvanta_production"

    # 1. Prove Settings guardrail rejects configuration directly
    reg_settings = Settings(
        BACKEND_ENV="test",
        POSTGRES_DB=test_db_name,
        TEST_DATABASE_URL=prod_url,
        DATABASE_URL=prod_url,
    )
    with pytest.raises(RuntimeError) as exc_info:
        reg_settings.assert_test_database_isolated()
    err_text = str(exc_info.value)
    assert "FATAL SAFETY GUARDRAIL" in err_text
    assert "solvanta_production" in err_text or "Mismatched" in err_text

    # 2. Prove Alembic destructive migration runner is intercepted and aborts before executing
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_ini_path = os.path.join(backend_dir, "alembic.ini")
    cfg = Config(alembic_ini_path)
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    cfg.set_main_option("sqlalchemy.url", prod_url)

    # Monkeypatch active settings to mimic dangerous runtime environment
    monkeypatch.setattr(settings, "BACKEND_ENV", "test")
    monkeypatch.setattr(settings, "POSTGRES_DB", test_db_name)
    monkeypatch.setattr(settings, "DATABASE_URL", prod_url)

    # Attempt destructive downgrade to base; must be intercepted by env.py guardrail
    with pytest.raises(RuntimeError) as alembic_exc:
        command.downgrade(cfg, "base")

    assert "FATAL SAFETY GUARDRAIL" in str(alembic_exc.value)
