import os
import secrets
from collections import Counter
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .data import CUTOFF, PROFILE_SKILLS
from .db import Job, User, get_db, job_out, user_out
from .security import USER_SECRET, check_admin_key, issue, require_admin_view, require_user

auth = APIRouter(prefix="/api/auth", tags=["auth"])
oauth = APIRouter(prefix="/api/auth/oauth", tags=["oauth"])
api = APIRouter(prefix="/api", tags=["journey"], dependencies=[Depends(require_user)])
admin = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin_view)])
admin_auth = APIRouter(prefix="/api/admin", tags=["admin"])


@auth.post("/demo")
def demo_login():
    return {"access_token": issue("USER", "demo"), "role": "USER"}


@auth.post("/test-admin")
def test_admin_login():
    return {"access_token": issue("TEST_ADMIN", "test-admin"), "role": "TEST_ADMIN", "read_only": True}


PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "profile": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "naver": {
        "authorize": "https://nid.naver.com/oauth2.0/authorize",
        "token": "https://nid.naver.com/oauth2.0/token",
        "profile": "https://openapi.naver.com/v1/nid/me",
        "scope": "",
    },
    "kakao": {
        "authorize": "https://kauth.kakao.com/oauth/authorize",
        "token": "https://kauth.kakao.com/oauth/token",
        "profile": "https://kapi.kakao.com/v2/user/me",
        "scope": "profile_nickname account_email",
    },
}
STATE_AUD = "jobpick:oauth-state"
NONCE_COOKIE = "jp_oauth_nonce"


def _credentials(provider: str) -> tuple[str, str]:
    return os.getenv(f"{provider.upper()}_CLIENT_ID", ""), os.getenv(f"{provider.upper()}_CLIENT_SECRET", "")


def _redirect_uri(provider: str) -> str:
    base = os.getenv("OAUTH_REDIRECT_BASE_URL", "http://localhost:8000").rstrip("/")
    return f"{base}/api/auth/oauth/{provider}/callback"


def _front(path: str, **params) -> RedirectResponse:
    base = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return RedirectResponse(f"{base}{path}#{urlencode(params)}", status_code=302)


def _extract_profile(provider: str, data: dict) -> tuple[str, str | None, str]:
    if provider == "google":
        return data["sub"], data.get("email"), data.get("name") or "Google 사용자"
    if provider == "naver":
        info = data.get("response", {})
        return info["id"], info.get("email"), info.get("name") or info.get("nickname") or "네이버 사용자"
    account = data.get("kakao_account", {})
    return str(data["id"]), account.get("email"), account.get("profile", {}).get("nickname") or "카카오 사용자"


@oauth.get("/providers")
def oauth_providers():
    return {name: bool(all(_credentials(name))) for name in PROVIDERS}


@oauth.get("/{provider}/login")
def oauth_login(provider: str):
    if provider not in PROVIDERS:
        raise HTTPException(404, "지원하지 않는 로그인 방식입니다.")
    client_id, client_secret = _credentials(provider)
    if not client_id or not client_secret:
        return _front("/login", error=f"{provider} 로그인이 아직 설정되지 않았습니다.")
    nonce = secrets.token_urlsafe(16)
    state = jwt.encode({"aud": STATE_AUD, "provider": provider, "nonce": nonce,
                        "exp": datetime.now(timezone.utc) + timedelta(minutes=10)},
                       USER_SECRET, algorithm="HS256")
    params = {"response_type": "code", "client_id": client_id,
              "redirect_uri": _redirect_uri(provider), "state": state}
    if PROVIDERS[provider]["scope"]:
        params["scope"] = PROVIDERS[provider]["scope"]
    response = RedirectResponse(f"{PROVIDERS[provider]['authorize']}?{urlencode(params)}")
    response.set_cookie(NONCE_COOKIE, nonce, max_age=600, httponly=True, samesite="lax",
                        secure=os.getenv("OAUTH_REDIRECT_BASE_URL", "").startswith("https"))
    return response


@oauth.get("/{provider}/callback")
def oauth_callback(provider: str, request: Request, code: str = "", state: str = "", error: str = "",
                   db: Session = Depends(get_db)):
    if provider not in PROVIDERS or error or not code:
        return _front("/login", error="소셜 로그인이 취소되었거나 실패했습니다.")
    try:
        claims = jwt.decode(state, USER_SECRET, algorithms=["HS256"], audience=STATE_AUD)
    except jwt.PyJWTError:
        return _front("/login", error="로그인 요청이 만료되었습니다. 다시 시도해 주세요.")
    if claims.get("provider") != provider or claims.get("nonce") != request.cookies.get(NONCE_COOKIE):
        return _front("/login", error="잘못된 로그인 요청입니다.")

    client_id, client_secret = _credentials(provider)
    conf = PROVIDERS[provider]
    try:
        with httpx.Client(timeout=10) as client:
            token_res = client.post(conf["token"], data={
                "grant_type": "authorization_code", "code": code, "client_id": client_id,
                "client_secret": client_secret, "redirect_uri": _redirect_uri(provider), "state": state,
            }, headers={"Accept": "application/json"})
            token_res.raise_for_status()
            access_token = token_res.json()["access_token"]
            profile_res = client.get(conf["profile"], headers={"Authorization": f"Bearer {access_token}"})
            profile_res.raise_for_status()
            provider_id, email, name = _extract_profile(provider, profile_res.json())
    except (httpx.HTTPError, KeyError, ValueError):
        return _front("/login", error="소셜 계정 정보를 가져오지 못했습니다.")

    user = db.scalar(select(User).where(User.provider == provider, User.provider_id == provider_id))
    if not user and email:
        user = db.scalar(select(User).where(User.email == email.lower()))
        if user:
            user.provider, user.provider_id = provider, provider_id
    if not user:
        user = User(email=(email or f"{provider}_{provider_id}@social.jobpick").lower(),
                    name=name, role="USER", provider=provider, provider_id=provider_id,
                    joined=datetime.now(timezone.utc).date().isoformat())
        db.add(user)
        db.commit()

    response = _front("/login", token=issue("USER", user.email), role="USER", provider=provider, name=name)
    response.delete_cookie(NONCE_COOKIE)
    return response


