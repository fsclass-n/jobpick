import os

from sqlalchemy import JSON, String, create_engine, func, inspect, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jobpick.db")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(20), default="USER")  # USER | TEST_ADMIN | ADMIN
    provider: Mapped[str | None] = mapped_column(String(20), nullable=True)
    provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    joined: Mapped[str] = mapped_column(String(10), default="")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(80))
    region: Mapped[str] = mapped_column(String(20), default="서울")
    career: Mapped[str] = mapped_column(String(20), default="신입")
    size: Mapped[str] = mapped_column(String(20), default="중견")
    source: Mapped[str] = mapped_column(String(60), default="")
    deadline: Mapped[str] = mapped_column(String(10), default="")
    skills: Mapped[list] = mapped_column(JSON, default=list)
    values: Mapped[list] = mapped_column(JSON, default=list)
    radar: Mapped[dict] = mapped_column(JSON, default=dict)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def job_out(j: Job) -> dict:
    return {"id": j.id, "company": j.company, "title": j.title, "region": j.region,
            "career": j.career, "size": j.size, "source": j.source, "deadline": j.deadline,
            "skills": list(j.skills or []), "values": list(j.values or []), "radar": dict(j.radar or {})}


def user_out(u: User) -> dict:
    return {"email": u.email, "name": u.name, "role": u.role, "joined": u.joined}


def init_db(seed_jobs: list[dict], seed_users: list[dict]) -> None:
    """테이블 생성 + 스키마 보정 + 시드 upsert.

    기존 DB는 컬럼(deadline/radar)이 없을 수 있어 누락 컬럼만 ALTER로 추가한다.
    시드는 id 기준으로 새 건만 넣고, radar가 비어 있는 구 시드 행만 갱신한다.
    """
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        cols = {c["name"] for c in inspect(conn).get_columns("jobs")}
        if "deadline" not in cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN deadline VARCHAR(10) DEFAULT ''"))
        if "radar" not in cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN radar JSON"))
    with SessionLocal() as db:
        for j in seed_jobs:
            row = db.get(Job, j["id"])
            if row is None:
                db.add(Job(**j))
            elif not row.radar:
                for k, v in j.items():
                    setattr(row, k, v)
        if db.scalar(select(func.count()).select_from(User)) == 0:
            db.add_all(User(**u) for u in seed_users)
        db.commit()
