import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401 - 테이블 메타데이터 등록
from .config import settings
from .database import Base, engine
from .routers import admin, analyses, auth, jobs, oauth, resumes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.app_env == "production" and settings.user_jwt_secret in ("", "change-me-user-secret"):
        raise RuntimeError("운영 환경에서는 USER_JWT_SECRET 을 반드시 설정해야 합니다.")
    init_db()
    if settings.seed_on_startup:
        from .seed import run_seed

        run_seed()
    else:
        from .seed import ensure_admin
        from .database import SessionLocal

        with SessionLocal() as db:
            ensure_admin(db)
            db.commit()
    yield


app = FastAPI(
    title="jobpick API",
    description="생성형 AI & RPA 기반 맞춤형 커리어 컨설팅 시스템",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (auth.router, oauth.router, jobs.router, resumes.router, analyses.router,
               admin.admin_auth, admin.admin_router, admin.sandbox_router):
    app.include_router(router)


@app.get("/", tags=["health"])
def root():
    return {"service": "jobpick-api", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "env": settings.app_env,
        "ai_engine": "gemini" if settings.gemini_api_key else "rule",
        "admin_login": settings.admin_enabled,
    }
