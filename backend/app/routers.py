from collections import Counter
from itertools import count

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .data import CUTOFF, JOBS, PROFILE_SKILLS, USERS
from .security import check_admin_key, issue, require_admin_view, require_user

auth = APIRouter(prefix="/api/auth", tags=["auth"])
api = APIRouter(prefix="/api", tags=["journey"], dependencies=[Depends(require_user)])
admin = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin_view)])
admin_auth = APIRouter(prefix="/api/admin", tags=["admin"])

_ids = count(max(j["id"] for j in JOBS) + 1)


@auth.post("/demo")
def demo_login():
    return {"access_token": issue("USER", "demo"), "role": "USER"}


@auth.post("/test-admin")
def test_admin_login():
    return {"access_token": issue("TEST_ADMIN", "test-admin"), "role": "TEST_ADMIN", "read_only": True}


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
def admin_stats():
    return {
        "daily": [112, 128, 97, 143, 151, 138, 160],
        "sources": [{"name": "공공데이터포털", "ok": 482, "fail": 6}, {"name": "서울 열린데이터", "ok": 233, "fail": 11},
                    {"name": "나라일터", "ok": 190, "fail": 2}],
        "analysis": {"total": 1204, "success": 1168},
        "jobs": len(JOBS), "users": len(USERS),
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
def admin_jobs():
    return JOBS


@admin.post("/jobs", status_code=201)
def admin_create_job(body: JobIn):
    job = {"id": next(_ids), **body.model_dump()}
    JOBS.append(job)
    return job


@admin.put("/jobs/{job_id}")
def admin_update_job(job_id: int, body: JobIn):
    job = next((j for j in JOBS if j["id"] == job_id), None)
    if not job:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")
    job.update(body.model_dump())
    return job


@admin.delete("/jobs/{job_id}", status_code=204)
def admin_delete_job(job_id: int):
    before = len(JOBS)
    JOBS[:] = [j for j in JOBS if j["id"] != job_id]
    if len(JOBS) == before:
        raise HTTPException(404, "공고를 찾을 수 없습니다.")


@admin.get("/users")
def admin_users():
    return USERS


class RoleIn(BaseModel):
    role: str = Field(pattern="^(USER|TEST_ADMIN)$")


@admin.patch("/users/{email}")
def admin_set_role(email: str, body: RoleIn):
    user = next((u for u in USERS if u["email"] == email), None)
    if not user:
        raise HTTPException(404, "회원을 찾을 수 없습니다.")
    user["role"] = body.role
    return user


def fit(job: dict, skills: list[str]) -> int:
    return round(100 * len(set(job["skills"]) & set(skills)) / max(1, len(job["skills"])))


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
