"""일반 사용자 / 테스트 관리자 인증 (/api/auth)"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import client_ip, get_current_user
from ..models import Role, User
from ..schemas import LoginIn, SignupIn, TokenOut, UserOut
from ..security import hash_password
from ..services.auth_service import authenticate, find_user, issue_token, write_admin_log

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    if find_user(db, body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 가입된 이메일입니다.")
    user = User(email=body.email.lower(), name=body.name.strip(), password_hash=hash_password(body.password),
                role=Role.USER, desired_job=body.desired_job)
    db.add(user)
    db.commit()
    return issue_token(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    """일반 사용자와 테스트 관리자만 로그인 가능. 정식 관리자 계정은 /api/admin/auth/login 전용"""
    user = authenticate(db, body.email, body.password, {Role.USER, Role.TEST_ADMIN})
    if user.role == Role.TEST_ADMIN:
        write_admin_log(db, user, "sandbox:login", "테스트 관리자 샌드박스 로그인", client_ip(request))
    return issue_token(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/test-accounts")
def test_accounts():
    """로그인 페이지 간편 로그인용 테스트 계정 (개발/QA). 정식 관리자 계정은 절대 포함하지 않음"""
    if not settings.enable_test_accounts:
        return {"enabled": False, "accounts": []}
    return {
        "enabled": True,
        "accounts": [
            {"type": "user", "label": "일반 사용자", "email": settings.test_user_email,
             "password": settings.test_user_password},
            {"type": "sandbox", "label": "테스트 관리자", "email": settings.test_admin_email,
             "password": settings.test_admin_password},
        ],
    }
