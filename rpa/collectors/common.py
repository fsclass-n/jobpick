import os
import time
from urllib import robotparser
from urllib.parse import urljoin, urlparse

import requests


class CollectError(Exception):
    pass


def user_agent() -> str:
    return os.getenv("CRAWL_USER_AGENT", "jobpick-rpa/1.0")


def crawl_delay() -> float:
    return float(os.getenv("CRAWL_DELAY_SECONDS", "1.5") or 1.5)


def ensure_allowed(url: str) -> None:
    """robots.txt 에서 수집을 허용하지 않는 경로는 수집하지 않습니다."""
    parsed = urlparse(url)
    rp = robotparser.RobotFileParser()
    rp.set_url(urljoin(f"{parsed.scheme}://{parsed.netloc}", "/robots.txt"))
    try:
        rp.read()
    except OSError:
        return
    if not rp.can_fetch(user_agent(), url):
        raise CollectError(f"robots.txt 정책상 수집이 허용되지 않은 주소입니다: {url}")


def http_get(url: str, **kwargs) -> requests.Response:
    response = requests.get(url, headers={"User-Agent": user_agent()}, timeout=20, **kwargs)
    response.raise_for_status()
    time.sleep(crawl_delay())
    return response
