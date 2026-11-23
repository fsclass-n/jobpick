"""실제 채용/훈련 공고 수집기 — 각 기관의 공식 오픈 API만 사용한다.

- 사람인 채용공고 API   : https://oapi.saramin.co.kr/job-search  (SARAMIN_ACCESS_KEY)
- 워크넷 채용정보 API   : https://openapi.work.go.kr             (WORK24_API_KEY, XML)
- HRD-Net 훈련과정 API  : https://www.hrd.go.kr/jsp/HRDP/...     (WORK24_API_KEY, 강의 포함)

잡코리아는 공식 API가 없고 이용약관·robots.txt 상 크롤링이 금지되어 있어 제외한다.

수집 범위
- 지역: 서울(101000/11000/11), 경기(102000/41000/41), 인천(108000/28000/28)
- 직군: 웹·IT 개발 전체 — 사람인 직무 job_mid_cd=2(IT·인터넷), 워크넷은 개발 키워드 다중 검색,
        HRD-Net은 NCS 1차분류 20(정보통신)
"""
import os
import re
import xml.etree.ElementTree as ET

import httpx

from .data import PROFILE_SKILLS

SARAMIN_KEY = os.getenv("SARAMIN_ACCESS_KEY", "").strip()
WORK24_KEY = os.getenv("WORK24_API_KEY", "").strip()

SARAMIN_URL = "https://oapi.saramin.co.kr/job-search"
WORKNET_URL = "https://openapi.work.go.kr/opi/opi/opia/wantedApi.do"
HRD_URL = os.getenv("HRD_API_URL", "https://www.hrd.go.kr/jsp/HRDP/HRDPO00/HRDPOA60/HRDPOA60_1.jsp")

# 사람인: 근무지 1차 코드 / 워크넷: 근무지역 코드 / HRD: 훈련지역 대분류
SARAMIN_LOCS = "101000 102000 108000"          # 서울전체 경기전체 인천전체
WORKNET_REGIONS = "11000|41000|28000"          # 서울|경기|인천
HRD_AREAS = [("11", "서울"), ("41", "경기"), ("28", "인천")]

WORKNET_KEYWORDS = [
    "웹개발", "웹 개발", "프론트엔드", "백엔드", "풀스택", "웹프로그래머",
    "Java", "스프링", "React", "Node.js", "파이썬 개발", "자바스크립트",
    "PHP", "SW개발", "소프트웨어 개발", "앱개발", "IT개발",
]

# 공고 제목·직무명에서 역량 키워드를 뽑기 위한 기술어 사전
TECH_TERMS = [
    "Java", "Spring Boot", "Spring", "JPA", "Kotlin", "Python", "FastAPI", "Django",
    "Node.js", "Express", "TypeScript", "JavaScript", "React", "Vue", "Next.js", "Nuxt",
    "HTML", "CSS", "Tailwind", "C#", "C++", ".NET", "PHP", "Laravel", "Go", "Rust",
    "Swift", "iOS", "Android", "Flutter", "React Native", "Unity", "C",
    "MySQL", "PostgreSQL", "Oracle", "MariaDB", "MongoDB", "Redis", "MSSQL",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "CI/CD", "Terraform", "Linux",
    "Git", "Kafka", "Elasticsearch", "GraphQL", "REST API", "MSA", "DevOps", "Selenium",
    "AI", "머신러닝", "딥러닝", "빅데이터", "AIoT", "보안", "네트워크", "펌웨어", "임베디드",
    "Flask", "MariaDB",
]

# 공고에 한글로 표기되는 기술어 → 표준 스킬명
TECH_ALIASES = {
    "자바스크립트": "JavaScript", "타입스크립트": "TypeScript", "자바": "Java",
    "스프링부트": "Spring Boot", "스프링": "Spring", "리액트": "React", "뷰": "Vue",
    "노드": "Node.js", "파이썬": "Python", "장고": "Django", "플라스크": "Flask",
    "안드로이드": "Android", "아이폰": "iOS", "스위프트": "Swift", "코틀린": "Kotlin",
    "도커": "Docker", "쿠버네티스": "Kubernetes", "리눅스": "Linux", "깃": "Git",
    "몽고디비": "MongoDB", "오라클": "Oracle", "레디스": "Redis", "카프카": "Kafka",
    "플러터": "Flutter", "유니티": "Unity", "라라벨": "Laravel", "고언어": "Go",
    "러스트": "Rust", "그래프큐엘": "GraphQL", "데브옵스": "DevOps", "셀레늄": "Selenium",
    "넥스트": "Next.js", "엠에스에이": "MSA", "인공지능": "AI", "마리아디비": "MariaDB",
    "정보보안": "보안", "네트워크보안": "보안",
}

