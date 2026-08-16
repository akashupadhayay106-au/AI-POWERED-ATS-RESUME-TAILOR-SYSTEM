import os
from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv

# Explicitly load .env file
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

class Settings(BaseSettings):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    ADZUNA_APP_ID: str = os.getenv("ADZUNA_APP_ID", "")
    ADZUNA_APP_KEY: str = os.getenv("ADZUNA_APP_KEY", "")
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")   # Optional
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resume_ai.db")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
    CACHE_EXPIRATION_SECONDS: int = 3600  # 1 hour

    # External API timeouts
    REQUEST_TIMEOUT: int = 15
    MAX_RETRIES: int = 3

    class Config:
        case_sensitive = False
        extra = "ignore"

settings = Settings()

def validate_config():
    """Validate critical config on startup. NEWS_API_KEY is optional."""
    missing_critical = []
    warnings = []

    if not settings.GEMINI_API_KEY or "your_" in settings.GEMINI_API_KEY:
        missing_critical.append("GEMINI_API_KEY")
    if not settings.ADZUNA_APP_ID or "your_" in settings.ADZUNA_APP_ID:
        missing_critical.append("ADZUNA_APP_ID")
    if not settings.ADZUNA_APP_KEY or "your_" in settings.ADZUNA_APP_KEY:
        missing_critical.append("ADZUNA_APP_KEY")

    # NEWS_API_KEY is optional — just warn
    if not settings.NEWS_API_KEY or "your_" in settings.NEWS_API_KEY:
        warnings.append("NEWS_API_KEY (optional — news feed will use cached data)")

    if missing_critical:
        print(f"CONFIG WARNING: Missing variables: {', '.join(missing_critical)}. Check backend/.env")
    else:
        print(f"Config OK -- Gemini + Adzuna keys loaded.")

    if warnings:
        print(f"Optional keys not set: {', '.join(warnings)}")

# Trigger reload - reload config with new GEMINI_MODEL setting
validate_config()
