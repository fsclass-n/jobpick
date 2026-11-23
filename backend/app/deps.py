import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import Role, User
from .security import TOKEN_KINDS, decode_token

bearer = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "로그인이 필요합니다.") -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


def _load_user(db: Session, payload: dict, kind: str) -> User:
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise _unauthorized("사용할 수 없는 계정입니다.")
    if user.role != TOKEN_KINDS[kind]["role"] or payload.get("role") != user.role:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "권한 정보가 변경되었습니다. 다시 로그인해 주세요.")
    return user


def _try_decode(token: str, kinds: list[str]) -> tuple[dict, str] | None:
    for kind in kinds:
        try:
            return decode_token(token, kind), kind
        except (jwt.PyJWTError, RuntimeError):
            continue
    return None


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User:
    """일반 서비스 API: 일반 사용자 토큰 또는 테스트 관리자(샌드박스) 토큰만 허용"""
    if not creds:
        raise _unauthorized()
    decoded = _try_decode(creds.credentials, ["user", "sandbox"])
    if not decoded:
        if _try_decode(creds.credentials, ["admin"]):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "정식 관리자 세션으로는 일반 서비스를 이용할 수 없습니다.")
        raise _unauthorized("인증 정보가 유효하지 않거나 만료되었습니다.")
    payload, kind = decoded
    return _load_user(db, payload, kind)


def require_sandbox_admin(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User:
    if not creds:
        raise _unauthorized()
    decoded = _try_decode(creds.credentials, ["sandbox"])
    if not decoded:
        if _try_decode(creds.credentials, ["user", "admin"]):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "테스트 관리자 전용 샌드박스입니다.")
        raise _unauthorized("인증 정보가 유효하지 않거나 만료되었습니다.")
    return _load_user(db, decoded[0], "sandbox")


def require_admin(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User:
    if not creds:
        raise _unauthorized()
    decoded = _try_decode(creds.credentials, ["admin"])
    if not decoded:
        if _try_decode(creds.credentials, ["user", "sandbox"]):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "정식 관리자 권한이 필요합니다.")
        raise _unauthorized("관리자 인증 정보가 유효하지 않거나 만료되었습니다.")
    user = _load_user(db, decoded[0], "admin")
    if user.role != Role.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "정식 관리자 권한이 필요합니다.")
    return user


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User | None:
    if not creds:
        return None
    decoded = _try_decode(creds.credentials, ["user", "sandbox"])
    if not decoded:
        return None
    user = db.get(User, int(decoded[0]["sub"]))
    return user if user and user.is_active else None
