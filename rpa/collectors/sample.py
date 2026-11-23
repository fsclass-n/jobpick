"""오프라인 샘플 공고 수집기 (데모/샌드박스/테스트용, 실제 사이트에 접속하지 않음)"""
import json
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "sample_jobs.json"


def load_samples() -> list[dict]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def collect(source: dict) -> list[dict]:
    keywords = [k.lower() for k in source.get("keywords") or []]
    limit = int((source.get("config") or {}).get("limit", 100))
    jobs = []
    for job in load_samples():
        text = " ".join([job["title"], job["job_category"], job["description"], *job["requirements"]]).lower()
        if keywords and not any(k in text for k in keywords):
            continue
        jobs.append({**job, "source": "sample"})
    return jobs[:limit]