class AdminLogin(BaseModel):
    access_key: str = Field(min_length=1, max_length=256)


@admin_auth.post("/login")
def admin_login(body: AdminLogin, request: Request):
    check_admin_key(body.access_key, request.client.host if request.client else "unknown")
    return {"access_token": issue("ADMIN", "admin"), "role": "ADMIN", "read_only": False}


@admin.get("/me")
def admin_me(me=Depends(require_admin_view)):
    return {"role": me["role"], "read_only": me["role"] == "TEST_ADMIN"}


@admin.get("/stats")
def admin_stats(db: Session = Depends(get_db)):
    return {
        "daily": [112, 128, 97, 143, 151, 138, 160],
        "sources": [{"name": "공공데이터포털", "ok": 482, "fail": 6}, {"name": "서울 열린데이터", "ok": 233, "fail": 11},
                    {"name": "나라일터", "ok": 190, "fail": 2}],
        "analysis": {"total": 1204, "success": 1168},
        "jobs": db.scalar(select(func.count()).select_from(Job)),
        "users": db.scalar(select(func.count()).select_from(User)),
    }


class JobIn(BaseModel):
    company: str = Field(min_length=1, max_length=60)
    title: str = Field(min_length=1, max_length=80)
    region: str = "서울"
    career: str = "신입"
    size: str = "중견"
    source: str = "관리자 등록"
    skills: list[str] = []
    values: list[str] = []


@admin.get("/jobs")
def admin_jobs(db: Session = Depends(get_db)):
    return [job_out(j) for j in db.scalars(select(Job).order_by(Job.id))]


@admin.post("/jobs", status_code=201)
def admin_create_job(body: JobIn, db: Session = Depends(get_db)):
    job = Job(**body.model_dump())
    db.add(job)
    db.commit()
    return job_out(job)


@admin.put("/jobs/{job_id}")
def admin_update_job(job_id: int, body: JobIn, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")
    for key, value in body.model_dump().items():
        setattr(job, key, value)
    db.commit()
    return job_out(job)


@admin.delete("/jobs/{job_id}", status_code=204)
def admin_delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")
    db.delete(job)
    db.commit()


@admin.get("/users")
def admin_users(db: Session = Depends(get_db)):
    return [user_out(u) for u in db.scalars(select(User).order_by(User.id))]


class RoleIn(BaseModel):
    role: str = Field(pattern="^(USER|TEST_ADMIN)$")


@admin.patch("/users/{email}")
def admin_set_role(email: str, body: RoleIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(404, "회원을 찾을 수 없습니다.")
    user.role = body.role
    db.commit()
    return user_out(user)


def fit(job: dict, skills: list[str]) -> int:
    return round(100 * len(set(job["skills"]) & set(skills)) / max(1, len(job["skills"])))


@api.get("/jobs")
def jobs(q: str = "", region: str = "", career: str = "", size: str = "", db: Session = Depends(get_db)):
    def ok(j):
        return (not q or q.lower() in (j["title"] + j["company"] + " ".join(j["skills"])).lower()) and \
            (not region or j["region"] == region) and (not career or j["career"] == career) and (not size or j["size"] == size)
    rows = (job_out(j) for j in db.scalars(select(Job).order_by(Job.id)))
    return [{**j, "fit": fit(j, PROFILE_SKILLS), "distance": CUTOFF - fit(j, PROFILE_SKILLS)} for j in rows if ok(j)]


class GapReq(BaseModel):
    job_ids: list[int] = Field(min_length=1)
    owned: list[str] = PROFILE_SKILLS


@api.post("/gap")
def gap(body: GapReq, db: Session = Depends(get_db)):
    picked = [job_out(j) for j in db.scalars(select(Job).where(Job.id.in_(body.job_ids)))]
    freq = Counter(s for j in picked for s in j["skills"])
    missing = [{"skill": s, "count": c, "of": len(picked)} for s, c in freq.most_common() if s not in body.owned]
    have = sum(c for s, c in freq.items() if s in body.owned)
    return {"coverage": round(100 * have / max(1, sum(freq.values()))), "missing": missing}


class RewriteReq(BaseModel):
    job_id: int
    text: str = Field(min_length=1, max_length=3000)


@api.post("/rewrite")
def rewrite(body: RewriteReq, db: Session = Depends(get_db)):
    job = db.get(Job, body.job_id)
    if not job:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")
    job = job_out(job)
    missing = [k for k in job["skills"] + job["values"] if k not in body.text]
    return {"stub": True, "missing_keywords": missing, "suggestion": None, "note": "Gemini 연동 후 수정 제안이 제공됩니다."}


class AnswerReq(BaseModel):
    answer: str = Field(min_length=1, max_length=3000)
    keywords: list[str] = []


@api.post("/interview/score")
def interview_score(body: AnswerReq):
    hits = sum(k in body.answer for k in body.keywords)
    score = min(100, 20 + hits * 10 + (15 if any(c.isdigit() for c in body.answer) else 0) + min(35, len(body.answer) // 4))
    return {"stub": True, "score": score, "follow_up": score < 70}
