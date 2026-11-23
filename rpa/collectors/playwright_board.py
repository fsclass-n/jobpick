"""JavaScript 렌더링 채용 페이지 수집기 (Playwright)

설치: pip install -r requirements.txt && playwright install chromium
config 는 html_board 와 동일하며, 추가로 "wait_for"(대기할 CSS 선택자), "scroll"(무한 스크롤 횟수)을 지원합니다.
"""
from .common import CollectError, crawl_delay, ensure_allowed, user_agent
from .html_board import parse_list


def collect(source: dict) -> list[dict]:
    url, config = source.get("url"), source.get("config") or {}
    if not url or "item" not in config:
        raise CollectError("Playwright 수집기는 url 과 config.item(목록 CSS 선택자)이 필요합니다.")
    ensure_allowed(url)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise CollectError("playwright 가 설치되어 있지 않습니다.") from exc
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(user_agent=user_agent())
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            if config.get("wait_for"):
                page.wait_for_selector(config["wait_for"], timeout=15000)
            for _ in range(int(config.get("scroll", 0))):
                page.mouse.wheel(0, 4000)
                page.wait_for_timeout(int(crawl_delay() * 1000))
            html = page.content()
        finally:
            browser.close()
    return [{**j, "source": source.get("name") or "playwright"} for j in parse_list(html, config, url)]
