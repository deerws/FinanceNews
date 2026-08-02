from __future__ import annotations

import re

MESES_ABREV = {
    1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr", 5: "Mai", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
}

MESES_COMPLETO = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril", 5: "Maio", 6: "Junho",
    7: "Julho", 8: "Agosto", 9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
}

_UPLOAD_PATH_RE = re.compile(r"/uploads/(\d{4})/(\d{1,2})/")
_YYYY_MM_RE = re.compile(r"(\d{4})[_-](\d{2})")


def months_window(ano: int, mes: int, back: int = 2) -> list[tuple[int, int]]:
    """Retorna [(ano, mes)] do mês dado e dos `back` meses anteriores, mais recente primeiro."""
    out = []
    y, m = ano, mes
    for _ in range(back + 1):
        out.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return out


def parse_date_from_url(url: str) -> tuple[int, int] | None:
    """Best-effort: tenta achar ano/mês no path de upload (/AAAA/MM/) de uma URL WordPress."""
    match = _UPLOAD_PATH_RE.search(url)
    if match:
        return int(match.group(1)), int(match.group(2))
    match = _YYYY_MM_RE.search(url)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None
