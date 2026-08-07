from __future__ import annotations

from dataclasses import dataclass

import pdfplumber

# Calibrado ao vivo contra 5 PDFs variados (Genoa, Armor, Oaktree,
# Berkshire, Guepardo) antes de generalizar — ver notas por constante.

# Vetorial: linhas/retângulos "ponte" (finos e compridos) quase sempre são
# separador decorativo, não parte de um gráfico — sem excluir isso antes
# de agrupar, o cluster vira a página inteira (achado real do primeiro
# teste: 2 de 5 amostras "detectavam" o texto inteiro como gráfico).
_PONTE_LARGURA_FRAC = 0.55
_PONTE_ALTURA_FRAC = 0.4
_PONTE_ESPESSURA_MAX = 6

_CLUSTER_MAX_LARGURA_FRAC = 0.65
_CLUSTER_MAX_ALTURA_FRAC = 0.45
_CLUSTER_AREA_MIN = 4000
_CLUSTER_DENSIDADE_MIN = 0.8  # primitivas por 10k px² de bbox

# Raster: `page.images` inclui de tudo, de logo repetido a — em pelo menos
# uma gestora (Armor) — cada LINHA DE TEXTO rasterizada como imagem
# separada (dezenas por página, ~11-13px de altura). Sem esses filtros,
# extrairíamos a carta inteira como uma sequência de tiras de imagem.
_IMG_AREA_FRAC_MAX = 0.85  # fundo de página inteira
_IMG_ALTURA_MIN = 40  # abaixo disso é quase sempre tira de texto rasterizado

# Achado ao vivo (Armor): o mesmo parágrafo pode existir tanto como texto
# real extraível quanto como uma camada raster duplicada por cima — sem
# esse filtro, a região "gráfico" detectada é na verdade um parágrafo
# inteiro de texto normal (pior caso possível: apagaria texto legível de
# verdade pra trocar por uma imagem estática do mesmo texto). Região com
# muitas palavras reais embaixo não é gráfico, é texto disfarçado.
_PALAVRAS_MAX_NA_REGIAO = 20

Bbox = tuple[float, float, float, float]


@dataclass
class FiguraDetectada:
    pagina: int
    bbox: Bbox


def _eh_ponte(bbox: Bbox, largura_pagina: float, altura_pagina: float) -> bool:
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    if w > largura_pagina * _PONTE_LARGURA_FRAC and h < _PONTE_ESPESSURA_MAX:
        return True
    if h > altura_pagina * _PONTE_ALTURA_FRAC and w < _PONTE_ESPESSURA_MAX:
        return True
    return False


def _merge_bboxes(bboxes: list[Bbox], tol: float = 8) -> list[Bbox]:
    boxes = list(bboxes)
    changed = True
    while changed:
        changed = False
        merged: list[Bbox] = []
        used = [False] * len(boxes)
        for i, a in enumerate(boxes):
            if used[i]:
                continue
            x0, top, x1, bottom = a
            for j, b in enumerate(boxes):
                if i == j or used[j]:
                    continue
                bx0, btop, bx1, bbottom = b
                if x0 - tol < bx1 and bx0 - tol < x1 and top - tol < bbottom and btop - tol < bottom:
                    x0, top, x1, bottom = min(x0, bx0), min(top, btop), max(x1, bx1), max(bottom, bbottom)
                    used[j] = True
                    changed = True
            used[i] = True
            merged.append((x0, top, x1, bottom))
        boxes = merged
    return boxes


def _regioes_vetoriais_brutas(page: pdfplumber.page.Page) -> list[Bbox]:
    largura, altura = page.width, page.height

    primitivas_raw: list[Bbox] = []
    for curva in page.curves:
        primitivas_raw.append((curva["x0"], curva["top"], curva["x1"], curva["bottom"]))
    for linha in page.lines:
        primitivas_raw.append((linha["x0"], linha["top"], linha["x1"], linha["bottom"]))
    for rect in page.rects:
        primitivas_raw.append((rect["x0"], rect["top"], rect["x1"], rect["bottom"]))

    primitivas = [p for p in primitivas_raw if not _eh_ponte(p, largura, altura)]
    if not primitivas:
        return []

    regioes = []
    for bbox in _merge_bboxes(primitivas):
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        area = w * h
        if area < _CLUSTER_AREA_MIN:
            continue
        if w > largura * _CLUSTER_MAX_LARGURA_FRAC or h > altura * _CLUSTER_MAX_ALTURA_FRAC:
            continue
        dentro = [
            p for p in primitivas
            if p[0] >= bbox[0] - 1 and p[2] <= bbox[2] + 1 and p[1] >= bbox[1] - 1 and p[3] <= bbox[3] + 1
        ]
        densidade = len(dentro) / max(1, area) * 10000
        if densidade < _CLUSTER_DENSIDADE_MIN:
            continue
        regioes.append(bbox)
    return regioes


