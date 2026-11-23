"""채용 공고 탐색 / 스크랩 (/api/jobs)"""
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, get_optional_user
from ..models import JobPosting, Scrap, User
from ..schemas import JobFilters, JobOut, JobPage

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
PUBLIC = JobPosting.is_sandbox.is_(False)


def to_out(job: JobPosting, scrapped: set[int]) -> JobOut:
    out = JobOut.model_validate(job)
    out.is_scrapped = job.id in scrapped
    return out


def scrapped_ids(db: Session, user: User | None) -> set[int]:
    if not user:
        return set()
    return set(db.scalars(select(Scrap.job_id).where(Scrap.user_id == user.id)))


@router.get("", response_model=JobPage)
def list_jobs(
    q: str = "", category: str = "", location: str = "", career: str = "", company_size: str = "",
    sort: str = Query("latest", pattern="^(latest|deadline)$"),
    page: int = Query(1, ge=1), size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db), user: User | None = Depends(get_optional_user),
):
    stmt = select(JobPosting).where(PUBLIC)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(JobPosting.title.ilike(like), JobPosting.company.ilike(like),
                              JobPosting.description.ilike(like)))
    for column, value in ((JobPosting.job_category, category), (JobPosting.career, career),
                          (JobPosting.company_size, company_size)):
        if value:
            stmt = stmt.where(column == value)
    if location:
        stmt = stmt.where(JobPosting.location.ilike(f"{location}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = JobPosting.deadline.asc() if sort == "deadline" else JobPosting.collected_at.desc()
    jobs = db.scalars(stmt.order_by(order, JobPosting.id.desc()).offset((page - 1) * size).limit(size)).all()
    ids = scrapped_ids(db, user)
    return JobPage(items=[to_out(j, ids) for j in jobs], total=total, page=page, size=size)


@router.get("/filters", response_model=JobFilters)
def filters(db: Session = Depends(get_db)):
    def distinct(column):
        return sorted(v for v in db.scalars(select(column).where(PUBLIC).distinct()) if v)

    locations = sorted({loc.split()[0] for loc in distinct(JobPosting.location)})
    return JobFilters(categories=distinct(JobPosting.job_category), locations=locations,
                      careers=distinct(JobPosting.career), company_sizes=distinct(JobPosting.company_size))


@router.get("/keywords/popular")
def popular_keywords(limit: int = Query(12, ge=1, le=30), db: Session = Depends(get_db)):
    counter: Counter = Counter()
    by_category: dict[str, Counter] = {}
    for category, keywords in db.execute(select(JobPosting.job_category, JobPosting.keywords).where(PUBLIC)):
        counter.update(keywords or [])
        by_category.setdefault(category, Counter()).update(keywords or [])
    return {
        "overall": [{"keyword": k, "count": c} for k, c in counter.most_common(limit)],
        "by_category": {cat: [k for k, _ in c.most_common(5)] for cat, c in sorted(by_category.items())},
    }


@router.get("/scraps/me", response_model=list[JobOut])
def my_scraps(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    jobs = db.scalars(select(JobPosting).join(Scrap, Scrap.job_id == JobPosting.id)
                      .where(Scrap.user_id == user.id).order_by(Scrap.created_at.desc())).all()
    return [to_out(j, {j.id for j in jobs}) for j in jobs]


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    job = db.get(JobPosting, job_id)
    if not job or job.is_sandbox:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "공고를 찾을 수 없습니다.")
    return to_out(job, scrapped_ids(db, user))


@router.post("/{job_id}/scrap", status_code=status.HTTP_204_NO_CONTENT)
def add_scrap(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = db.get(JobPosting, job_id)
    if not job or job.is_sandbox:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "공고를 찾을 수 없습니다.")
    if not db.scalar(select(Scrap).where(Scrap.user_id == user.id, Scrap.job_id == job_id)):
        db.add(Scrap(user_id=user.id, job_id=job_id))
        db.commit()


@router.delete("/{job_id}/scrap", status_code=status.HTTP_204_NO_CONTENT)
def remove_scrap(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.execute(delete(Scrap).where(Scrap.user_id == user.id, Scrap.job_id == job_id))
    db.commit()
