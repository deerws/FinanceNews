from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from ..dates import MESES_ABREV, MESES_COMPLETO, parse_date_from_url
from ..fetch import Fetcher
from ..models import Candidate, Source

_MES_ABREV_LOWER = {v.lower(): k for k, v in MESES_ABREV.items()}
_MES_COMPLETO_LOWER = {v.lower(): k for k, v in MESES_COMPLETO.items()}

_TRIMESTRE_RE = re.compile(r"(\d)T(\d{2})(?!\d)", re.IGNORECASE)
_TRIMESTRE_4D_RE = re.compile(r"(\d)T(\d{4})(?!\d)", re.IGNORECASE)
_SEMESTRE_RE = re.compile(r"(\d)S(\d{2})(?!\d)", re.IGNORECASE)
_MES_ANO_RE = re.compile(r"([A-Za-z]{3})(\d{2})(?!\d)")


def _parse_period_from_filename(name: str) -> tuple[int, int] | None:
    # Ano com 4 dígitos primeiro (ex.: "4T2024") — senão o regex de 2 dígitos
    # casaria só os 2 primeiros dígitos do ano e daria uma data errada.
    match = _TRIMESTRE_4D_RE.search(name)
    if match:
        trimestre, ano = int(match.group(1)), int(match.group(2))
        if 1 <= trimestre <= 4:
            return ano, trimestre * 3
    match = _TRIMESTRE_RE.search(name)
    if match:
        trimestre, aa = int(match.group(1)), int(match.group(2))
        if 1 <= trimestre <= 4:
            return 2000 + aa, trimestre * 3
    match = _SEMESTRE_RE.search(name)
    if match:
        semestre, aa = int(match.group(1)), int(match.group(2))
        if semestre in (1, 2):
            return 2000 + aa, 6 if semestre == 1 else 12
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


_VERSA_SLUG_RE = re.compile(r"resultado-mensal-([a-z]+)-(\d{2})/?$")


def _discover_versa(source: Source, fetcher: Fetcher) -> list[Candidate]:
    # A categoria "cartas" mistura vários tipos de post; só "resultado-mensal-*"
    # são as cartas mensais de verdade. Publica em HTML, não PDF.
    resp = fetcher.get(source.url)
    if resp is None:
        return []
    soup = BeautifulSoup(resp.text, "lxml")
    candidates = []
    seen_urls = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(source.url, a["href"])
        match = _VERSA_SLUG_RE.search(href)
        if not match or href in seen_urls:
            continue
        mes = _MES_COMPLETO_LOWER.get(match.group(1))
        if mes is None:
            continue
        seen_urls.add(href)
        ano = 2000 + int(match.group(2))
        post_resp = fetcher.get(href)
        if post_resp is None:
            continue
        post_soup = BeautifulSoup(post_resp.text, "lxml")
        title = post_soup.title.get_text().strip() if post_soup.title else href
        article = post_soup.find("article") or post_soup.body
        html_content = str(article) if article else post_resp.text
        candidates.append(
            Candidate(
                source_id=source.id, url=href, ano=ano, mes=mes,
                content_type="html", titulo=title, html_content=html_content,
            )
        )
    return candidates


_OAKTREE_OPENPDF_RE = re.compile(r"javascript:openPDF\('([^']*)','([^']*)'\)")
_OAKTREE_DATETIME_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def _discover_oaktree(source: Source, fetcher: Fetcher, limit: int = 10, max_landing_fetches: int = 5) -> list[Candidate]:
    # Cada memo é um <time> seguido do <a class="oc-title-link"> imediato —
    # usa o DOM (não regex solto) pra parear os dois: um regex "guloso" pula
    # pra frente quando uma entrada no meio não casa, e cola a data errada
    # no PDF errado.
    # Metade dos links é PDF direto (javascript:openPDF); a outra metade só
    # tem página HTML própria (/insights/memo/slug) — segue essas também
    # (com limite de fetches extra) e usa o texto do artigo direto, sem
    # precisar achar o PDF em inglês em meio às traduções.
    resp = fetcher.get(source.url)
    if resp is None:
        return []
    soup = BeautifulSoup(resp.text, "lxml")
    candidates = []
    landing_fetches = 0
    for time_tag in soup.find_all("time", class_="embedded-date"):
        if len(candidates) >= limit:
            break
        datetime_attr = time_tag.get("datetime", "")
        date_match = _OAKTREE_DATETIME_RE.search(datetime_attr)
        link_tag = time_tag.find_next("a", class_="oc-title-link")
        if date_match is None or link_tag is None:
            continue
        href = link_tag.get("href", "")
        ano, mes = int(date_match.group(1)[0:4]), int(date_match.group(1)[5:7])
        titulo = link_tag.get_text().strip()

        pdf_match = _OAKTREE_OPENPDF_RE.search(href)
        if pdf_match is not None:
            titulo, pdf_url = pdf_match.groups()
            candidates.append(
                Candidate(source_id=source.id, url=pdf_url, ano=ano, mes=mes, content_type="pdf", titulo=titulo)
            )
            continue

        if href.startswith("/insights/memo/") and landing_fetches < max_landing_fetches:
            landing_fetches += 1
            memo_url = urljoin(source.url, href)
            memo_resp = fetcher.get(memo_url)
            if memo_resp is None:
                continue
            memo_soup = BeautifulSoup(memo_resp.text, "lxml")
            article = memo_soup.find("article") or memo_soup.find("main")
            if article is None:
                continue
            candidates.append(
                Candidate(
                    source_id=source.id, url=memo_url, ano=ano, mes=mes,
                    content_type="html", titulo=titulo, html_content=str(article),
                )
            )
    return candidates


def _discover_persevera(source: Source, fetcher: Fetcher, limit: int = 8) -> list[Candidate]:
    feed_url = "https://www.persevera.com.br/blog-feed.xml"
    resp = fetcher.get(feed_url)
    if resp is None:
        return []
    candidates = []
    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError:
        return []
    for item in root.findall(".//item")[:limit]:
        link = item.findtext("link")
        pub_date = item.findtext("pubDate")
        title = item.findtext("title")
        description = item.findtext("description") or ""
        if not link or not pub_date:
            continue
        try:
            dt = parsedate_to_datetime(pub_date)
        except (TypeError, ValueError):
            continue
        candidates.append(
            Candidate(
                source_id=source.id, url=link, ano=dt.year, mes=dt.month,
                content_type="html", titulo=title,
                html_content=f"<h1>{title}</h1>\n{description}",
            )
        )
    return candidates


_BY_ID = {
    "guepardo": _discover_guepardo,
    "dynamo": _discover_dynamo,
    "kinea": _discover_kinea,
    "versa": _discover_versa,
    "oaktree_marks": _discover_oaktree,
    "persevera": _discover_persevera,
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
        # Prioriza trimestre/semestre embutido no nome do arquivo (mais preciso
        # semanticamente) sobre a pasta de upload — sites que fazem migração
        # em massa (ex.: Organon) acabam com todo o histórico na mesma pasta
        # de upload, o que tornaria essa segunda opção enganosa se viesse primeiro.
        period = _parse_period_from_filename(urlparse(url).path) or parse_date_from_url(url)
        if period is None:
            continue
        ano, mes = period
        candidates.append(Candidate(source_id=source.id, url=url, ano=ano, mes=mes, content_type="pdf"))
    return candidates
