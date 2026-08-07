from __future__ import annotations

import re
from pathlib import Path

import pdfplumber
from bs4 import BeautifulSoup

from .graficos import FiguraDetectada, detectar_figuras


def extract_text(raw_path: Path, html_content: str | None = None) -> tuple[str, list[FiguraDetectada]]:
    if raw_path.suffix.lower() == ".pdf":
        return _extract_pdf(raw_path)
    if html_content is not None:
        return _extract_html(html_content), []
    return _extract_html(raw_path.read_text(encoding="utf-8")), []


def _obj_dentro_de_alguma(obj: dict, bboxes: list[tuple[float, float, float, float]]) -> bool:
    x0, top, x1, bottom = obj.get("x0", 0), obj.get("top", 0), obj.get("x1", 0), obj.get("bottom", 0)
    return any(x0 < b[2] and b[0] < x1 and top < b[3] and b[1] < bottom for b in bboxes)


def _extract_pdf(path: Path) -> tuple[str, list[FiguraDetectada]]:
    # x_tolerance mais baixo que o padrão (3): o padrão junta palavras curtas
    # (a, de, na...) com a palavra seguinte quando o espaçamento do PDF é
    # apertado (comum em texto justificado) — ex.: "a taxa" virava "ataxa".
    # layout=True preserva a posição espacial original, o que inclui as
    # linhas em branco que separam parágrafos de verdade (sem isso, toda
    # quebra de linha do PDF — inclusive quebra no meio de uma frase por
    # causa da largura da página — vira \n, e não dá pra distinguir quebra
    # de parágrafo de quebra de linha).
    #
    # Regiões de gráfico/tabela detectadas (graficos.py) são mascaradas
    # ANTES da extração de texto (page.filter) — quando têm texto real
    # embaixo (ex.: cabeçalho de tabela), esse texto saía solto no meio do
    # parágrafo errado; quando não têm (gráfico 100% desenhado/imagem),
    # não muda nada no texto, mas o marcador [[FIGURA:n]] entra no lugar
    # certo pra virar imagem de verdade na leitura.
    figuras = detectar_figuras(str(path))
    figuras_por_pagina: dict[int, list[FiguraDetectada]] = {}
    for fig in figuras:
        figuras_por_pagina.setdefault(fig.pagina, []).append(fig)

    items: list[tuple[str, bool]] = []  # (texto, é_negrito) — marcador de figura entra como texto puro
    ordem_global = 0
    with pdfplumber.open(path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            figs_pagina = figuras_por_pagina.get(page_idx, [])
            if figs_pagina:
                bboxes = [f.bbox for f in figs_pagina]
                page_para_texto = page.filter(lambda obj: not _obj_dentro_de_alguma(obj, bboxes))
            else:
                page_para_texto = page

            raw = page_para_texto.extract_text(x_tolerance=1.5, layout=True) or ""
            paragraphs = _paragraphs_from_layout_text(raw)
            bold_lines = _bold_line_texts(page_para_texto)
            for para in paragraphs:
                items.append((para, para in bold_lines))

            for _fig in figs_pagina:
                items.append((f"[[FIGURA:{ordem_global}]]", False))
                ordem_global += 1

    # Cabeçalho/rodapé repetido (ex.: "Carta Mensal Junho/2026" em toda
    # página) costuma vir em negrito também — sem filtrar isso, cada
    # repetição vira um "título de seção" falso e polui o sumário. Título
    # de verdade normalmente aparece uma vez só no documento.
    bold_counts: dict[str, int] = {}
    for texto, negrito in items:
        if negrito:
            bold_counts[texto] = bold_counts.get(texto, 0) + 1

    output: list[str] = []
    for texto, negrito in items:
        if negrito and bold_counts[texto] > 1:
            continue  # repetido em várias páginas — ruído de cabeçalho/rodapé
        output.append(f"## {texto}" if negrito else texto)
    return "\n\n".join(output).strip(), figuras


def _paragraphs_from_layout_text(raw: str) -> list[str]:
    paragraphs: list[str] = []
    buffer: list[str] = []
    for line in raw.split("\n"):
        stripped = line.strip()
        if stripped:
            buffer.append(stripped)
        elif buffer:
            paragraphs.append(" ".join(buffer))
            buffer = []
    if buffer:
        paragraphs.append(" ".join(buffer))
    return paragraphs


def _bold_line_texts(page: pdfplumber.page.Page) -> set[str]:
    # Agrupa palavras por linha (posição vertical) e marca como "título" só
    # as linhas 100% em negrito na fonte original — sinal confiável de
    # seção (ex.: "Cenário"), não um chute por tamanho/pontuação da frase.
    try:
        words = page.extract_words(x_tolerance=1.5, extra_attrs=["fontname"])
    except Exception:  # noqa: BLE001 - detecção de título é best-effort
        return set()

    lines: dict[int, list[dict]] = {}
    for w in words:
        key = round(w["top"] / 3)
        lines.setdefault(key, []).append(w)

    bold_texts: set[str] = set()
    for line_words in lines.values():
        if not line_words or not all("bold" in w["fontname"].lower() for w in line_words):
            continue
        line_words.sort(key=lambda w: w["x0"])
        text = " ".join(w["text"] for w in line_words).strip()
        if text:
            bold_texts.add(text)
    return bold_texts


def _extract_html(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(separator="\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()
