from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    ADZUNA_APP_ID: Optional[str] = None
    ADZUNA_APP_KEY: Optional[str] = None
    NEWS_API_KEY: Optional[str] = "alKnXfmPtisqt4y5u2kqg71VsAAJw3RRejEi3WyX"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resume_ai.db")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    CACHE_EXPIRATION_SECONDS: int = 3600 # 1 hour
    
    class Config:
        env_file = os.path.join(os.path.dirname(__file__), ".env")

settings = Settings()
