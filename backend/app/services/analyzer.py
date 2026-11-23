"""자소서-채용공고 대조 분석 엔진 (Google Gemini + 규칙 기반 폴백)"""
import json
import logging
import re
import time
from dataclasses import dataclass

from ..config import settings
from .keywords import contains_keyword, find_keywords, tokenize

logger = logging.getLogger("jobpick.analyzer")

WEIGHTS = {"keyword": 0.35, "requirements": 0.25, "preferred": 0.10, "talent": 0.10, "writing": 0.20}
IDEAL_MIN, IDEAL_MAX = 400, 1200


@dataclass
class AnalysisResult:
    score: float
    keyword_match_rate: float
    result: dict
    engine: str
    duration_ms: int
    status: str = "success"
    error: str | None = None


def grade_for(score: float) -> dict:
    if score >= 80:
        return {"label": "합격 가능성 높음", "level": "high"}
    if score >= 60:
        return {"label": "합격 가능성 보통", "level": "medium"}
    if score >= 40:
        return {"label": "보완 필요", "level": "low"}
    return {"label": "전면 수정 권장", "level": "critical"}


def job_keywords(job: dict) -> list[str]:
    merged = list(job.get("keywords") or [])
    text = " ".join([job.get("title", ""), job.get("description", ""), *job.get("requirements", []),
                     *job.get("preferred", []), *job.get("talent", [])])
    for keyword in find_keywords(text):
        if keyword not in merged:
            merged.append(keyword)
    return [k for k in merged if k != "정량 성과"]


def _coverage(lines: list[str], resume_text: str, resume_tokens: set[str]) -> tuple[float, list[dict]]:
    details = []
    for line in lines:
        kws = [k for k in find_keywords(line) if k != "정량 성과"]
        if kws:
            hit = [k for k in kws if contains_keyword(resume_text, k)]
            ratio = len(hit) / len(kws)
        else:
            tokens = tokenize(line)
            hit = sorted(tokens & resume_tokens)
            ratio = min(1.0, len(hit) / max(1, min(3, len(tokens))))
        details.append({"text": line, "matched": ratio >= 0.5, "ratio": round(ratio, 2), "evidence": hit[:5]})
    if not details:
        return 1.0, details
    return sum(d["ratio"] for d in details) / len(details), details


def _writing_quality(answer: str) -> tuple[float, list[str]]:
    length = len(answer.strip())
    notes: list[str] = []
    score = 1.0
    if length < IDEAL_MIN:
        score -= 0.35 if length >= 150 else 0.6
        notes.append(f"분량이 {length}자로 짧습니다. 경험의 배경-행동-결과가 드러나도록 {IDEAL_MIN}자 이상으로 보강하세요.")
    elif length > IDEAL_MAX * 1.5:
        score -= 0.15
        notes.append("분량이 길어 핵심이 흐려질 수 있습니다. 문항당 핵심 경험 1~2개로 압축하세요.")
    if not re.search(r"\d", answer):
        score -= 0.2
        notes.append("수치(%, 기간, 인원, 건수 등)로 표현된 성과가 없습니다. 정량 성과를 1개 이상 추가하세요.")
    star_markers = [("상황", r"당시|상황|문제|과제|목표"), ("행동", r"직접|제안|개발|구축|설계|분석|진행|시도"),
                    ("결과", r"결과|성과|달성|개선|향상|감소|증가|단축"), ("배움", r"배웠|깨달|교훈|성장|느꼈")]
    missing = [name for name, pattern in star_markers if not re.search(pattern, answer)]
    if missing:
        score -= 0.08 * len(missing)
        notes.append(f"STAR 구조 중 '{', '.join(missing)}' 요소가 약합니다.")
    if re.search(r"열심히|최선을 다하|성실한 사람|노력하겠", answer):
        score -= 0.1
        notes.append("'열심히', '최선을 다하겠다' 같은 추상적 다짐 대신 구체적 행동과 근거를 제시하세요.")
    return max(0.0, min(1.0, score)), notes


def _example_sentence(keyword: str, job_title: str) -> str:
    return (f"\"{keyword} 역량을 활용해 [프로젝트/업무명]에서 [구체적 행동]을 수행했고, 그 결과 [수치 성과]를 달성했습니다. "
            f"이 경험을 {job_title} 직무에서 [기여 방안]으로 이어가겠습니다.\"")


