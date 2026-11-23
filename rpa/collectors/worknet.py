"""고용24(워크넷) 채용정보 Open API 수집기

- 인증키: WORKNET_API_KEY (공공데이터/고용24 Open API 신청 후 발급)
- 엔드포인트: WORKNET_API_URL (기관 정책 변경 시 .env 에서 교체)
"""
import os
import xml.etree.ElementTree as ET

from .common import CollectError, http_get


def _text(node: ET.Element, tag: str) -> str:
    found = node.find(tag)
    return (found.text or "").strip() if found is not None and found.text else ""


def collect(source: dict) -> list[dict]:
    api_key = os.getenv("WORKNET_API_KEY", "").strip()
    if not api_key:
        raise CollectError("WORKNET_API_KEY 가 설정되지 않았습니다.")
    url = source.get("url") or os.getenv("WORKNET_API_URL", "http://openapi.work.go.kr/opi/opi/opia/wantedApi.do")
    config = source.get("config") or {}
    jobs: list[dict] = []
    for keyword in source.get("keywords") or [""]:
        params = {"authKey": api_key, "callTp": "L", "returnType": "XML", "startPage": 1,
                  "display": int(config.get("display", 20))}
        if keyword:
            params["keyword"] = keyword
        root = ET.fromstring(http_get(url, params=params).content)
        error = root.find(".//messageCd")
        if error is not None and (error.text or "").strip() not in ("", "000"):
            raise CollectError(f"Open API 오류: {_text(root, './/message') or error.text}")
        for item in root.iter("wanted"):
            jobs.append({
                "source": "worknet",
                "external_id": _text(item, "wantedAuthNo"),
                "company": _text(item, "company"),
                "title": _text(item, "title"),
                "location": _text(item, "region"),
                "career": _text(item, "career"),
                "salary": _text(item, "sal"),
                "employment_type": _text(item, "holidayTpNm") or "정규직",
                "description": " ".join(filter(None, [_text(item, "title"), _text(item, "minEdubg"), _text(item, "jobsCd")])),
                "url": _text(item, "wantedInfoUrl"),
                "deadline": _text(item, "closeDt"),
                "keyword_hint": keyword,
            })
    return [j for j in jobs if j["external_id"]]
