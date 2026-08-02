from __future__ import annotations

import re
from pathlib import Path

import pdfplumber
from bs4 import BeautifulSoup


def extract_text(raw_path: Path, html_content: str | None = None) -> str:
    if raw_path.suffix.lower() == ".pdf":
        return _extract_pdf(raw_path)
    if html_content is not None:
        return _extract_html(html_content)
    return _extract_html(raw_path.read_text(encoding="utf-8"))


def _extract_pdf(path: Path) -> str:
    parts: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            parts.append(text)
    return "\n\n".join(parts).strip()


def _extract_html(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(separator="\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()
