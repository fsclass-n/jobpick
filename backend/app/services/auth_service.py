from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AdminLog, User, utcnow
from ..security import create_token, kind_for_role, verify_password

INVALID_CREDENTIALS = "이메일 또는 비밀번호가 올바르지 않습니다."


def find_user(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


def authenticate(db: Session, email: str, password: str, allowed_roles: set[str]) -> User:
    """권한별 로그인 공통 처리. 허용되지 않은 권한의 계정은 존재 여부를 노출하지 않고 동일한 오류를 반환"""
    user = find_user(db, email)
    now = utcnow()
    if user and user.locked_until and user.locked_until > now:
        minutes = int((user.locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(status.HTTP_423_LOCKED, f"로그인 시도가 많아 계정이 잠겼습니다. {minutes}분 후 다시 시도해 주세요.")
    if not user or user.role not in allowed_roles or not verify_password(password, user.password_hash):
        if user and user.role in allowed_roles:
            user.failed_attempts += 1
            if user.failed_attempts >= settings.login_max_failed:
                user.locked_until = now + timedelta(minutes=settings.login_lock_minutes)
                user.failed_attempts = 0
            db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "비활성화된 계정입니다. 관리자에게 문의해 주세요.")
    user.failed_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    db.commit()
    return user


def issue_token(user: User) -> dict:
    kind = kind_for_role(user.role)
    token, expires_in = create_token(user.id, user.role, kind)
    return {"access_token": token, "session": kind, "expires_in": expires_in, "user": user}


def write_admin_log(db: Session, user: User | None, action: str, detail: str = "", ip: str = "",
                    success: bool = True, email: str = "") -> None:
    db.add(AdminLog(admin_id=user.id if user else None, admin_email=user.email if user else email,
                    action=action, detail=detail[:2000], ip=ip, success=success))
    db.commit()
