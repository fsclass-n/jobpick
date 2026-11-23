"""OCR/텍스트로 추출한 자소서 원문을 문항(question)-답변(answer) 목록으로 분리"""
import re

QUESTION_RE = re.compile(
    r"^\s*(?:"
    r"(?:Q|문항)\s*\d+\s*[.:)\]]?"
    r"|\d{1,2}\s*[.)]\s+"
    r"|\[[^\]]{2,80}\]"
    r"|【[^】]{2,80}】"
    r"|[■▶●◆]\s*"
    r")"
)
HINT_RE = re.compile(r"\(\s*\d{2,4}\s*자[^)]*\)|기술하|서술하|작성해|무엇입니까|\?$")


def is_question_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > 200:
        return False
    return bool(QUESTION_RE.match(stripped)) or bool(HINT_RE.search(stripped) and len(stripped) <= 150)


def parse_resume_text(text: str) -> list[dict]:
    lines = [line.rstrip() for line in (text or "").replace("\r\n", "\n").split("\n")]
    items: list[dict] = []
    current: dict | None = None
    preface: list[str] = []
    for line in lines:
        if is_question_line(line):
            if current:
                items.append(current)
            current = {"question": line.strip(), "answer": ""}
        elif current is not None:
            current["answer"] += (line + "\n")
        else:
            preface.append(line)
    if current:
        items.append(current)
    for item in items:
        item["answer"] = item["answer"].strip()
    body = "\n".join(preface).strip()
    if not items:
        return [{"question": "자기소개서 본문", "answer": body}]
    if body:
        items.insert(0, {"question": "기본 정보/요약", "answer": body})
    return items
