"""관리자 모니터링 통계 (pandas / numpy 집계)"""
from datetime import timedelta

import numpy as np
import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Analysis, CrawlRun, JobPosting, User, utcnow


def _days(days: int) -> pd.DatetimeIndex:
    end = pd.Timestamp(utcnow().date())
    return pd.date_range(end - pd.Timedelta(days=days - 1), end, freq="D")


def _frame(db: Session, stmt) -> pd.DataFrame:
    rows = db.execute(stmt).mappings().all()
    return pd.DataFrame([dict(r) for r in rows])


def build_stats(db: Session, sandbox: bool, days: int = 14) -> dict:
    since = utcnow() - timedelta(days=days)
    index = _days(days)
    labels = [d.strftime("%m/%d") for d in index]

    runs = _frame(db, select(CrawlRun.source_name, CrawlRun.status, CrawlRun.collected_count, CrawlRun.new_count,
                             CrawlRun.started_at).where(CrawlRun.is_sandbox.is_(sandbox), CrawlRun.started_at >= since))
    analyses = _frame(db, select(Analysis.status, Analysis.engine, Analysis.score, Analysis.duration_ms,
                                 Analysis.created_at).where(Analysis.is_sandbox.is_(sandbox), Analysis.created_at >= since))
    jobs = _frame(db, select(JobPosting.job_category).where(JobPosting.is_sandbox.is_(sandbox)))

    daily_collection = [{"date": l, "collected": 0, "new": 0, "success": 0, "failed": 0} for l in labels]
    source_stats: list[dict] = []
    if not runs.empty:
        runs["day"] = pd.to_datetime(runs["started_at"]).dt.normalize()
        runs["success"] = (runs["status"] == "success").astype(int)
        runs["failed"] = (runs["status"] == "failed").astype(int)
        daily = runs.groupby("day")[["collected_count", "new_count", "success", "failed"]].sum().reindex(index, fill_value=0)
        daily_collection = [{"date": l, "collected": int(r.collected_count), "new": int(r.new_count),
                             "success": int(r.success), "failed": int(r.failed)} for l, r in zip(labels, daily.itertuples())]
        grouped = runs.groupby("source_name").agg(runs=("status", "size"), success=("success", "sum"),
                                                  failed=("failed", "sum"), collected=("collected_count", "sum"))
        source_stats = [{"source": name, "runs": int(r.runs), "success": int(r.success), "failed": int(r.failed),
                         "collected": int(r.collected), "success_rate": round(100 * r.success / r.runs, 1)}
                        for name, r in grouped.sort_values("collected", ascending=False).iterrows()]

    analysis_daily = [{"date": l, "total": 0, "success": 0, "fallback": 0, "failed": 0} for l in labels]
    engine_stats: list[dict] = []
    distribution = [{"range": f"{b}-{b + 19 if b < 80 else 100}", "count": 0} for b in range(0, 100, 20)]
    success_rate, avg_score, avg_ms = 0.0, 0.0, 0
    if not analyses.empty:
        analyses["day"] = pd.to_datetime(analyses["created_at"]).dt.normalize()
        pivot = (analyses.pivot_table(index="day", columns="status", values="score", aggfunc="size", fill_value=0)
                 .reindex(index, fill_value=0))
        for status in ("success", "fallback", "failed"):
            if status not in pivot:
                pivot[status] = 0
        analysis_daily = [{"date": l, "total": int(r.success + r.fallback + r.failed), "success": int(r.success),
                           "fallback": int(r.fallback), "failed": int(r.failed)}
                          for l, r in zip(labels, pivot.itertuples())]
        ok = analyses[analyses["status"] != "failed"]
        success_rate = round(100 * len(ok) / len(analyses), 1)
        avg_score = round(float(ok["score"].mean()), 1) if not ok.empty else 0.0
        avg_ms = int(ok["duration_ms"].mean()) if not ok.empty else 0
        engine_stats = [{"engine": e, "count": int(c)} for e, c in analyses["engine"].value_counts().items()]
        if not ok.empty:
            counts, _ = np.histogram(ok["score"].clip(0, 100), bins=[0, 20, 40, 60, 80, 100.01])
            for bucket, count in zip(distribution, counts):
                bucket["count"] = int(count)

    category_stats = []
    if not jobs.empty:
        category_stats = [{"category": c, "count": int(n)} for c, n in jobs["job_category"].value_counts().items()]

    users_total = db.scalar(select(func.count(User.id)).where(User.is_sandbox.is_(sandbox))) or 0
    total_runs = len(runs)
    crawl_success = round(100 * runs["success"].sum() / total_runs, 1) if total_runs else 0.0
    return {
        "scope": "sandbox" if sandbox else "production",
        "totals": {
            "users": users_total,
            "jobs": len(jobs),
            "collected_period": int(runs["collected_count"].sum()) if total_runs else 0,
            "crawl_runs": total_runs,
            "crawl_success_rate": float(crawl_success),
            "analyses": len(analyses),
            "analysis_success_rate": success_rate,
            "average_score": avg_score,
            "average_duration_ms": avg_ms,
        },
        "daily_collection": daily_collection,
        "source_stats": source_stats,
        "analysis_daily": analysis_daily,
        "analysis_engine": engine_stats,
        "score_distribution": distribution,
        "category_stats": category_stats,
    }
