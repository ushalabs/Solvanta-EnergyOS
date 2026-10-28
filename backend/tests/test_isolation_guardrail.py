import pytest
from app.core.config import Settings

def test_database_isolation_guardrail():
    """Validates that accidental attempts to run tests against development or production DBs are rejected."""
    # 1. Non-test DB should trigger RuntimeError
    dev_settings = Settings(
        BACKEND_ENV="development",
        POSTGRES_DB="solvanta_db",
        DATABASE_URL="postgresql+asyncpg://solvanta_user:pass@localhost:5432/solvanta_db",
    )
    with pytest.raises(RuntimeError) as exc_info:
        dev_settings.assert_test_database_isolated()
    assert "FATAL SAFETY GUARDRAIL" in str(exc_info.value)
    assert "solvanta_db" in str(exc_info.value)

    # 2. Test DB should pass cleanly
    test_settings = Settings(
        BACKEND_ENV="test",
        POSTGRES_DB="solvanta_test_db",
        DATABASE_URL="postgresql+asyncpg://solvanta_user:pass@localhost:5432/solvanta_test_db",
    )
    test_settings.assert_test_database_isolated()
