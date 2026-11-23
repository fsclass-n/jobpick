import os

from sqlalchemy import JSON, String, create_engine, func, select
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
    skills: Mapped[list] = mapped_column(JSON, default=list)
    values: Mapped[list] = mapped_column(JSON, default=list)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def job_out(j: Job) -> dict:
    return {"id": j.id, "company": j.company, "title": j.title, "region": j.region,
            "career": j.career, "size": j.size, "source": j.source,
            "skills": list(j.skills or []), "values": list(j.values or [])}


def user_out(u: User) -> dict:
    return {"email": u.email, "name": u.name, "role": u.role, "joined": u.joined}


def init_db(seed_jobs: list[dict], seed_users: list[dict]) -> None:
    """테이블 생성 후 비어 있으면 시드 데이터 적재."""
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Job)) == 0:
            db.add_all(Job(**j) for j in seed_jobs)
        if db.scalar(select(func.count()).select_from(User)) == 0:
            db.add_all(User(**u) for u in seed_users)
        db.commit()
