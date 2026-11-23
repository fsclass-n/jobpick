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
DATA_GO_KR_KEY = os.getenv("DATA_GO_KR_API_KEY", "").strip()
SEOUL_KEY = os.getenv("SEOUL_OPEN_API_KEY", "").strip()
GG_KEY = os.getenv("GG_DATA_API_KEY", "").strip()

SARAMIN_URL = "https://oapi.saramin.co.kr/job-search"
WORKNET_URL = "https://openapi.work.go.kr/opi/opi/opia/wantedApi.do"
HRD_URL = os.getenv("HRD_API_URL", "https://www.hrd.go.kr/jsp/HRDP/HRDPO00/HRDPOA60/HRDPOA60_1.jsp")

# 사람인: 근무지 1차 코드 / 워크넷: 근무지역 코드 / HRD: 훈련지역 대분류
SARAMIN_LOCS = "101000 102000 108000"          # 서울전체 경기전체 인천전체
WORKNET_REGIONS = "11000|41000|28000"          # 서울|경기|인천
HRD_AREAS = [("11", "서울"), ("41", "경기"), ("28", "인천")]

# 웹·IT 개발 관련 직종 판별(공고 제목·직종명 기준 — 본문은 스킬 추출에만 사용)
# '개발'은 금형개발·제품개발 같은 오탐이 많아 복합 패턴으로 한정하고,
# 비IT 직종은 NEG_RE로 걸러낸다.
DEV_RE = re.compile(
    r"웹\s*개발|앱\s*개발|SW\s*개발|소프트웨어|\bSW\b|프론트엔드|백엔드|풀스택|"
    r"시스템\s*(엔지니어|개발|운영|구축|관리|사업)|정보시스템|네트워크\s*(엔지니어|구축|관리|운영)|"
    r"데이터베이스|\bDBA\b|\bIT\b|정보통신|전산|\bICT\b|정보처리|"
    r"인공지능|\bAI\b|데이터(베이스|엔지니어|분석|사이언스|과학)|빅데이터|머신러닝|딥러닝|"
    r"클라우드|devops|정보보안|사이버보안|보안관제|웹|프로그래머|코딩|개발자|개발팀|개발부|"
    r"개발문서|(?<![가-힣])서버",
    re.IGNORECASE,
)
NEG_RE = re.compile(
    r"금형|제관|판금|용접|사출|다이캐스팅|창호|조경|토목|건축|시공|육가공|푸드|주방|홀서|요양|간호|"
    r"조리|미용|피부|세무|회계|운전|물류|택배|배송|경비|미화|시설관리|청소|생산직|제조|목재|인쇄|"
    r"섬유|의류|패션|농업|축산|철강|화학|의료|병원|약국|약사|부동산|보험|텔레마케터|콜센터|상담원|"
    r"매장|판매|서빙|바리스타|요리|식당|마트|편의점|레이저|절곡|CNC|MCT|선반|밀링|사무원|사무보조|"
    r"경리|총무|교사|조교|조사요원|데이터\s*조사|DB\s*조사|안전관리|품질관리",
    re.IGNORECASE,
)


def _is_dev(text: str) -> bool:
    return bool(DEV_RE.search(text)) and not NEG_RE.search(text)

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


NARA_REGIONS = [("R3010", "서울"), ("R3017", "경기"), ("R3011", "인천")]  # 나라일터 workRgnLst
NARA_PAGES_PER_REGION = 20   # 지역별 최근 2,000건 스캔 (개발직은 희박해 넉넉히 조회)


def collect_narajater(client: httpx.Client) -> tuple[list[dict], str]:
    """인사혁신처 공공취업정보(나라일터) — data.go.kr 일반 인증키, 개인 자동승인."""
    if not DATA_GO_KR_KEY:
        return [], "DATA_GO_KR_API_KEY 미설정"
    wanted = {"서울", "경기", "인천"}
    out: dict[int, dict] = {}
    for code, name in NARA_REGIONS:
        for page in range(1, NARA_PAGES_PER_REGION + 1):
            r = client.get("https://apis.data.go.kr/1051000/recruitment/list", params={
                "serviceKey": DATA_GO_KR_KEY, "pageNo": page, "numOfRows": 100,
                "workRgnLst": code,
            })
            r.raise_for_status()
            data = r.json()
            if str(data.get("resultCode")) not in ("200", "00"):
                raise RuntimeError(f"나라일터 API 오류 {data.get('resultCode')}: {data.get('resultMsg')}")
            items = data.get("result") or []
            if not items:
                break
            for it in items:
                sn = it.get("recrutPblntSn")
                title = (it.get("recrutPbancTtl") or "").strip()
                inst = (it.get("instNm") or "").strip()
                ncs = it.get("ncsCdNmLst") or ""
                if not sn or sn in out or not title or not inst:
                    continue
                if it.get("ongoingYn") == "N":
                    continue
                if not _is_dev(f"{title} {ncs}"):
                    continue
                regions = [w.strip() for w in (it.get("workRgnNmLst") or "").split(",")]
                out[sn] = {
                    "external_id": f"narajater:{sn}",
                    "company": inst,
                    "title": title,
                    "region": next((w for w in wanted if w in regions), name),
                    "career": it.get("recrutSeNm") or "관계없음",
                    "size": "공공",
                    "source": "나라일터",
                    "deadline": _deadline(it.get("pbancEndYmd") or ""),
                    "skills": _skills(title, ncs, it.get("aplyQlfcCn") or ""),
                    "values": [ncs] if ncs else [],
                    "radar": {},
                    "url": (it.get("srcUrl") or "").strip(),
                }
    return list(out.values()), f"{len(out)}건"


