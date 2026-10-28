import os
from typing import List
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEV_SECRET = "solvanta-local-dev-insecure-secret-key-change-in-production-32chars"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    PROJECT_NAME: str = "Solvanta Resilience Digital Twin"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_ENV: str = "development"

    # Security & Auth
    SECRET_KEY: str = INSECURE_DEV_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    POSTGRES_USER: str = "solvanta_user"
    POSTGRES_PASSWORD: str = "solvanta_dev_password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "solvanta_db"
    DATABASE_URL: str = "postgresql+asyncpg://solvanta_user:solvanta_dev_password@localhost:5432/solvanta_db"
    TEST_DATABASE_URL: str | None = None

    # CORS Origins (Allowing local Expo, web preview, and emulator)
    CORS_ORIGINS: List[str] = [
        "http://localhost:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8081",
        "http://10.0.2.2:8081",
        "http://10.0.2.2:8000",
        "exp://localhost:8081",
    ]

    @model_validator(mode="after")
    def validate_environment_and_security(self) -> "Settings":
        if self.BACKEND_ENV == "production":
            if self.SECRET_KEY == INSECURE_DEV_SECRET or "insecure" in self.SECRET_KEY.lower():
                raise ValueError("Insecure default SECRET_KEY is strictly forbidden in production environment.")
            if len(self.SECRET_KEY) < 32:
                raise ValueError("Production SECRET_KEY must be at least 32 characters long.")
        elif self.BACKEND_ENV == "test":
            # If TEST_DATABASE_URL is explicitly set, prioritize it
            if self.TEST_DATABASE_URL:
                self.DATABASE_URL = self.TEST_DATABASE_URL
            elif self.POSTGRES_DB == "solvanta_db" and "solvanta_test_db" not in self.DATABASE_URL:
                self.POSTGRES_DB = "solvanta_test_db"
                self.DATABASE_URL = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/solvanta_test_db"
        return self

    def assert_test_database_isolated(self, url_override: str | None = None) -> None:
        """Enforces guardrail: tests and destructive migrations must NEVER run against
        development or production databases.
        
        Requires:
        1. BACKEND_ENV == 'test'
        2. DATABASE_URL parsed using SQLAlchemy make_url()
        3. Parsed database name must equal the configured POSTGRES_DB
        4. Parsed database name must equal the dedicated test database name ('solvanta_test_db' or end with '_test'/'_test_db'),
           and not merely contain 'test' elsewhere (e.g. in username, host, or password).
        """
        from sqlalchemy.engine import make_url

        if self.BACKEND_ENV != "test":
            raise RuntimeError(
                f"FATAL SAFETY GUARDRAIL: BACKEND_ENV must be 'test' to run tests or test migrations, "
                f"got '{self.BACKEND_ENV}'."
            )

        raw_url = url_override or self.DATABASE_URL
        try:
            parsed = make_url(raw_url)
        except Exception as e:
            raise RuntimeError(
                f"FATAL SAFETY GUARDRAIL: DATABASE_URL could not be parsed via make_url(): {e}"
            )

        parsed_db = parsed.database
        if not parsed_db:
            raise RuntimeError(
                f"FATAL SAFETY GUARDRAIL: Parsed database name is empty from DATABASE_URL '{raw_url}'."
            )

        # Reject mismatched POSTGRES_DB / DATABASE_URL settings
        if self.POSTGRES_DB != parsed_db:
            raise RuntimeError(
                f"FATAL SAFETY GUARDRAIL: Mismatched database configuration! "
                f"POSTGRES_DB is '{self.POSTGRES_DB}' but DATABASE_URL targets '{parsed_db}'. "
                "Both settings must match exactly before migrations or tests can execute."
            )

        # Require parsed database name to equal dedicated test database name
        expected_test_dbs = {"solvanta_test_db"}
        if parsed_db not in expected_test_dbs and not (parsed_db.endswith("_test") or parsed_db.endswith("_test_db")):
            raise RuntimeError(
                f"FATAL SAFETY GUARDRAIL: Refusing to run tests or migrations against non-test database: '{parsed_db}'. "
                f"The parsed database name must equal the dedicated test database name ('solvanta_test_db') "
                f"or end with '_test'/'_test_db'. It is forbidden to target '{parsed_db}'."
            )

settings = Settings()
