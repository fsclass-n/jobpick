"""관리자 API

- 정식 관리자:   /api/admin/**          (관리자 전용 토큰, 운영 데이터)
- 테스트 관리자: /api/sandbox/admin/**  (샌드박스 토큰, 샌드박스 데이터만)

두 영역은 같은 화면/기능을 제공하되, 인증 의존성과 데이터 범위(is_sandbox)가 완전히 분리됩니다.
"""
from collections.abc import Callable

import pyotp
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from rpa.pipeline import run_source

from ..config import settings
from ..database import get_db
from ..deps import client_ip, require_admin, require_sandbox_admin
from ..models import AdminLog, CrawlRun, CrawlSource, Role, User
from ..schemas import (ActiveChangeIn, AdminLoginIn, AdminLogOut, CrawlRunOut, CrawlSourceIn, CrawlSourceOut,
                       RoleChangeIn, StatsOut, TokenOut, UserOut, UserPage)
from ..services.auth_service import authenticate, issue_token, write_admin_log
from ..services.stats import build_stats

# ---------------------------------------------------------------------------
# 정식 관리자 인증 (/api/admin/auth)
# ---------------------------------------------------------------------------
admin_auth = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])


@admin_auth.post("/login", response_model=TokenOut)
def admin_login(body: AdminLoginIn, request: Request, db: Session = Depends(get_db)):
    if not settings.admin_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "정식 관리자 로그인이 설정되지 않았습니다.")
    ip = client_ip(request)
    try:
        user = authenticate(db, body.email, body.password, {Role.ADMIN})
    except HTTPException:
        write_admin_log(db, None, "admin:login", "로그인 실패", ip, success=False, email=body.email)
        raise
    if settings.admin_totp_secret and not pyotp.TOTP(settings.admin_totp_secret).verify(body.otp or "", valid_window=1):
        write_admin_log(db, user, "admin:login", "2단계 인증 실패", ip, success=False)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "2단계 인증 코드가 올바르지 않습니다.")
    write_admin_log(db, user, "admin:login", "정식 관리자 로그인", ip)
    return issue_token(user)


@admin_auth.get("/config")
def admin_auth_config():
    return {"enabled": settings.admin_enabled, "otp_required": bool(settings.admin_totp_secret),
            "session_minutes": settings.admin_token_expire_minutes}


@admin_auth.get("/me", response_model=UserOut)
def admin_me(user: User = Depends(require_admin)):
    return user


