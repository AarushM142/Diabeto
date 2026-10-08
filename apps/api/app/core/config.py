from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    PORT: int = 8000
    DEBUG: bool = True

    # Database & Supabase
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/diabeto"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    JWT_SECRET: str = "dev-secret-key-change-in-production-123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Voice & STT
    SARVAM_API_KEY: Optional[str] = None

    # GenAI
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # WhatsApp & Twilio IVR / Voice / SMS Channel
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_NUMBER: Optional[str] = "whatsapp:+14155238886"
    TWILIO_PHONE_NUMBER: Optional[str] = "+14155238886"

    META_WA_PHONE_NUMBER_ID: Optional[str] = None
    META_WA_ACCESS_TOKEN: Optional[str] = None
    META_WA_VERIFY_TOKEN: Optional[str] = "diabeto_webhook_verify_token"

    # Observability
    SENTRY_DSN: Optional[str] = None

settings = Settings()