def _chave_posicional(bbox: Bbox, round_to: int = 15) -> tuple[int, int, int, int]:
    return tuple(round(v / round_to) for v in bbox)  # type: ignore[return-value]


def _regioes_raster(pdf: pdfplumber.PDF) -> dict[int, list[Bbox]]:
    # conta ocorrências por posição em TODAS as páginas primeiro — logo/
    # cabeçalho repete em 2+ páginas, gráfico de verdade não (mesmo
    # princípio já usado em extract.py pra cabeçalho/rodapé em negrito).
    contagem: dict[tuple, int] = {}
    for page in pdf.pages:
        for img in page.images:
            bbox = (img["x0"], img["top"], img["x1"], img["bottom"])
            k = _chave_posicional(bbox)
            contagem[k] = contagem.get(k, 0) + 1

    por_pagina: dict[int, list[Bbox]] = {}
    for i, page in enumerate(pdf.pages):
        area_pagina = page.width * page.height
        candidatas: list[Bbox] = []
        for img in page.images:
            bbox = (img["x0"], img["top"], img["x1"], img["bottom"])
            w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
            if w <= 0 or h <= 0:
                continue
            area_frac = (w * h) / area_pagina
            if area_frac > _IMG_AREA_FRAC_MAX:
                continue
            if contagem[_chave_posicional(bbox)] > 1:
                continue
            candidatas.append(bbox)
        # Achado ao vivo (Armor, capa): algumas fontes rasterizam cada
        # linha de texto como uma imagem separada — sem juntar imagens
        # próximas antes de filtrar por altura, isso vira uma dúzia de
        # tiras de imagem em vez de um bloco só. Junta primeiro, filtra
        # altura mínima depois (uma tira isolada que não juntou com nada
        # continua sendo descartada).
        aceitas = [bbox for bbox in _merge_bboxes(candidatas, tol=4) if bbox[3] - bbox[1] >= _IMG_ALTURA_MIN]
        por_pagina[i] = aceitas
    return por_pagina


def _sobrepoe(a: Bbox, b: Bbox) -> bool:
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def _contem_muito_texto(bbox: Bbox, palavras: list[dict]) -> bool:
    dentro = sum(1 for w in palavras if _sobrepoe(bbox, (w["x0"], w["top"], w["x1"], w["bottom"])))
    return dentro > _PALAVRAS_MAX_NA_REGIAO


def detectar_figuras(pdf_path: str) -> list[FiguraDetectada]:
    """Detecta regiões de gráfico/tabela por página — raster (imagem
    embutida, filtrando fundo de página inteira/tiras de texto/logo
    repetido) e vetorial (linhas/curvas agrupadas, excluindo separadores
    decorativos antes de agrupar, e excluindo região que se repete em 2+
    páginas — título de cabeçalho vetorial, não gráfico). Descarta
    qualquer região com muita palavra real embaixo (provável texto
    normal, não gráfico). Calibrado empiricamente, não é exato —
    prioriza não confundir texto normal com gráfico sobre não perder
    nenhum gráfico."""
    with pdfplumber.open(pdf_path) as pdf:
        raster_por_pagina = _regioes_raster(pdf)
        vetor_por_pagina = {i: _regioes_vetoriais_brutas(page) for i, page in enumerate(pdf.pages)}

        contagem_vetor: dict[tuple, int] = {}
        for regioes in vetor_por_pagina.values():
            for bbox in regioes:
                k = _chave_posicional(bbox)
                contagem_vetor[k] = contagem_vetor.get(k, 0) + 1

        figuras: list[FiguraDetectada] = []
        for i, page in enumerate(pdf.pages):
            palavras = page.extract_words(x_tolerance=1.5)
            regioes_raster = [b for b in raster_por_pagina.get(i, []) if not _contem_muito_texto(b, palavras)]
            regioes_vetor = [
                v for v in vetor_por_pagina[i]
                if contagem_vetor[_chave_posicional(v)] == 1
                and not any(_sobrepoe(v, r) for r in regioes_raster)
                and not _contem_muito_texto(v, palavras)
            ]
            for bbox in regioes_raster + regioes_vetor:
                figuras.append(FiguraDetectada(pagina=i, bbox=bbox))
    return figuras


def rasterizar(pdf_path: str, figura: FiguraDetectada, resolution: int = 150) -> tuple[bytes, int, int]:
    """Retorna (png_bytes, largura_px, altura_px)."""
    import io

    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[figura.pagina]
        recorte = page.crop(figura.bbox).to_image(resolution=resolution)
        bio = io.BytesIO()
        recorte.original.save(bio, format="PNG")
        return bio.getvalue(), recorte.original.width, recorte.original.height
