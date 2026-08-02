from __future__ import annotations

import time
import urllib.robotparser
from urllib.parse import urlparse

import httpx

DEFAULT_USER_AGENT = (
    "FinanceNews/0.1 (+paes.andre33@gmail.com; "
    "projeto pessoal de acompanhamento de cartas de gestores)"
)


class Fetcher:
    """Cliente HTTP com rate limit por domínio e checagem de robots.txt."""

    def __init__(
        self,
        user_agent: str = DEFAULT_USER_AGENT,
        delay_seconds: float = 3.0,
        timeout: float = 20.0,
    ) -> None:
        self.delay_seconds = delay_seconds
        self._client = httpx.Client(
            headers={"User-Agent": user_agent},
            timeout=timeout,
            follow_redirects=True,
        )
        self._last_request_at: dict[str, float] = {}
        self._robots: dict[str, urllib.robotparser.RobotFileParser] = {}

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "Fetcher":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def _host(self, url: str) -> str:
        return urlparse(url).netloc

    def _throttle(self, host: str) -> None:
        last = self._last_request_at.get(host)
        if last is not None:
            elapsed = time.monotonic() - last
            if elapsed < self.delay_seconds:
                time.sleep(self.delay_seconds - elapsed)
        self._last_request_at[host] = time.monotonic()

    def _robots_allows(self, url: str) -> bool:
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        rp = self._robots.get(base)
        if rp is None:
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(f"{base}/robots.txt")
            try:
                resp = self._client.get(f"{base}/robots.txt", timeout=10.0)
                if resp.status_code == 200:
                    rp.parse(resp.text.splitlines())
                else:
                    rp.allow_all = True
            except httpx.HTTPError:
                rp.allow_all = True
            self._robots[base] = rp
        if getattr(rp, "allow_all", False):
            return True
        return rp.can_fetch(self._client.headers["User-Agent"], url)

    def head(self, url: str) -> httpx.Response | None:
        if not self._robots_allows(url):
            return None
        host = self._host(url)
        self._throttle(host)
        try:
            return self._client.head(url)
        except httpx.HTTPError:
            return None

    def get(self, url: str) -> httpx.Response | None:
        if not self._robots_allows(url):
            return None
        host = self._host(url)
        self._throttle(host)
        try:
            resp = self._client.get(url)
            resp.raise_for_status()
            return resp
        except httpx.HTTPError:
            return None
