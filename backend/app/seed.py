"""초기 데이터 생성 (테스트 계정, 정식 관리자, 수집 대상, 샘플 공고/자소서/분석, 시연용 이력)"""
import logging
import random
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .models import Analysis, CrawlRun, CrawlSource, JobPosting, Resume, ResumeVersion, Role, Scrap, User, utcnow
from .security import hash_password, is_valid_password
from .services.analyzer import analyze_rule_based

logger = logging.getLogger("jobpick.seed")

SAMPLE_RESUME = [
    {
        "question": "1. 지원 동기 및 입사 후 포부를 작성해 주세요. (800자)",
        "answer": (
            "AI 기반 서비스가 실제 사용자 문제를 해결하는 과정에 매력을 느껴 백엔드 개발자를 목표로 해왔습니다. "
            "부트캠프 팀 프로젝트에서 Python 과 FastAPI 로 채용 공고 추천 API 를 개발했고, 조장으로서 4명의 팀원과 "
            "Git 브랜치 전략을 정해 협업했습니다. 당시 응답 속도가 느리다는 문제가 있어 SQL 쿼리를 분석하고 인덱스를 추가해 "
            "평균 응답 시간을 1.2초에서 0.3초로 75% 단축했습니다. 이 경험을 통해 데이터 구조를 이해하는 것이 서비스 품질로 "
            "이어진다는 것을 배웠습니다. 입사 후에는 안정적인 REST API 설계로 서비스 성장에 기여하고 싶습니다."
        ),
    },
    {
        "question": "2. 문제를 해결했던 경험을 구체적으로 기술해 주세요. (1000자)",
        "answer": (
            "졸업 프로젝트에서 웹 크롤링으로 수집한 데이터가 중복과 누락으로 분석에 쓸 수 없는 상황이었습니다. "
            "저는 직접 수집 파이프라인을 다시 설계해 pandas 로 정제 규칙을 만들고, 실패한 요청은 재시도하도록 개선했습니다. "
            "그 결과 데이터 누락률을 18%에서 2%로 줄였고, 팀은 일정 안에 분석 결과를 발표할 수 있었습니다."
        ),
    },
    {
        "question": "3. 본인의 강점과 보완할 점을 작성해 주세요.",
        "answer": "저는 맡은 일을 끝까지 책임지는 성격입니다. 열심히 노력하는 사람이 되겠습니다.",
    },
]

SAMPLE_USERS = [
    ("김하늘", "백엔드"), ("이서준", "데이터"), ("박지민", "프론트엔드"), ("최유나", "마케팅"),
    ("정민호", "AI"), ("강다은", "기획"), ("윤태오", "백엔드"), ("한소희", "디자인"),
]
SANDBOX_USERS = [("샌드박스 사용자 A", "백엔드"), ("샌드박스 사용자 B", "데이터"), ("샌드박스 사용자 C", "마케팅"),
                 ("샌드박스 사용자 D", "AI"), ("샌드박스 사용자 E", "기획")]


def ensure_user(db: Session, email: str, name: str, role: str, password: str | None = None, **extra) -> User:
    user = db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if user:
        return user
    user = User(email=email.lower(), name=name, role=role,
                password_hash=hash_password(password) if password else None, **extra)
    db.add(user)
    db.flush()
    return user


def ensure_admin(db: Session) -> None:
    """정식 관리자 초기 계정: 환경 변수(ADMIN_INITIAL_*)가 있을 때만 생성. 기존 비밀번호는 덮어쓰지 않음"""
    email, password = settings.admin_initial_email, settings.admin_initial_password
    if not (email and password and settings.admin_enabled):
        return
    if not is_valid_password(password):
        logger.error("ADMIN_INITIAL_PASSWORD 가 비밀번호 규칙을 만족하지 않아 정식 관리자를 생성하지 않았습니다.")
        return
    existing = db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if existing and existing.role != Role.ADMIN:
        logger.error("ADMIN_INITIAL_EMAIL 이 이미 일반 계정으로 사용 중입니다.")
        return
    ensure_user(db, email, "jobpick 운영 관리자", Role.ADMIN, password)


def _sources(db: Session) -> list[CrawlSource]:
    sources = [
        CrawlSource(name="샘플 공고 피드 (오프라인)", kind="sample", keywords=[], schedule="매일 09:00", enabled=True),
        CrawlSource(name="고용24 채용정보 Open API", kind="worknet", keywords=["개발", "데이터", "마케팅"],
                    config={"display": 20}, schedule="매일 06:00", enabled=False),
        CrawlSource(name="정적 채용 게시판 (예시 설정)", kind="html", url="https://example.com/jobs",
                    config={"item": "ul.jobs > li", "fields": {"title": ".title", "company": ".company",
                                                               "location": ".location", "link": "a@href"}},
                    schedule="매주 월 10:00", enabled=False),
        CrawlSource(name="샌드박스 샘플 피드", kind="sample", keywords=[], schedule="수동", enabled=True, is_sandbox=True),
    ]
    db.add_all(sources)
    db.flush()
    return sources


