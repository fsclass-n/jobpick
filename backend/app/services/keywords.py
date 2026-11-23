"""채용 공고/자소서 공통 키워드 사전 및 토큰화 유틸"""
import re

# 표준 키워드 -> 동의어(소문자 비교)
KEYWORD_SYNONYMS: dict[str, list[str]] = {
    # 개발
    "Python": ["python", "파이썬"],
    "Java": ["java", "자바"],
    "JavaScript": ["javascript", "자바스크립트", "js"],
    "TypeScript": ["typescript", "타입스크립트", "ts"],
    "React": ["react", "리액트"],
    "Vue": ["vue", "뷰"],
    "Node.js": ["node.js", "nodejs", "노드"],
    "Spring": ["spring", "스프링", "spring boot", "스프링부트"],
    "FastAPI": ["fastapi"],
    "Django": ["django", "장고"],
    "SQL": ["sql", "mysql", "postgresql", "oracle", "쿼리"],
    "NoSQL": ["nosql", "mongodb", "redis"],
    "AWS": ["aws", "아마존웹서비스", "ec2", "s3"],
    "Docker": ["docker", "도커", "컨테이너"],
    "Kubernetes": ["kubernetes", "k8s", "쿠버네티스"],
    "CI/CD": ["ci/cd", "github actions", "jenkins", "배포 자동화", "cicd"],
    "Git": ["git", "github", "gitlab", "형상관리"],
    "REST API": ["rest api", "restful", "api 설계", "api 개발"],
    "HTML/CSS": ["html", "css", "퍼블리싱", "tailwind"],
    "Linux": ["linux", "리눅스", "unix"],
    "테스트 자동화": ["테스트 자동화", "단위 테스트", "unit test", "pytest", "jest", "tdd"],
    # 데이터/AI
    "데이터 분석": ["데이터 분석", "data analysis", "분석 역량", "데이터분석"],
    "머신러닝": ["머신러닝", "machine learning", "ml", "딥러닝", "deep learning"],
    "LLM": ["llm", "생성형 ai", "생성형ai", "gpt", "gemini", "프롬프트"],
    "pandas": ["pandas", "판다스", "numpy"],
    "시각화": ["시각화", "tableau", "태블로", "power bi", "대시보드"],
    "통계": ["통계", "statistics", "가설 검증", "a/b 테스트", "ab테스트"],
    "RPA": ["rpa", "업무 자동화", "uipath", "자동화"],
    "크롤링": ["크롤링", "crawling", "스크래핑", "scraping", "playwright", "selenium"],
    # 기획/마케팅/경영
    "서비스 기획": ["서비스 기획", "기획", "요구사항 정의", "prd"],
    "UX": ["ux", "사용자 경험", "사용성", "ui/ux", "uxui", "ui"],
    "Figma": ["figma", "피그마"],
    "퍼포먼스 마케팅": ["퍼포먼스 마케팅", "광고 운영", "ga4", "google analytics", "구글 애널리틱스"],
    "콘텐츠 마케팅": ["콘텐츠 마케팅", "콘텐츠 기획", "sns 운영", "브랜딩"],
    "재무 분석": ["재무 분석", "재무제표", "회계", "결산"],
    "영업": ["영업", "세일즈", "b2b 영업", "고객 발굴"],
    "ERP": ["erp", "sap"],
    "엑셀": ["엑셀", "excel", "vba"],
    "영어": ["영어", "토익", "toeic", "opic", "비즈니스 영어", "english"],
    # 역량/인재상
    "커뮤니케이션": ["커뮤니케이션", "소통", "의사소통", "협업 능력"],
    "협업": ["협업", "팀워크", "팀 프로젝트", "공동 작업", "cross-functional"],
    "문제 해결": ["문제 해결", "문제해결", "트러블슈팅", "개선", "해결"],
    "주도성": ["주도", "주도적", "능동", "자기주도", "오너십", "ownership"],
    "리더십": ["리더십", "리더", "팀장", "조장", "이끌"],
    "책임감": ["책임감", "책임", "끝까지"],
    "고객 지향": ["고객 지향", "고객 중심", "고객 만족", "사용자 중심"],
    "도전 정신": ["도전", "도전정신", "새로운 시도"],
    "성장 의지": ["성장", "학습", "자기계발", "꾸준"],
    "정량 성과": ["%", "증가", "감소", "단축", "향상", "절감", "달성"],
}

STOPWORDS = {
    "및", "등", "또는", "이상", "이하", "관련", "경험", "우대", "가능", "보유", "있는", "있으신", "분", "능력",
    "업무", "대한", "위한", "통한", "이해", "기반", "활용", "역량", "지원", "자격", "필수", "사항", "수", "것",
    "the", "and", "or", "with", "for", "of", "to", "in",
}

_PARTICLES = ("으로써", "으로서", "에서는", "에게서", "으로", "에서", "에게", "까지", "부터", "처럼", "하고",
              "은", "는", "이", "가", "을", "를", "에", "의", "와", "과", "로", "도", "만")

_TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9+#./-]*|[가-힣]+|\d+%?")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip().lower()


def find_keywords(text: str) -> list[str]:
    """사전에 등록된 표준 키워드 중 text 에 등장하는 것을 순서대로 반환"""
    norm = normalize_text(text)
    found: list[tuple[int, str]] = []
    for keyword, synonyms in KEYWORD_SYNONYMS.items():
        positions = [_find(norm, s) for s in [keyword.lower(), *synonyms]]
        positions = [p for p in positions if p >= 0]
        if positions:
            found.append((min(positions), keyword))
    return [k for _, k in sorted(found)]


def _find(norm: str, term: str) -> int:
    if re.fullmatch(r"[a-z0-9+#./ -]+", term) and len(term) <= 3:
        match = re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", norm)
        return match.start() if match else -1
    return norm.find(term)


def contains_keyword(text: str, keyword: str) -> bool:
    norm = normalize_text(text)
    return any(_find(norm, s) >= 0 for s in [keyword.lower(), *KEYWORD_SYNONYMS.get(keyword, [])])


def tokenize(text: str) -> set[str]:
    tokens = set()
    for raw in _TOKEN_RE.findall(text or ""):
        token = raw.lower()
        if re.fullmatch(r"[가-힣]+", token):
            for particle in _PARTICLES:
                if len(token) > len(particle) + 1 and token.endswith(particle):
                    token = token[: -len(particle)]
                    break
        if len(token) >= 2 and token not in STOPWORDS:
            tokens.add(token)
    return tokens
