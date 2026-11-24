import hmac
import os
import secrets
import time
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)

USER_SECRET = os.getenv("USER_JWT_SECRET") or secrets.token_urlsafe(48)
ADMIN_SECRET = os.getenv("ADMIN_JWT_SECRET") or secrets.token_urlsafe(48)
if USER_SECRET == ADMIN_SECRET:
    raise RuntimeError("USER_JWT_SECRET and ADMIN_JWT_SECRET must differ")

MAX_FAILURES = int(os.getenv("ADMIN_LOGIN_MAX_FAILURES", "5"))
LOCK_SECONDS = int(os.getenv("ADMIN_LOGIN_LOCK_MINUTES", "15")) * 60
_failures: dict[str, list[float]] = {}


def issue(role: str, sub: str) -> str:
    admin = role == "ADMIN"
    minutes = int(os.getenv("ADMIN_JWT_EXPIRE_MINUTES", "30") if admin else os.getenv("USER_JWT_EXPIRE_MINUTES", "120"))
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode({"sub": sub, "role": role, "exp": exp}, ADMIN_SECRET if admin else USER_SECRET, algorithm="HS256")


def _guard(ok: bool, client: str) -> None:
    now = time.time()
    recent = [t for t in _failures.get(client, []) if now - t < LOCK_SECONDS]
    if len(recent) >= MAX_FAILURES:
        raise HTTPException(429, f"로그인 {MAX_FAILURES}회 실패로 잠겼습니다. 잠시 후 다시 시도하세요.")
    if not ok:
        _failures[client] = recent + [now]
        raise HTTPException(401, "관리자 계정 정보가 올바르지 않습니다.")
    _failures.pop(client, None)


def check_admin_login(email: str, password: str, client: str) -> None:
    """환경 변수 관리자 계정(ADMIN_EMAIL/ADMIN_PASSWORD)과 정확히 일치하는지 검증."""
    expected_email = os.getenv("ADMIN_EMAIL", "")
    expected_password = os.getenv("ADMIN_PASSWORD", "")
    if not expected_email or not expected_password:
        raise HTTPException(503, "관리자 계정(ADMIN_EMAIL/ADMIN_PASSWORD)이 서버에 설정되지 않았습니다.")
    _guard(hmac.compare_digest(email.encode(), expected_email.encode())
           and hmac.compare_digest(password.encode(), expected_password.encode()), client)


def check_admin_password(password: str, client: str) -> None:
    """회원 관리에서 ADMIN으로 지정된 계정: 관리자 비밀번호(ADMIN_PASSWORD)만 검증."""
    expected_password = os.getenv("ADMIN_PASSWORD", "")
    if not expected_password:
        raise HTTPException(503, "관리자 계정(ADMIN_EMAIL/ADMIN_PASSWORD)이 서버에 설정되지 않았습니다.")
    _guard(hmac.compare_digest(password.encode(), expected_password.encode()), client)


def _decode(token: str, secret: str, roles: set[str]):
    try:
        data = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    return data if data.get("role") in roles else None


def require_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer)):
    data = cred and _decode(cred.credentials, USER_SECRET, {"USER"})
    if not data:
        raise HTTPException(401, "로그인이 필요합니다.")
    return data


def require_admin_view(request: Request, cred: HTTPAuthorizationCredentials | None = Depends(bearer)):
    """ADMIN: 전체 CRUD / TEST_ADMIN: 조회(GET)만 허용."""
    if not cred:
        raise HTTPException(401, "관리자 로그인이 필요합니다.")
    data = _decode(cred.credentials, ADMIN_SECRET, {"ADMIN"}) or _decode(cred.credentials, USER_SECRET, {"TEST_ADMIN"})
    if not data:
        raise HTTPException(403, "관리자 권한이 필요합니다.")
    if data["role"] == "TEST_ADMIN" and request.method not in ("GET", "HEAD", "OPTIONS"):
        raise HTTPException(403, "테스트 관리자는 읽기 전용입니다. 데이터 변경이 차단되었습니다.")
    return data
