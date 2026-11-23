from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .security import PASSWORD_RULE_MESSAGE, is_valid_password


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1, max_length=128)


class AdminLoginIn(LoginIn):
    otp: str | None = Field(default=None, max_length=10)


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    name: str = Field(min_length=1, max_length=50)
    desired_job: str | None = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str) -> str:
        if not is_valid_password(value):
            raise ValueError(PASSWORD_RULE_MESSAGE)
        return value


class UserOut(ORM):
    id: int
    email: str
    name: str
    role: str
    provider: str
    desired_job: str | None = None
    is_active: bool
    is_sandbox: bool
    last_login_at: datetime | None = None
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    session: Literal["user", "sandbox", "admin"]
    expires_in: int
    user: UserOut


# ---------- Jobs ----------
class JobOut(ORM):
    id: int
    source: str
    company: str
    title: str
    job_category: str
    location: str
    career: str
    company_size: str
    employment_type: str
    salary: str
    description: str
    requirements: list[str]
    preferred: list[str]
    talent: list[str]
    keywords: list[str]
    url: str
    deadline: str
    collected_at: datetime
    is_scrapped: bool = False


class JobPage(BaseModel):
    items: list[JobOut]
    total: int
    page: int
    size: int


class JobFilters(BaseModel):
    categories: list[str]
    locations: list[str]
    careers: list[str]
    company_sizes: list[str]


# ---------- Resumes ----------
class ResumeItem(BaseModel):
    question: str = Field(max_length=500)
    answer: str = Field(default="", max_length=5000)


class ResumeIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    target_job: str = Field(default="", max_length=100)
    items: list[ResumeItem] = Field(min_length=1, max_length=20)


class ResumeVersionOut(ORM):
    version: int
    title: str
    items: list[ResumeItem]
    created_at: datetime


class ResumeOut(ORM):
    id: int
    title: str
    target_job: str
    items: list[ResumeItem]
    source_type: str
    version: int
    created_at: datetime
    updated_at: datetime


class ResumeDetail(ResumeOut):
    versions: list[ResumeVersionOut] = []


class OcrOut(BaseModel):
    text: str
    items: list[ResumeItem]
    engine: str
    pages: int = 1
    file_token: str | None = None


# ---------- Analysis ----------
class AnalysisIn(BaseModel):
    resume_id: int
    job_id: int


class AnalysisOut(ORM):
    id: int
    resume_id: int | None
    job_id: int | None
    resume_title: str
    resume_version: int
    job_title: str
    company: str
    score: float
    keyword_match_rate: float
    result: dict
    engine: str
    status: str
    error: str | None = None
    created_at: datetime


class AnalysisSummary(ORM):
    id: int
    resume_id: int | None
    job_id: int | None
    resume_title: str
    resume_version: int
    job_title: str
    company: str
    score: float
    keyword_match_rate: float
    engine: str
    status: str
    created_at: datetime


class DashboardOut(BaseModel):
    resume_count: int
    analysis_count: int
    scrap_count: int
    average_score: float
    best_score: float
    recent_analyses: list[AnalysisSummary]
    scrapped_jobs: list[JobOut]
    score_trend: list[dict]


# ---------- Admin ----------
class RoleChangeIn(BaseModel):
    role: Literal["USER", "TEST_ADMIN"]


class ActiveChangeIn(BaseModel):
    is_active: bool


class UserPage(BaseModel):
    items: list[UserOut]
    total: int


class CrawlSourceIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: Literal["sample", "worknet", "html", "playwright"]
    url: str = Field(default="", max_length=500)
    keywords: list[str] = Field(default_factory=list, max_length=30)
    config: dict = Field(default_factory=dict)
    schedule: str = Field(default="매일 09:00", max_length=50)
    enabled: bool = True


class CrawlSourceOut(ORM):
    id: int
    name: str
    kind: str
    url: str
    keywords: list[str]
    config: dict
    schedule: str
    enabled: bool
    created_at: datetime


class CrawlRunOut(ORM):
    id: int
    source_id: int | None
    source_name: str
    status: str
    trigger: str
    collected_count: int
    new_count: int
    error: str | None
    started_at: datetime
    finished_at: datetime | None


class AdminLogOut(ORM):
    id: int
    admin_email: str
    action: str
    detail: str
    ip: str
    success: bool
    created_at: datetime


class StatsOut(BaseModel):
    scope: Literal["production", "sandbox"]
    totals: dict
    daily_collection: list[dict]
    source_stats: list[dict]
    analysis_daily: list[dict]
    analysis_engine: list[dict]
    score_distribution: list[dict]
    category_stats: list[dict]
