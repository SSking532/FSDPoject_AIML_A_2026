"""Application configuration loaded from environment variables (see .env.example)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{(BASE_DIR / 'smart_ambulance.db').as_posix()}"
    )
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-only-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:4173"
        ).split(",")
        if o.strip()
    ]
    SEED_DEMO_DATA: bool = _bool("SEED_DEMO_DATA", True)
    LOCATION_STALE_SECONDS: int = int(os.getenv("LOCATION_STALE_SECONDS", "120"))
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "demo1234")
    # Code a person must enter to sign up as a dispatcher (administrator).
    ADMIN_SIGNUP_CODE: str = os.getenv("ADMIN_SIGNUP_CODE", "DISPATCH-2026")
    # New driver sign-ups need dispatcher approval before they can be assigned.
    DRIVER_REQUIRES_APPROVAL: bool = _bool("DRIVER_REQUIRES_APPROVAL", True)


settings = Settings()

# Render / Railway hand out "postgres://" URLs; SQLAlchemy needs an explicit driver.
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace(
        "postgres://", "postgresql+psycopg://", 1
    )
elif settings.DATABASE_URL.startswith("postgresql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg://", 1
    )