@admin_auth.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def admin_logout(request: Request, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    write_admin_log(db, user, "admin:logout", "정식 관리자 로그아웃", client_ip(request))


# ---------------------------------------------------------------------------
# 관리자 기능 라우터 팩토리
# ---------------------------------------------------------------------------
def build_admin_router(prefix: str, guard: Callable, sandbox: bool) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=["sandbox-admin" if sandbox else "admin"])
    scope = "sandbox" if sandbox else "admin"

    def log(db: Session, admin: User, action: str, detail: str, request: Request) -> None:
        write_admin_log(db, admin, f"{scope}:{action}", detail, client_ip(request))

    def get_scoped_user(db: Session, user_id: int) -> User:
        user = db.get(User, user_id)
        if not user or user.is_sandbox != sandbox:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "회원을 찾을 수 없습니다.")
        return user

    def get_scoped_source(db: Session, source_id: int) -> CrawlSource:
        source = db.get(CrawlSource, source_id)
        if not source or source.is_sandbox != sandbox:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "수집 대상을 찾을 수 없습니다.")
        return source

    @router.get("/stats", response_model=StatsOut)
    def stats(days: int = Query(14, ge=7, le=60), db: Session = Depends(get_db), _: User = Depends(guard)):
        return build_stats(db, sandbox, days)

    @router.get("/users", response_model=UserPage)
    def list_users(q: str = "", role: str = "", page: int = Query(1, ge=1), size: int = Query(20, le=100),
                   db: Session = Depends(get_db), _: User = Depends(guard)):
        stmt = select(User).where(User.is_sandbox.is_(sandbox))
        if q:
            stmt = stmt.where(or_(User.email.ilike(f"%{q}%"), User.name.ilike(f"%{q}%")))
        if role:
            stmt = stmt.where(User.role == role)
        total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = db.scalars(stmt.order_by(User.created_at.desc(), User.id.desc()).offset((page - 1) * size).limit(size)).all()
        return UserPage(items=items, total=total)

    @router.patch("/users/{user_id}/role", response_model=UserOut)
    def change_role(user_id: int, body: RoleChangeIn, request: Request, db: Session = Depends(get_db),
                    admin: User = Depends(guard)):
        target = get_scoped_user(db, user_id)
        if target.id == admin.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "본인 계정의 권한은 변경할 수 없습니다.")
        if target.role == Role.ADMIN:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "정식 관리자 권한은 서버 스크립트로만 변경할 수 있습니다.")
        before = target.role
        target.role = body.role
        db.commit()
        log(db, admin, "role_change", f"{target.email}: {before} -> {body.role}", request)
        return target

    @router.patch("/users/{user_id}/active", response_model=UserOut)
    def change_active(user_id: int, body: ActiveChangeIn, request: Request, db: Session = Depends(get_db),
                      admin: User = Depends(guard)):
        target = get_scoped_user(db, user_id)
        if target.id == admin.id or target.role == Role.ADMIN:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "해당 계정의 상태는 변경할 수 없습니다.")
        target.is_active = body.is_active
        db.commit()
        log(db, admin, "active_change", f"{target.email}: {'활성' if body.is_active else '비활성'}", request)
        return target

    @router.get("/crawl/sources", response_model=list[CrawlSourceOut])
    def list_sources(db: Session = Depends(get_db), _: User = Depends(guard)):
        return db.scalars(select(CrawlSource).where(CrawlSource.is_sandbox.is_(sandbox)).order_by(CrawlSource.id)).all()

    def validate_source(body: CrawlSourceIn) -> None:
        if sandbox and body.kind != "sample":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "샌드박스에서는 샘플(오프라인) 수집기만 사용할 수 있습니다.")
        if body.kind in ("html", "playwright") and (not body.url.startswith(("http://", "https://")) or "item" not in body.config):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "HTML/Playwright 수집기는 URL 과 config.item 선택자가 필요합니다.")

    @router.post("/crawl/sources", response_model=CrawlSourceOut, status_code=status.HTTP_201_CREATED)
    def create_source(body: CrawlSourceIn, request: Request, db: Session = Depends(get_db), admin: User = Depends(guard)):
        validate_source(body)
        source = CrawlSource(**body.model_dump(), is_sandbox=sandbox)
        db.add(source)
        db.commit()
        log(db, admin, "crawl_source_create", f"{source.name} ({source.kind})", request)
        return source

    @router.put("/crawl/sources/{source_id}", response_model=CrawlSourceOut)
    def update_source(source_id: int, body: CrawlSourceIn, request: Request, db: Session = Depends(get_db),
                      admin: User = Depends(guard)):
        validate_source(body)
        source = get_scoped_source(db, source_id)
        for key, value in body.model_dump().items():
            setattr(source, key, value)
        db.commit()
        log(db, admin, "crawl_source_update", f"{source.name}: 스케줄={source.schedule}, 활성={source.enabled}", request)
        return source

    @router.delete("/crawl/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_source(source_id: int, request: Request, db: Session = Depends(get_db), admin: User = Depends(guard)):
        source = get_scoped_source(db, source_id)
        db.delete(source)
        db.commit()
        log(db, admin, "crawl_source_delete", source.name, request)

    @router.post("/crawl/sources/{source_id}/run", status_code=status.HTTP_202_ACCEPTED)
    def run_now(source_id: int, request: Request, tasks: BackgroundTasks, db: Session = Depends(get_db),
                admin: User = Depends(guard)):
        source = get_scoped_source(db, source_id)
        running = db.scalar(select(CrawlRun).where(CrawlRun.source_id == source.id, CrawlRun.status == "running"))
        if running:
            raise HTTPException(status.HTTP_409_CONFLICT, "이미 수집이 진행 중입니다.")
        tasks.add_task(run_source, source.id, "manual")
        log(db, admin, "crawl_run", f"{source.name} 수동 실행", request)
        return {"message": f"'{source.name}' 수집을 시작했습니다."}

    @router.get("/crawl/runs", response_model=list[CrawlRunOut])
    def list_runs(limit: int = Query(30, le=200), db: Session = Depends(get_db), _: User = Depends(guard)):
        return db.scalars(select(CrawlRun).where(CrawlRun.is_sandbox.is_(sandbox))
                          .order_by(CrawlRun.started_at.desc(), CrawlRun.id.desc()).limit(limit)).all()

    if not sandbox:
        @router.get("/logs", response_model=list[AdminLogOut])
        def list_logs(action: str = "", limit: int = Query(100, le=500), db: Session = Depends(get_db),
                      _: User = Depends(guard)):
            stmt = select(AdminLog)
            if action:
                stmt = stmt.where(AdminLog.action.ilike(f"%{action}%"))
            return db.scalars(stmt.order_by(AdminLog.created_at.desc(), AdminLog.id.desc()).limit(limit)).all()

    return router


admin_router = build_admin_router("/api/admin", require_admin, sandbox=False)
sandbox_router = build_admin_router("/api/sandbox/admin", require_sandbox_admin, sandbox=True)