def analyze_rule_based(job: dict, resume_items: list[dict]) -> dict:
    answers = [i.get("answer", "") for i in resume_items]
    resume_text = "\n".join(f"{i.get('question', '')}\n{i.get('answer', '')}" for i in resume_items)
    resume_tokens = tokenize(resume_text)

    keywords = job_keywords(job)
    matched = [k for k in keywords if contains_keyword(resume_text, k)]
    missing = [k for k in keywords if k not in matched]
    keyword_rate = len(matched) / len(keywords) if keywords else 0.5

    req_score, req_details = _coverage(job.get("requirements", []), resume_text, resume_tokens)
    pref_score, pref_details = _coverage(job.get("preferred", []), resume_text, resume_tokens)
    talent_score, talent_details = _coverage(job.get("talent", []), resume_text, resume_tokens)

    question_feedback = []
    writing_scores = []
    for item in resume_items:
        answer = item.get("answer", "")
        quality, notes = _writing_quality(answer)
        item_keywords = [k for k in keywords if contains_keyword(answer, k)]
        suggest = [k for k in missing if k not in item_keywords][:3]
        item_score = round(100 * (0.6 * quality + 0.4 * (len(item_keywords) / max(1, min(5, len(keywords))))), 1)
        writing_scores.append(quality)
        feedback = list(notes)
        if suggest:
            feedback.append(f"공고 핵심 키워드 {', '.join(suggest)} 중 실제 경험이 있다면 이 문항에 연결해 서술하세요.")
        if not feedback:
            feedback.append("구성과 근거가 충분합니다. 지원 기업의 사업/서비스와 연결되는 문장을 1개 추가하면 더 좋습니다.")
        question_feedback.append({
            "question": item.get("question", ""),
            "score": min(100.0, item_score),
            "length": len(answer.strip()),
            "matched_keywords": item_keywords,
            "suggested_keywords": suggest,
            "feedback": feedback,
            "example": _example_sentence(suggest[0], job.get("title", "지원")) if suggest else "",
        })
    writing = sum(writing_scores) / len(writing_scores) if writing_scores else 0

    sections = {"keyword": keyword_rate, "requirements": req_score, "preferred": pref_score,
                "talent": talent_score, "writing": writing}
    raw = sum(sections[k] * w for k, w in WEIGHTS.items()) * 100
    score = round(max(5.0, min(98.0, raw)), 1)

    strengths = []
    if matched:
        strengths.append(f"공고 핵심 키워드 {len(matched)}개({', '.join(matched[:5])})가 자소서에 드러납니다.")
    strengths += [f"자격요건 '{d['text']}'을(를) 충족하는 근거가 있습니다." for d in req_details if d["matched"]][:3]
    if writing >= 0.75:
        strengths.append("문항별 분량과 구조(상황-행동-결과)가 안정적입니다.")
    improvements = [f"자격요건 '{d['text']}'에 대한 경험 서술이 부족합니다." for d in req_details if not d["matched"]][:3]
    if missing:
        improvements.append(f"누락된 핵심 키워드: {', '.join(missing[:6])}")
    improvements += [f"우대사항 '{d['text']}' 관련 경험을 추가하면 가산점을 기대할 수 있습니다."
                     for d in pref_details if not d["matched"]][:2]
    if writing < 0.6:
        improvements.append("정량 성과와 STAR 구조를 보강해 설득력을 높이세요.")

    grade = grade_for(score)
    company = job.get("company", "지원 기업")
    summary = (f"{company} '{job.get('title', '')}' 공고 대비 적합도는 {score}점({grade['label']})입니다. "
               f"핵심 키워드 매칭률 {round(keyword_rate * 100)}%, 자격요건 충족도 {round(req_score * 100)}%로 분석되었습니다.")
    next_actions = []
    if missing:
        next_actions.append(f"{missing[0]} 관련 경험을 가장 점수가 낮은 문항에 STAR 구조로 추가하기")
    if writing < 0.75:
        next_actions.append("모든 문항에 수치 기반 성과를 1개 이상 넣기")
    if job.get("talent"):
        next_actions.append(f"인재상 '{job['talent'][0]}'과(와) 연결되는 사례를 지원동기 문항에 녹이기")
    next_actions.append("수정 후 다시 분석해 점수 변화를 확인하기")

    return {
        "score": score,
        "keyword_match_rate": round(keyword_rate * 100, 1),
        "grade": grade,
        "summary": summary,
        "section_scores": {k: round(v * 100, 1) for k, v in sections.items()},
        "matched_keywords": matched,
        "missing_keywords": missing,
        "requirements": req_details,
        "preferred": pref_details,
        "talent": talent_details,
        "strengths": strengths or ["지원 직무에 대한 관심과 기본 경험이 드러납니다."],
        "improvements": improvements or ["큰 결함은 없습니다. 기업 맞춤 문장을 추가해 차별화하세요."],
        "question_feedback": question_feedback,
        "next_actions": next_actions,
    }


