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
    def validate_production_security(self) -> "Settings":
        if self.BACKEND_ENV == "production":
            if self.SECRET_KEY == INSECURE_DEV_SECRET or "insecure" in self.SECRET_KEY.lower():
                raise ValueError("Insecure default SECRET_KEY is strictly forbidden in production environment.")
            if len(self.SECRET_KEY) < 32:
                raise ValueError("Production SECRET_KEY must be at least 32 characters long.")
        return self

settings = Settings()