REGION_ALIASES = {
    "서울": "서울", "서울특별시": "서울", "서울전체": "서울",
    "경기": "경기", "경기도": "경기", "경기전체": "경기", "판교": "경기", "성남": "경기",
    "수원": "경기", "고양": "경기", "용인": "경기", "부천": "경기", "안양": "경기",
    "화성": "경기", "평택": "경기", "의정부": "경기", "시흥": "경기", "김포": "경기",
    "광명": "경기", "하남": "경기", "이천": "경기", "안성": "경기", "오산": "경기",
    "인천": "인천", "인천광역시": "인천", "인천전체": "인천",
}


def _region(text: str, default: str = "") -> str:
    head = (text or "").replace(",", " ").split()
    for token in head:
        if token in REGION_ALIASES:
            return REGION_ALIASES[token]
        for alias, norm in REGION_ALIASES.items():
            if token.startswith(alias):
                return norm
    return head[0] if head else default


def _deadline(text: str) -> str:
    t = (text or "").strip().replace(".", "-").replace("/", "-")
    for fmt in ("%Y-%m-%d", "%Y%m%d"):
        try:
            from datetime import datetime
            return datetime.strptime(t[:10] if "-" in fmt else t[:8], fmt).strftime("%m-%d")
        except ValueError:
            continue
    return ""


def _skills(*texts: str) -> list[str]:
    """제목·직무명에서 기술 키워드를 단어 경계 기준으로 추출한다."""
    blob = " " + " ".join(t for t in texts if t).lower() + " "
    found: list[str] = []
    for alias, term in TECH_ALIASES.items():
        if re.search(rf"(?<![가-힣0-9a-z]){re.escape(alias)}(?![가-힣0-9a-z])", blob):
            if term not in found:
                found.append(term)
            blob = re.sub(re.escape(alias), " ", blob)
    for term in TECH_TERMS:
        pat = rf"(?<![0-9a-z+#.]){re.escape(term.lower())}(?![0-9a-z+#])"
        if re.search(pat, blob) and term not in found:
            found.append(term)
    return found[:10]


def collect_saramin(client: httpx.Client) -> tuple[list[dict], str]:
    if not SARAMIN_KEY:
        return [], "SARAMIN_ACCESS_KEY 미설정"
    r = client.get(SARAMIN_URL, params={
        "access-key": SARAMIN_KEY,
        "loc_mcd": SARAMIN_LOCS,
        "job_mid_cd": "2",            # IT·인터넷 직무 전체
        "count": "110",
        "sort": "pd",
        "fields": "expiration-date",
    }, headers={"Accept": "application/json"})
    r.raise_for_status()
    payload = r.json().get("jobs", {})
    rows = payload.get("job") or []
    if isinstance(rows, dict):
        rows = [rows]
    out = []
    for j in rows:
        pos = j.get("position") or {}
        job_names = ((pos.get("job-code") or {}).get("name") or "")
        skills = _skills(pos.get("title") or "", job_names)
        if not skills and job_names:
            skills = [s.strip() for s in job_names.split(",") if s.strip()][:10]
        out.append({
            "external_id": f"saramin:{j.get('id')}",
            "company": ((j.get("company") or {}).get("detail") or {}).get("name") or "",
            "title": (pos.get("title") or "").strip(),
            "region": _region((pos.get("location") or {}).get("name") or ""),
            "career": (pos.get("experience-level") or {}).get("name") or "관계없음",
            "size": "민간",
            "source": "사람인",
            "deadline": _deadline(j.get("expiration-date") or j.get("expiration-timestamp") or ""),
            "skills": skills,
            "values": [((pos.get("job-mid-code") or {}).get("name") or "IT·인터넷")],
            "radar": {},
            "url": j.get("url") or "",
        })
    return [o for o in out if o["company"] and o["title"]], f"{len(out)}건"


