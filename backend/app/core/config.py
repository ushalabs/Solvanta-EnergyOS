import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    PROJECT_NAME: str = "Solvanta Resilience Digital Twin"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_ENV: str = "development"

    # Security & Auth
    SECRET_KEY: str = "solvanta-local-dev-insecure-secret-key-change-in-production-32chars"
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

settings = Settings()
