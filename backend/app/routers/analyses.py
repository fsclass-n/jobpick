"""AI 분석 리포트 / 분석 이력 / 대시보드 (/api/analyses, /api/dashboard)"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Analysis, JobPosting, Resume, Role, Scrap, User
from ..schemas import AnalysisIn, AnalysisOut, AnalysisSummary, DashboardOut, JobOut
from ..services.analyzer import analyze

router = APIRouter(tags=["analyses"])


def in_sandbox(user: User) -> bool:
    """테스트 관리자의 활동은 운영 통계와 섞이지 않도록 샌드박스 데이터로 기록"""
    return user.is_sandbox or user.role == Role.TEST_ADMIN


def job_to_dict(job: JobPosting) -> dict:
    return {k: getattr(job, k) for k in ("company", "title", "description", "requirements", "preferred",
                                          "talent", "keywords", "job_category")}


def run_analysis(db: Session, user: User, resume: Resume, job: JobPosting) -> Analysis:
    outcome = analyze(job_to_dict(job), resume.items)
    analysis = Analysis(
        user_id=user.id, resume_id=resume.id, job_id=job.id, resume_title=resume.title,
        resume_version=resume.version, job_title=job.title, company=job.company, score=outcome.score,
        keyword_match_rate=outcome.keyword_match_rate, result=outcome.result, engine=outcome.engine,
        status=outcome.status, error=outcome.error, duration_ms=outcome.duration_ms, is_sandbox=in_sandbox(user),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.post("/api/analyses", response_model=AnalysisOut, status_code=status.HTTP_201_CREATED)
def create_analysis(body: AnalysisIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    resume = db.get(Resume, body.resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "자소서를 찾을 수 없습니다.")
    job = db.get(JobPosting, body.job_id)
    if not job or job.is_sandbox:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "공고를 찾을 수 없습니다.")
    if not any(i.get("answer", "").strip() for i in resume.items):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "답변이 작성된 문항이 없습니다.")
    try:
        return run_analysis(db, user, resume, job)
    except Exception as exc:  # noqa: BLE001 - 실패도 이력으로 남겨 관리자 성공률 통계에 반영
        db.rollback()
        db.add(Analysis(user_id=user.id, resume_id=resume.id, job_id=job.id, resume_title=resume.title,
                        job_title=job.title, company=job.company, status="failed", error=str(exc)[:1000],
                        is_sandbox=in_sandbox(user)))
        db.commit()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "분석 중 오류가 발생했습니다.") from exc


@router.get("/api/analyses", response_model=list[AnalysisSummary])
def list_analyses(resume_id: int | None = None, job_id: int | None = None, limit: int = Query(50, le=200),
                  db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Analysis).where(Analysis.user_id == user.id, Analysis.status != "failed")
    if resume_id:
        stmt = stmt.where(Analysis.resume_id == resume_id)
    if job_id:
        stmt = stmt.where(Analysis.job_id == job_id)
    return db.scalars(stmt.order_by(Analysis.created_at.desc(), Analysis.id.desc()).limit(limit)).all()


@router.get("/api/analyses/{analysis_id}", response_model=AnalysisOut)
def get_analysis(analysis_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    analysis = db.get(Analysis, analysis_id)
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "분석 결과를 찾을 수 없습니다.")
    return analysis


@router.delete("/api/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(analysis_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    analysis = get_analysis(analysis_id, db, user)
    db.delete(analysis)
    db.commit()


@router.get("/api/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    done = select(Analysis).where(Analysis.user_id == user.id, Analysis.status != "failed")
    analyses = db.scalars(done.order_by(Analysis.created_at.asc(), Analysis.id.asc())).all()
    scores = [a.score for a in analyses]
    scrapped = db.scalars(select(JobPosting).join(Scrap, Scrap.job_id == JobPosting.id)
                          .where(Scrap.user_id == user.id).order_by(Scrap.created_at.desc()).limit(4)).all()
    jobs_out = [JobOut.model_validate(j).model_copy(update={"is_scrapped": True}) for j in scrapped]
    return DashboardOut(
        resume_count=db.scalar(select(func.count(Resume.id)).where(Resume.user_id == user.id)) or 0,
        analysis_count=len(analyses),
        scrap_count=db.scalar(select(func.count(Scrap.id)).where(Scrap.user_id == user.id)) or 0,
        average_score=round(sum(scores) / len(scores), 1) if scores else 0,
        best_score=max(scores, default=0),
        recent_analyses=list(reversed(analyses[-5:])),
        scrapped_jobs=jobs_out,
        score_trend=[{"id": a.id, "date": a.created_at.strftime("%m/%d"), "score": a.score,
                      "label": f"{a.company} · v{a.resume_version}"} for a in analyses[-10:]],
    )
