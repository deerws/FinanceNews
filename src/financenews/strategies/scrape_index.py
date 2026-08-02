from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from ..dates import MESES_ABREV, parse_date_from_url
from ..fetch import Fetcher
from ..models import Candidate, Source

_MES_ABREV_LOWER = {v.lower(): k for k, v in MESES_ABREV.items()}

_TRIMESTRE_RE = re.compile(r"(\d)T(\d{2})", re.IGNORECASE)
_MES_ANO_RE = re.compile(r"([A-Za-z]{3})(\d{2})(?!\d)")


def _parse_period_from_filename(name: str) -> tuple[int, int] | None:
    match = _TRIMESTRE_RE.search(name)
    if match:
        trimestre, aa = int(match.group(1)), int(match.group(2))
        if 1 <= trimestre <= 4:
            return 2000 + aa, trimestre * 3
    match = _MES_ANO_RE.search(name)
    if match:
        mes = _MES_ABREV_LOWER.get(match.group(1).lower())
        if mes:
            return 2000 + int(match.group(2)), mes
    return None


def _pdf_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().endswith(".pdf"):
            links.append(urljoin(base_url, href))
    return sorted(set(links))


def _discover_guepardo(source: Source, fetcher: Fetcher) -> list[Candidate]:
    resp = fetcher.get(source.url)
    if resp is None:
        return []
    candidates = []
    for url in _pdf_links(resp.text, source.url):
        period = _parse_period_from_filename(urlparse(url).path)
        if period is None:
            continue
        ano, mes = period
        candidates.append(Candidate(source_id=source.id, url=url, ano=ano, mes=mes, content_type="pdf"))
    return candidates


_DYNAMO_LANDING_RE = re.compile(r'href="(https://www\.dynamo\.com\.br/carta-(\d+)[^"]*)"')


def _discover_dynamo(source: Source, fetcher: Fetcher) -> list[Candidate]:
    resp = fetcher.get(source.url)
    if resp is None:
        return []
    html = resp.text
    pdf_urls = _pdf_links(html, source.url)
    pdf_urls = [u for u in pdf_urls if "wp-content/uploads" in u]

    landing_by_n: dict[int, str] = {}
    for match in _DYNAMO_LANDING_RE.finditer(html):
        landing_by_n[int(match.group(2))] = match.group(1)

    has_n = {n for n in landing_by_n if any(f"-{n}." in u or f"Dynamo-{n}." in u for u in pdf_urls)}
    missing = sorted(set(landing_by_n) - has_n)
    if missing:
        newest_missing = missing[-1]
        sub_resp = fetcher.get(landing_by_n[newest_missing])
        if sub_resp is not None:
            pdf_urls.extend(u for u in _pdf_links(sub_resp.text, str(sub_resp.url)) if "wp-content/uploads" in u)

    candidates = []
    for url in sorted(set(pdf_urls)):
        period = parse_date_from_url(url)
        if period is None:
            continue
        ano, mes = period
        candidates.append(Candidate(source_id=source.id, url=url, ano=ano, mes=mes, content_type="pdf"))
    return candidates


def _discover_kinea(source: Source, fetcher: Fetcher, category_id: int = 340, per_page: int = 10) -> list[Candidate]:
    api_url = (
        f"https://www.kinea.com.br/wp-json/wp/v2/posts"
        f"?categories={category_id}&per_page={per_page}"
    )
    resp = fetcher.get(api_url)
    if resp is None:
        return []
    posts = resp.json()
    candidates = []
    for post in posts:
        date = post.get("date", "")
        try:
            ano, mes = int(date[0:4]), int(date[5:7])
        except (ValueError, IndexError):
            continue
        title = BeautifulSoup(post.get("title", {}).get("rendered", ""), "lxml").get_text().strip()
        body = post.get("content", {}).get("rendered", "")
        link = post.get("link", api_url)
        html_content = f"<h1>{title}</h1>\n{body}"
        candidates.append(
            Candidate(
                source_id=source.id,
                url=link,
                ano=ano,
                mes=mes,
                content_type="html",
                titulo=title,
                html_content=html_content,
            )
        )
    return candidates


_BY_ID = {
    "guepardo": _discover_guepardo,
    "dynamo": _discover_dynamo,
    "kinea": _discover_kinea,
}


def discover(source: Source, fetcher: Fetcher) -> list[Candidate]:
    handler = _BY_ID.get(source.id)
    if handler is not None:
        return handler(source, fetcher)

    # Fallback genérico: assume que a página índice lista PDFs diretamente.
    resp = fetcher.get(source.url)
    if resp is None:
        return []
    candidates = []
    for url in _pdf_links(resp.text, source.url):
        period = parse_date_from_url(url) or _parse_period_from_filename(urlparse(url).path)
        if period is None:
            continue
        ano, mes = period
        candidates.append(Candidate(source_id=source.id, url=url, ano=ano, mes=mes, content_type="pdf"))
    return candidates