def collect_worknet(client: httpx.Client) -> tuple[list[dict], str]:
    if not WORK24_KEY:
        return [], "WORK24_API_KEY 미설정"
    seen: dict[str, dict] = {}
    for kw in WORKNET_KEYWORDS:
        r = client.get(WORKNET_URL, params={
            "authKey": WORK24_KEY, "callTp": "L", "returnType": "XML",
            "startPage": "1", "display": "100",
            "region": WORKNET_REGIONS, "keyword": kw,
        })
        r.raise_for_status()
        root = ET.fromstring(r.text)
        err = root.find(".//error")
        if err is not None:
            raise RuntimeError(f"워크넷 API 오류 {err.findtext('messageCd')}: {err.findtext('message')}")
        for w in root.iter("wanted"):
            auth_no = w.findtext("wantedAuthNo") or ""
            title = (w.findtext("title") or "").strip()
            company = (w.findtext("company") or "").strip()
            if not auth_no or auth_no in seen or not title or not company:
                continue
            seen[auth_no] = {
                "external_id": f"worknet:{auth_no}",
                "company": company,
                "title": title,
                "region": _region(w.findtext("region") or w.findtext("workRegion") or ""),
                "career": w.findtext("career") or "관계없음",
                "size": "민간",
                "source": "워크넷",
                "deadline": _deadline(w.findtext("closeDt") or ""),
                "skills": _skills(title, kw),
                "values": [],
                "radar": {},
                "url": (w.findtext("wantedInfoUrl") or "").strip(),
            }
    return list(seen.values()), f"{len(seen)}건"


def collect_hrd(client: httpx.Client) -> tuple[list[dict], str]:
    """국민내일배움카드 훈련과정 — 강의/교육과정."""
    if not WORK24_KEY:
        return [], "WORK24_API_KEY 미설정"
    out = []
    for area, name in HRD_AREAS:
        r = client.get(HRD_URL, params={
            "authKey": WORK24_KEY, "returnType": "XML", "outType": "1",
            "pageNum": "1", "pageSize": "100",
            "srchTraArea1": area, "srchNcs1": "20",   # NCS 1차: 정보통신
        })
        r.raise_for_status()
        root = ET.fromstring(r.text)
        for c in root.iter("scn_list"):
            title = (c.findtext("trprNm") or "").strip()
            inst = (c.findtext("instNm") or c.findtext("inoNm") or c.findtext("subTitle") or "").strip()
            trpr_id = c.findtext("trprId") or ""
            if not title or not inst:
                continue
            end = c.findtext("traEndDate") or c.findtext("traEndDt") or ""
            out.append({
                "external_id": f"hrd:{trpr_id}:{c.findtext('trprDegr') or '1'}",
                "company": inst,
                "title": f"[훈련] {title}",
                "region": _region(c.findtext("address") or "", default=name),
                "career": "교육과정",
                "size": "훈련",
                "source": "HRD-Net",
                "deadline": _deadline(end),
                "skills": _skills(title, c.findtext("ncsNm") or ""),
                "values": ["국민내일배움카드"],
                "radar": {},
                "url": f"https://www.hrd.go.kr/hrdp/co/pcobo/PCOBO0100P.do?tracseId={trpr_id}" if trpr_id else "",
            })
    return out, f"{len(out)}건"


COLLECTORS = [
    ("사람인", collect_saramin),
    ("워크넷", collect_worknet),
    ("HRD-Net 훈련과정", collect_hrd),
]


def collect_all() -> dict:
    """설정된 키로 각 수집기를 실행한다. 한 소스가 실패해도 나머지는 진행."""
    stats: dict[str, str] = {}
    items: list[dict] = []
    with httpx.Client(timeout=30, follow_redirects=True) as client:
        for name, fn in COLLECTORS:
            try:
                got, note = fn(client)
                stats[name] = note
                items.extend(got)
            except Exception as exc:  # 소스별 격리 — 전체 수집을 중단시키지 않는다
                stats[name] = f"오류: {exc}"
    # 같은 공고가 소스 간 중복 수집될 수 있으므로 external_id 기준 dedupe
    dedup = {it["external_id"]: it for it in items}
    # 프로필 역량과의 적합도는 목록 응답에서 fit으로 계산되므로 수집본은 radar를 비워 둔다
    return {"items": list(dedup.values()), "stats": stats, "profile_skills": PROFILE_SKILLS}