def _demo_history(db: Session, sources: list[CrawlSource], users: list[User], sandbox: bool, rng: random.Random) -> None:
    now = utcnow()
    scoped = [s for s in sources if s.is_sandbox == sandbox]
    names = [s.name for s in scoped if s.kind in ("sample", "worknet")]
    for day in range(13, 0, -1):
        for name in names:
            failed = rng.random() < (0.15 if "고용24" in name else 0.05)
            started = now - timedelta(days=day, hours=rng.randint(0, 5))
            collected = 0 if failed else rng.randint(8, 40 if not sandbox else 15)
            db.add(CrawlRun(source_name=name, status="failed" if failed else "success", trigger="seed",
                            collected_count=collected, new_count=collected // rng.randint(2, 5),
                            error="TimeoutError: 시연용 실패 이력" if failed else None, is_sandbox=sandbox,
                            started_at=started, finished_at=started + timedelta(seconds=rng.randint(20, 240))))
    jobs = db.scalars(select(JobPosting).where(JobPosting.is_sandbox.is_(False))).all()
    for day in range(13, 0, -1):
        for _ in range(rng.randint(2, 7 if not sandbox else 3)):
            user, job = rng.choice(users), rng.choice(jobs)
            items = [dict(i) for i in SAMPLE_RESUME[: rng.randint(1, 3)]]
            result = analyze_rule_based({k: getattr(job, k) for k in ("company", "title", "description", "requirements",
                                                                      "preferred", "talent", "keywords")}, items)
            status = rng.choices(["success", "fallback", "failed"], weights=[88, 8, 4])[0]
            db.add(Analysis(user_id=user.id, job_id=job.id, resume_title="시연용 자소서", job_title=job.title,
                            company=job.company, score=result["score"] if status != "failed" else 0,
                            keyword_match_rate=result["keyword_match_rate"], result=result if status != "failed" else {},
                            engine="rule" if status != "success" else rng.choice(["gemini", "rule"]), status=status,
                            duration_ms=rng.randint(40, 2400), is_sandbox=sandbox,
                            created_at=now - timedelta(days=day, minutes=rng.randint(0, 600))))


def seed(db: Session) -> None:
    ensure_admin(db)
    if db.scalar(select(func.count(CrawlSource.id))):
        db.commit()
        return
    logger.info("초기 데이터를 생성합니다.")
    test_user = ensure_user(db, settings.test_user_email, "테스트 사용자", Role.USER, settings.test_user_password,
                            desired_job="백엔드")
    ensure_user(db, settings.test_admin_email, "테스트 관리자", Role.TEST_ADMIN, settings.test_admin_password)
    members = [ensure_user(db, f"member{i + 1}@jobpick.example", name, Role.USER, desired_job=job,
                           created_at=utcnow() - timedelta(days=30 - i * 3)) for i, (name, job) in enumerate(SAMPLE_USERS)]
    dummies = [ensure_user(db, f"dummy{i + 1}@sandbox.jobpick", name, Role.USER, desired_job=job, is_sandbox=True)
               for i, (name, job) in enumerate(SANDBOX_USERS)]
    sources = _sources(db)
    db.commit()

    from rpa.pipeline import run_source  # 순환 import 방지

    for source in sources:
        if source.enabled:
            run_source(source.id, "seed")

    jobs = db.scalars(select(JobPosting).where(JobPosting.is_sandbox.is_(False)).order_by(JobPosting.id)).all()
    if settings.seed_demo_history:
        rng = random.Random(2026)
        _demo_history(db, sources, members, sandbox=False, rng=rng)
        _demo_history(db, sources, dummies, sandbox=True, rng=rng)

    resume = Resume(user_id=test_user.id, title="2026 하반기 백엔드 개발자 자소서", target_job="백엔드",
                    items=[dict(i) for i in SAMPLE_RESUME], version=1)
    resume.versions.append(ResumeVersion(version=1, title=resume.title, items=resume.items))
    db.add(resume)
    db.flush()
    for job in [j for j in jobs if j.job_category == "백엔드"][:3]:
        result = analyze_rule_based({k: getattr(job, k) for k in ("company", "title", "description", "requirements",
                                                                  "preferred", "talent", "keywords")}, resume.items)
        db.add(Analysis(user_id=test_user.id, resume_id=resume.id, job_id=job.id, resume_title=resume.title,
                        resume_version=1, job_title=job.title, company=job.company, score=result["score"],
                        keyword_match_rate=result["keyword_match_rate"], result=result, engine="rule"))
        db.add(Scrap(user_id=test_user.id, job_id=job.id))
    db.commit()


def run_seed() -> None:
    with SessionLocal() as db:
        seed(db)
