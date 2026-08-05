from __future__ import annotations

import ast

import numpy as np

_MAX_TRECHOS_NOVOS = 3


def _parse_embedding(raw: str | list[float]) -> np.ndarray:
    # pgvector volta do PostgREST como string "[0.1,0.2,...]", não JSON.
    valores = ast.literal_eval(raw) if isinstance(raw, str) else raw
    return np.array(valores, dtype=np.float64)


def _media_normalizada(vetores: list[np.ndarray]) -> np.ndarray | None:
    if not vetores:
        return None
    media = np.mean(vetores, axis=0)
    norma = np.linalg.norm(media)
    if norma == 0:
        return None
    return media / norma


def comparar_cartas(
    chunks_novos: list[dict], chunks_anteriores: list[dict]
) -> tuple[float | None, list[dict]]:
    """Compara os chunks de uma carta nova com os da carta anterior da
    mesma gestora (mesmo modelo de embedding usado na busca semântica).

    Retorna (similaridade_geral, trechos_novos):
    - similaridade_geral: cosseno entre o vetor médio de cada carta —
      quanto mais baixo, mais a carta mudou em relação à anterior.
    - trechos_novos: até 3 trechos da carta nova cujo melhor par na carta
      anterior é o mais distante — candidatos a "conteúdo genuinamente
      novo", não um reforço de algo já dito antes.
    """
    if not chunks_novos or not chunks_anteriores:
        return None, []

    vetores_novos = [_parse_embedding(c["embedding"]) for c in chunks_novos]
    vetores_anteriores = [_parse_embedding(c["embedding"]) for c in chunks_anteriores]

    media_nova = _media_normalizada(vetores_novos)
    media_anterior = _media_normalizada(vetores_anteriores)
    if media_nova is None or media_anterior is None:
        return None, []
    similaridade_geral = float(np.dot(media_nova, media_anterior))

    matriz_anterior = np.stack(vetores_anteriores)
    candidatos = []
    for chunk, vetor in zip(chunks_novos, vetores_novos):
        melhor_sim = float(np.max(matriz_anterior @ vetor))
        candidatos.append(
            {"secao": chunk.get("secao"), "texto": chunk["texto"], "similaridade": melhor_sim}
        )
    candidatos.sort(key=lambda c: c["similaridade"])

    return similaridade_geral, candidatos[:_MAX_TRECHOS_NOVOS]
