import os
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .data import CUTOFF, JOBS, PROFILE_SKILLS
from .security import issue, require_admin, require_user

auth = APIRouter(prefix="/api/auth", tags=["auth"])
api = APIRouter(prefix="/api", tags=["journey"], dependencies=[Depends(require_user)])
admin = APIRouter(prefix="/api/admin", tags=["admin"])


@auth.post("/demo")
def demo_login():
    return {"access_token": issue("USER", "demo"), "role": "USER", "demo": True}


class AdminLogin(BaseModel):
    email: str
    password: str
    totp: str = Field(min_length=6, max_length=6)


@admin.post("/login")
def admin_login(body: AdminLogin):
    if not os.getenv("ADMIN_INITIAL_EMAIL"):
        raise HTTPException(503, "관리자 계정이 아직 초기화되지 않았습니다.")
    raise HTTPException(501, "TOTP 인증 구현 전에는 관리자 로그인을 허용하지 않습니다.")


@admin.get("/me")
def admin_me(me=Depends(require_admin)):
    return {"sub": me["sub"], "role": me["role"]}


def fit(job: dict, skills: list[str]) -> int:
    return round(100 * len(set(job["skills"]) & set(skills)) / len(job["skills"]))


@api.get("/jobs")
def jobs(q: str = "", region: str = "", career: str = "", size: str = ""):
    def ok(j):
        return (not q or q.lower() in (j["title"] + j["company"] + " ".join(j["skills"])).lower()) and \
            (not region or j["region"] == region) and (not career or j["career"] == career) and (not size or j["size"] == size)
    return [{**j, "fit": fit(j, PROFILE_SKILLS), "distance": CUTOFF - fit(j, PROFILE_SKILLS)} for j in JOBS if ok(j)]


class GapReq(BaseModel):
    job_ids: list[int] = Field(min_length=1)
    owned: list[str] = PROFILE_SKILLS


@api.post("/gap")
def gap(body: GapReq):
    picked = [j for j in JOBS if j["id"] in body.job_ids]
    freq = Counter(s for j in picked for s in j["skills"])
    missing = [{"skill": s, "count": c, "of": len(picked)} for s, c in freq.most_common() if s not in body.owned]
    have = sum(c for s, c in freq.items() if s in body.owned)
    return {"coverage": round(100 * have / max(1, sum(freq.values()))), "missing": missing}


class RewriteReq(BaseModel):
    job_id: int
    text: str = Field(min_length=1, max_length=3000)


@api.post("/rewrite")
def rewrite(body: RewriteReq):
    job = next((j for j in JOBS if j["id"] == body.job_id), None)
    if not job:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")
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
