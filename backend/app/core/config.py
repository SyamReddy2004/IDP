import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "IDP System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Database (Using SQLite for local non-Docker development)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./idp.db")
    
    # Redis & Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    
    # Ollama
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")

    # Google Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
