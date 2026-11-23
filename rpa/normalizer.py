"""수집한 원본 공고를 jobpick 표준 스키마로 정형화"""
import json
import logging
import os
import re
from datetime import date, timedelta

from backend.app.services.keywords import find_keywords

logger = logging.getLogger("jobpick.rpa.normalizer")

CATEGORY_RULES = [
    ("AI", ["LLM", "머신러닝", "RPA"]),
    ("데이터", ["데이터 분석", "통계", "pandas", "시각화"]),
    ("프론트엔드", ["React", "Vue", "HTML/CSS", "TypeScript"]),
    ("백엔드", ["Python", "Java", "Spring", "FastAPI", "Django", "Node.js", "AWS", "Docker"]),
    ("디자인", ["Figma", "UX"]),
    ("기획", ["서비스 기획"]),
    ("마케팅", ["퍼포먼스 마케팅", "콘텐츠 마케팅"]),
    ("영업", ["영업"]),
    ("경영지원", ["재무 분석", "ERP", "엑셀"]),
]
SECTION_PATTERNS = {
    "requirements": r"(자격\s*요건|지원\s*자격|필수\s*요건|requirements)",
    "preferred": r"(우대\s*사항|우대\s*조건|preferred)",
    "talent": r"(인재상|이런\s*분|we\s*want)",
}
FIELDS = ("company", "title", "job_category", "location", "career", "company_size", "employment_type",
          "salary", "description", "url", "deadline")


def guess_category(keywords: list[str], title: str) -> str:
    for category, rules in CATEGORY_RULES:
        if category in title or any(k in rules for k in keywords):
            return category
    return "기타"


def split_sections(description: str) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {k: [] for k in SECTION_PATTERNS}
    current = None
    for line in re.split(r"[\n\r]+|(?<=[.!?])\s+", description or ""):
        line = line.strip(" -•·*▶■\t")
        if not line:
            continue
        for key, pattern in SECTION_PATTERNS.items():
            if re.search(pattern, line, re.I):
                current = key
                line = re.sub(pattern + r"\s*[:：]?", "", line, flags=re.I).strip()
                break
        if current and line:
            result[current].append(line)
    return result


def structure_with_gemini(job: dict) -> dict:
    """설명만 있는 공고는 Gemini 로 자격요건/우대사항/인재상을 추출 (키가 없으면 생략)"""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or not job.get("description"):
        return {}
    try:
        from google import genai
        from google.genai import types

        prompt = ("다음 채용 공고에서 자격요건, 우대사항, 인재상을 각각 짧은 문장 목록으로 추출해 "
                  '{"requirements": [], "preferred": [], "talent": []} JSON 으로만 답하세요.\n\n'
                  f"제목: {job.get('title')}\n회사: {job.get('company')}\n내용: {job['description'][:4000]}")
        response = genai.Client(api_key=api_key).models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.1),
        )
        data = json.loads(response.text)
        return {k: [str(v) for v in data.get(k, [])][:10] for k in SECTION_PATTERNS}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini 공고 정형화 실패: %s", exc)
        return {}


def normalize(raw: dict, is_sandbox: bool = False) -> dict:
    job = {k: str(raw.get(k) or "").strip() for k in FIELDS}
    for key in SECTION_PATTERNS:
        job[key] = [str(v).strip() for v in raw.get(key) or [] if str(v).strip()]
    if not any(job[k] for k in SECTION_PATTERNS):
        sections = split_sections(job["description"])
        if not any(sections.values()):
            sections = structure_with_gemini(job) or sections
        job.update(sections)
    if raw.get("deadline_days") is not None:
        job["deadline"] = (date.today() + timedelta(days=int(raw["deadline_days"]))).isoformat()
    elif re.fullmatch(r"\d{8}", job["deadline"]):
        job["deadline"] = f"{job['deadline'][:4]}-{job['deadline'][4:6]}-{job['deadline'][6:]}"
    text = " ".join([job["title"], job["description"], *job["requirements"], *job["preferred"], *job["talent"]])
    job["keywords"] = [k for k in find_keywords(text) if k != "정량 성과"][:15]
    job["job_category"] = job["job_category"] or guess_category(job["keywords"], job["title"])
    job["employment_type"] = job["employment_type"] or "정규직"
    job["source"] = str(raw.get("source") or "unknown")
    job["external_id"] = str(raw.get("external_id") or f"{job['company']}:{job['title']}")[:100]
    if is_sandbox:
        job["source"] = f"sandbox-{job['source']}"[:50]
    job["is_sandbox"] = is_sandbox
    return job
