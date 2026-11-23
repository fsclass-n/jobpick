"""RPA 실행 진입점

사용 예:
  python -m rpa.run --all              # 활성화된 운영 수집 대상 전체 실행 (스케줄러/cron 에서 호출)
  python -m rpa.run --source-id 1      # 특정 수집 대상만 실행
  python -m rpa.run --list             # 수집 대상 목록
  python -m rpa.run --ocr resume.pdf   # 파일에서 자소서 텍스트 추출
"""
import argparse
import logging
import sys
from pathlib import Path

from sqlalchemy import select

from backend.app.database import SessionLocal
from backend.app.main import init_db
from backend.app.models import CrawlSource

from .ocr import extract_text
from .pipeline import run_enabled, run_source

CONTENT_TYPES = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
                 ".jpeg": "image/jpeg", ".webp": "image/webp", ".txt": "text/plain"}


def main() -> int:
    parser = argparse.ArgumentParser(description="jobpick RPA 채용 공고 수집기")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="활성화된 운영 수집 대상 전체 실행")
    group.add_argument("--source-id", type=int, help="특정 수집 대상 실행")
    group.add_argument("--list", action="store_true", help="수집 대상 목록 출력")
    group.add_argument("--ocr", type=Path, help="파일 텍스트 추출(OCR)")
    parser.add_argument("--sandbox", action="store_true", help="--all 실행 시 샌드박스 수집 대상 사용")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    sys.stdout.reconfigure(encoding="utf-8")

    if args.ocr:
        content_type = CONTENT_TYPES.get(args.ocr.suffix.lower(), "")
        result = extract_text(args.ocr.read_bytes(), content_type, args.ocr.name)
        print(f"[{result.engine}] pages={result.pages}\n{result.text}")
        return 0

    init_db()
    if args.list:
        with SessionLocal() as db:
            for s in db.scalars(select(CrawlSource).order_by(CrawlSource.id)):
                scope = "SANDBOX" if s.is_sandbox else "PROD"
                print(f"{s.id:>3} [{scope}] {'ON ' if s.enabled else 'OFF'} {s.kind:<10} {s.name} ({s.schedule})")
        return 0
    runs = [run_source(args.source_id, "cli")] if args.source_id else run_enabled(args.sandbox, "cli")
    for run in runs:
        print(f"{run.source_name}: {run.status} 수집 {run.collected_count}건 / 신규 {run.new_count}건 {run.error or ''}")
    return 0 if all(r.status == "success" for r in runs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