SEOUL_SCAN_ROWS = 5000   # 최근 5,000건 스캔


def collect_seoul(client: httpx.Client) -> tuple[list[dict], str]:
    """서울 일자리플러스센터 채용정보 recMntList — openAPI.seoul.go.kr 개인 즉시 발급."""
    if not SEOUL_KEY:
        return [], "SEOUL_OPEN_API_KEY 미설정"
    import hashlib
    out = []
    for start in range(1, SEOUL_SCAN_ROWS + 1, 1000):
        r = client.get(f"http://openapi.seoul.go.kr:8088/{SEOUL_KEY}/json/recMntList/{start}/{start + 999}/")
        r.raise_for_status()
        data = r.json().get("recMntList", {})
        code = (data.get("RESULT") or {}).get("CODE", "INFO-000")
        if code == "INFO-200":
            break
        if code != "INFO-000":
            raise RuntimeError(f"서울 열린데이터 API 오류 {code}: {(data.get('RESULT') or {}).get('MESSAGE', '')[:60]}")
        rows = data.get("row") or []
        if not rows:
            break
        for row in rows:
            title = (row.get("TITLE") or "").strip()
            company = (row.get("COMPANY") or "").strip()
            job_nm = row.get("JOBS_NM") or ""
            duty = row.get("JOB_CONT") or ""
            if not company or not title or not _is_dev(f"{title} {job_nm}"):
                continue
            m = re.search(r"(\d{2,4})-(\d{1,2})-(\d{1,2})", row.get("CLOSE_DT") or "")
            deadline = f"{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else ""
            digest = hashlib.md5(f"{company}|{title}|{row.get('REG_DT', '')}".encode()).hexdigest()[:12]
            out.append({
                "external_id": f"seoul:{digest}",
                "company": company,
                "title": title,
                "region": "서울",
                "career": (row.get("CAREER") or "관계없음").split(" ")[0] or "관계없음",
                "size": "민간",
                "source": "서울 일자리플러스",
                "deadline": deadline,
                "skills": _skills(title, job_nm, duty, row.get("CERTIFICATE") or ""),
                "values": [job_nm] if job_nm else [],
                "radar": {},
                "url": "",
            })
        if len(out) >= 300:
            break
    return out, f"{len(out)}건"


GG_SCAN_PAGES = 6   # 잡아바 최근 6,000건 스캔 (전체 46만+ 중 최신 순, pSize 최대 1000)


def collect_gyeonggi(client: httpx.Client) -> tuple[list[dict], str]:
    """경기도일자리재단 잡아바 채용정보 — openapi.gg.go.kr, data.gg.go.kr 개인 즉시 발급."""
    if not GG_KEY:
        return [], "GG_DATA_API_KEY 미설정"
    import hashlib
    out = []
    for page in range(1, GG_SCAN_PAGES + 1):
        r = client.get("https://openapi.gg.go.kr/GGJOBABARECRUSTM", params={
            "KEY": GG_KEY, "Type": "json", "pIndex": page, "pSize": 1000,
        })
        r.raise_for_status()
        parts = r.json().get("GGJOBABARECRUSTM") or []
        rows: list[dict] = []
        for part in parts:
            if "row" in part:
                rows = part["row"]
            elif (part.get("RESULT") or {}).get("CODE") not in (None, "INFO-000"):
                res = part.get("RESULT") or {}
                if res.get("CODE") != "INFO-000":
                    raise RuntimeError(f"경기데이터드림 API 오류 {res.get('CODE')}: {res.get('MESSAGE', '')[:60]}")
        if not rows:
            break
        for row in rows:
            title = (row.get("PBANC_CONT") or "").strip()
            company = (row.get("ENTRPRS_NM") or "").strip()
            field = row.get("RECRUT_FIELD_NM") or ""
            if not company or not title or not _is_dev(f"{title} {field}"):
                continue
            url = (row.get("URL") or "").strip()
            digest = hashlib.md5((url or f"{company}|{title}|{row.get('RCPT_END_DE', '')}").encode()).hexdigest()[:14]
            out.append({
                "external_id": f"jobaba:{digest}",
                "company": company,
                "title": title,
                "region": "경기",
                "career": row.get("CAREER_DIV") or "관계없음",
                "size": "민간",
                "source": "경기 잡아바",
                "deadline": _deadline(row.get("RCPT_END_DE") or ""),
                "skills": _skills(title, field, row.get("SALARY_COND") or ""),
                "values": [field] if field else [],
                "radar": {},
                "url": url,
            })
        if len(out) >= 500:
            break
    return out, f"{len(out)}건"


COLLECTORS = [
    ("나라일터", collect_narajater),
    ("서울 일자리플러스", collect_seoul),
    ("경기 잡아바", collect_gyeonggi),
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
