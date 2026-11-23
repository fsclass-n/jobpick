import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def _int(key: str, default: int) -> int:
    value = _env(key)
    return int(value) if value else default


def _bool(key: str, default: bool) -> bool:
    value = _env(key).lower()
    return value in ("1", "true", "yes", "on") if value else default


@dataclass(frozen=True)
class Settings:
    app_env: str = _env("APP_ENV", "local")
    database_url: str = _env("DATABASE_URL", "sqlite:///./storage/jobpick.db")
    storage_dir: Path = Path(_env("STORAGE_DIR", "./storage"))
    cors_origins: list[str] = field(
        default_factory=lambda: [o.strip() for o in _env("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    )
    frontend_url: str = _env("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    backend_url: str = _env("BACKEND_URL", "http://localhost:8000").rstrip("/")
    seed_on_startup: bool = _bool("SEED_ON_STARTUP", True)

    user_jwt_secret: str = _env("USER_JWT_SECRET", "change-me-user-secret")
    user_token_expire_minutes: int = _int("USER_TOKEN_EXPIRE_MINUTES", 720)
    sandbox_token_expire_minutes: int = _int("SANDBOX_TOKEN_EXPIRE_MINUTES", 120)

    admin_jwt_secret: str = _env("ADMIN_JWT_SECRET")
    admin_token_expire_minutes: int = _int("ADMIN_TOKEN_EXPIRE_MINUTES", 30)
    admin_initial_email: str = _env("ADMIN_INITIAL_EMAIL")
    admin_initial_password: str = _env("ADMIN_INITIAL_PASSWORD")
    admin_totp_secret: str = _env("ADMIN_TOTP_SECRET")
    login_max_failed: int = _int("LOGIN_MAX_FAILED", 5)
    login_lock_minutes: int = _int("LOGIN_LOCK_MINUTES", 15)

    enable_test_accounts: bool = _bool("ENABLE_TEST_ACCOUNTS", True)
    seed_demo_history: bool = _bool("SEED_DEMO_HISTORY", True)
    test_user_email: str = _env("TEST_USER_EMAIL", "user@jobpick.test")
    test_user_password: str = _env("TEST_USER_PASSWORD", "Jobpick!2026")
    test_admin_email: str = _env("TEST_ADMIN_EMAIL", "sandbox@jobpick.test")
    test_admin_password: str = _env("TEST_ADMIN_PASSWORD", "Sandbox!2026")

    google_client_id: str = _env("GOOGLE_CLIENT_ID")
    google_client_secret: str = _env("GOOGLE_CLIENT_SECRET")
    naver_client_id: str = _env("NAVER_CLIENT_ID")
    naver_client_secret: str = _env("NAVER_CLIENT_SECRET")
    kakao_client_id: str = _env("KAKAO_CLIENT_ID")
    kakao_client_secret: str = _env("KAKAO_CLIENT_SECRET")

    gemini_api_key: str = _env("GEMINI_API_KEY")
    gemini_model: str = _env("GEMINI_MODEL", "gemini-2.5-flash")

    @property
    def admin_enabled(self) -> bool:
        return bool(self.admin_jwt_secret) and self.admin_jwt_secret != self.user_jwt_secret


settings = Settings()
