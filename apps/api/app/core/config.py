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
    GOOGLE_GEMINI_API_KEY: Optional[str] = None

    @property
    def effective_gemini_api_key(self) -> Optional[str]:
        return self.GEMINI_API_KEY or self.GOOGLE_GEMINI_API_KEY

    # WhatsApp Channel
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_NUMBER: Optional[str] = "whatsapp:+14155238886"
    # Reject Twilio webhooks without a valid X-Twilio-Signature whenever an auth
    # token is configured. Set to false only for local testing with unsigned
    # requests (WhatsApp simulator, Postman).
    TWILIO_VALIDATE_SIGNATURE: bool = True
    # Public URL Twilio calls us on (e.g. the ngrok URL). Used for webhook
    # signature checks and status-callback URLs.
    PUBLIC_BASE_URL: Optional[str] = None
    # Demo only: treat messages from unknown numbers as the demo patient.
    ALLOW_DEMO_UNKNOWN_SENDER_FALLBACK: bool = False

    META_WA_PHONE_NUMBER_ID: Optional[str] = None
    META_WA_ACCESS_TOKEN: Optional[str] = None
    META_WA_VERIFY_TOKEN: Optional[str] = "diabeto_webhook_verify_token"

    # Observability
    SENTRY_DSN: Optional[str] = None

settings = Settings()
