import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import settings
from .models import Role

PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")
PASSWORD_RULE_MESSAGE = "비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 모두 포함해 8자 이상이어야 합니다."

TOKEN_KINDS = {
    "user": {"aud": "jobpick:user", "role": Role.USER},
    "sandbox": {"aud": "jobpick:sandbox", "role": Role.TEST_ADMIN},
    "admin": {"aud": "jobpick:admin", "role": Role.ADMIN},
}


def is_valid_password(password: str) -> bool:
    return bool(PASSWORD_PATTERN.match(password or ""))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def _secret(kind: str) -> str:
    if kind == "admin":
        if not settings.admin_enabled:
            raise RuntimeError("ADMIN_JWT_SECRET 이 설정되지 않았거나 USER_JWT_SECRET 과 같습니다.")
        return settings.admin_jwt_secret
    return settings.user_jwt_secret


def _expire_minutes(kind: str) -> int:
    return {
        "user": settings.user_token_expire_minutes,
        "sandbox": settings.sandbox_token_expire_minutes,
        "admin": settings.admin_token_expire_minutes,
    }[kind]


def kind_for_role(role: str) -> str:
    return {Role.USER: "user", Role.TEST_ADMIN: "sandbox", Role.ADMIN: "admin"}[Role(role)]


def create_token(user_id: int, role: str, kind: str) -> tuple[str, int]:
    meta = TOKEN_KINDS[kind]
    if Role(role) != meta["role"]:
        raise ValueError("권한과 토큰 종류가 일치하지 않습니다.")
    expires_in = _expire_minutes(kind) * 60
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "aud": meta["aud"],
        "iss": "jobpick-api",
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, _secret(kind), algorithm="HS256"), expires_in


def decode_token(token: str, kind: str) -> dict:
    return jwt.decode(
        token, _secret(kind), algorithms=["HS256"], audience=TOKEN_KINDS[kind]["aud"], issuer="jobpick-api"
    )
