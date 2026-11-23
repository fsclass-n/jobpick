"""수집 파이프라인: 수집기 실행 -> 정형화 -> DB 적재(upsert) -> 실행 이력 기록"""
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import CrawlRun, CrawlSource, JobPosting, utcnow

from .collectors import COLLECTORS
from .normalizer import normalize

logger = logging.getLogger("jobpick.rpa")


def source_to_dict(source: CrawlSource) -> dict:
    return {"id": source.id, "name": source.name, "kind": source.kind, "url": source.url,
            "keywords": source.keywords or [], "config": source.config or {}}


def upsert_jobs(db: Session, jobs: list[dict]) -> int:
    new_count = 0
    for job in jobs:
        existing = db.scalar(select(JobPosting).where(
            JobPosting.source == job["source"], JobPosting.external_id == job["external_id"]))
        if existing:
            for key, value in job.items():
                setattr(existing, key, value)
            existing.collected_at = utcnow()
        else:
            db.add(JobPosting(**job))
            new_count += 1
    return new_count


def run_source(source_id: int, trigger: str = "manual") -> CrawlRun:
    with SessionLocal() as db:
        source = db.get(CrawlSource, source_id)
        if not source:
            raise ValueError(f"수집 대상 {source_id} 이(가) 없습니다.")
        run = CrawlRun(source_id=source.id, source_name=source.name, trigger=trigger, is_sandbox=source.is_sandbox)
        db.add(run)
        db.commit()
        try:
            collector = COLLECTORS[source.kind]
            raw_jobs = collector(source_to_dict(source))
            jobs = [normalize(raw, source.is_sandbox) for raw in raw_jobs]
            jobs = [j for j in jobs if j["title"] and j["company"]]
            run.new_count = upsert_jobs(db, jobs)
            run.collected_count = len(jobs)
            run.status = "success"
        except Exception as exc:  # noqa: BLE001 - 실패 내역을 이력에 남김
            db.rollback()
            logger.exception("수집 실패: %s", source.name)
            run.status = "failed"
            run.error = f"{type(exc).__name__}: {exc}"[:1000]
        run.finished_at = utcnow()
        db.add(run)
        db.commit()
        db.refresh(run)
        return run


def run_enabled(is_sandbox: bool = False, trigger: str = "schedule") -> list[CrawlRun]:
    with SessionLocal() as db:
        ids = db.scalars(select(CrawlSource.id).where(
            CrawlSource.enabled.is_(True), CrawlSource.is_sandbox.is_(is_sandbox))).all()
    return [run_source(i, trigger) for i in ids]
