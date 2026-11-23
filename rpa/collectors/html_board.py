"""정적 HTML 채용 게시판 수집기 (Requests + BeautifulSoup4)

수집 대상의 이용약관과 robots.txt 를 반드시 확인한 뒤 등록하세요.
config 예시:
{
  "item": "ul.jobs > li",
  "fields": {"title": ".title", "company": ".company", "location": ".location", "career": ".career",
             "deadline": ".deadline", "link": "a@href"},
  "detail": {"description": ".job-description"}
}
"""
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .common import CollectError, ensure_allowed, http_get


def select_value(node, selector: str, base_url: str = "") -> str:
    if not selector:
        return ""
    css, _, attr = selector.partition("@")
    target = node.select_one(css) if css else node
    if target is None:
        return ""
    value = target.get(attr, "") if attr else target.get_text(" ", strip=True)
    return urljoin(base_url, value) if attr == "href" else value


def parse_list(html: str, config: dict, base_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for node in soup.select(config["item"]):
        row = {k: select_value(node, sel, base_url) for k, sel in config.get("fields", {}).items()}
        if row.get("title"):
            row["url"] = row.pop("link", "") or base_url
            row["external_id"] = row.get("external_id") or row["url"] or row["title"]
            items.append(row)
    return items


def collect(source: dict) -> list[dict]:
    url, config = source.get("url"), source.get("config") or {}
    if not url or "item" not in config:
        raise CollectError("HTML 수집기는 url 과 config.item(목록 CSS 선택자)이 필요합니다.")
    ensure_allowed(url)
    jobs = parse_list(http_get(url).text, config, url)
    detail = config.get("detail") or {}
    for job in jobs[: int(config.get("detail_limit", 20))] if detail else []:
        ensure_allowed(job["url"])
        soup = BeautifulSoup(http_get(job["url"]).text, "html.parser")
        job.update({k: select_value(soup, sel, job["url"]) for k, sel in detail.items()})
    return [{**j, "source": source.get("name") or "html"} for j in jobs]