GEMINI_PROMPT = """당신은 대한민국 채용 시장에 정통한 커리어 컨설턴트입니다.
아래 [채용 공고]와 [자기소개서]를 대조해 합격 가능성을 분석하고, 문항별 수정 가이드라인을 작성하세요.
[참고 분석]은 규칙 기반 엔진이 계산한 키워드 매칭 결과이니 근거로 활용하되, 문맥을 고려해 판단하세요.
지원자가 하지 않은 경험을 지어내도록 권하지 말고, 실제 경험을 더 잘 드러내는 방향으로 조언하세요.

반드시 아래 JSON 형식으로만 응답하세요.
{{
  "score": 0~100 사이 숫자,
  "summary": "총평 2~3문장",
  "strengths": ["강점", ...],
  "improvements": ["보완점", ...],
  "question_feedback": [
    {{"question": "문항", "score": 0~100, "feedback": ["수정 가이드라인", ...], "example": "개선 예시 문장"}}
  ],
  "next_actions": ["다음 행동", ...]
}}

[채용 공고]
{job}

[자기소개서]
{resume}

[참고 분석]
{reference}
"""


def _gemini_client():
    from google import genai

    return genai.Client(api_key=settings.gemini_api_key)


def analyze_with_gemini(job: dict, resume_items: list[dict], reference: dict) -> dict:
    from google.genai import types

    prompt = GEMINI_PROMPT.format(
        job=json.dumps({k: job.get(k) for k in ("company", "title", "description", "requirements", "preferred", "talent")},
                       ensure_ascii=False),
        resume=json.dumps(resume_items, ensure_ascii=False),
        reference=json.dumps({k: reference[k] for k in ("score", "matched_keywords", "missing_keywords", "section_scores")},
                             ensure_ascii=False),
    )
    response = _gemini_client().models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.4),
    )
    data = json.loads(response.text)
    merged = dict(reference)
    merged["score"] = round(max(0.0, min(100.0, float(data.get("score", reference["score"])))), 1)
    for key in ("summary", "strengths", "improvements", "next_actions"):
        if data.get(key):
            merged[key] = data[key]
    ai_list = [q for q in data.get("question_feedback", []) if isinstance(q, dict)]
    by_question = {q.get("question"): q for q in ai_list}
    merged["question_feedback"] = [dict(q) for q in reference["question_feedback"]]
    for idx, item in enumerate(merged["question_feedback"]):
        ai = by_question.get(item["question"]) or (ai_list[idx] if idx < len(ai_list) else None)
        if ai:
            item["score"] = round(float(ai.get("score", item["score"])), 1)
            item["feedback"] = ai.get("feedback") or item["feedback"]
            item["example"] = ai.get("example") or item["example"]
    merged["grade"] = grade_for(merged["score"])
    return merged


def analyze(job: dict, resume_items: list[dict]) -> AnalysisResult:
    started = time.perf_counter()
    reference = analyze_rule_based(job, resume_items)
    engine, status, error = "rule", "success", None
    result = reference
    if settings.gemini_api_key:
        try:
            result = analyze_with_gemini(job, resume_items, reference)
            engine = "gemini"
        except Exception as exc:  # noqa: BLE001 - 외부 API 오류는 규칙 기반 결과로 대체
            logger.warning("Gemini 분석 실패, 규칙 기반 결과로 대체: %s", exc)
            status, error = "fallback", f"Gemini 오류로 규칙 기반 결과를 제공합니다: {type(exc).__name__}"
            result = {**reference, "notice": "AI 엔진 응답 오류로 규칙 기반 분석 결과를 표시합니다."}
    duration = int((time.perf_counter() - started) * 1000)
    return AnalysisResult(result["score"], result["keyword_match_rate"], result, engine, duration, status, error)
