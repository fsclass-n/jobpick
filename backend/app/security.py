import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)

USER_SECRET = os.getenv("USER_JWT_SECRET") or secrets.token_urlsafe(48)
ADMIN_SECRET = os.getenv("ADMIN_JWT_SECRET") or secrets.token_urlsafe(48)
if USER_SECRET == ADMIN_SECRET:
    raise RuntimeError("USER_JWT_SECRET and ADMIN_JWT_SECRET must differ")


def issue(role: str, sub: str) -> str:
    admin = role == "ADMIN"
    minutes = int(os.getenv("ADMIN_JWT_EXPIRE_MINUTES", "30") if admin else os.getenv("USER_JWT_EXPIRE_MINUTES", "120"))
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode({"sub": sub, "role": role, "exp": exp}, ADMIN_SECRET if admin else USER_SECRET, algorithm="HS256")


def _decode(token: str, secret: str, role: str):
    try:
        data = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    return data if data.get("role") == role else None


def require_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer)):
    data = cred and _decode(cred.credentials, USER_SECRET, "USER")
    if not data:
        raise HTTPException(401, "로그인이 필요합니다.")
    return data


def require_admin(cred: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not cred:
        raise HTTPException(401, "관리자 로그인이 필요합니다.")
    data = _decode(cred.credentials, ADMIN_SECRET, "ADMIN")
    if not data:
        raise HTTPException(403, "정식 관리자 권한이 필요합니다.")
    return data
