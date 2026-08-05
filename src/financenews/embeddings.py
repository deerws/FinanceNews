from __future__ import annotations

import re
from functools import lru_cache

_BLOCO_RE = re.compile(r"\n{2,}")

# multilingual-e5-small: 384 dimensões, roda de graça na CPU, mesmo modelo
# usado do lado do Next.js (via transformers.js/ONNX) — tem que ser
# exatamente o mesmo modelo dos dois lados pra distância de cosseno entre
# query e carta fazer sentido. E5 exige os prefixos "query: "/"passage: "
# no texto (convenção do próprio modelo, não é estilo nosso).
_MODEL_NAME = "intfloat/multilingual-e5-small"
_MAX_CHARS_POR_CHUNK = 1200


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(_MODEL_NAME)


def chunk_carta(texto: str, max_chars: int = _MAX_CHARS_POR_CHUNK) -> list[tuple[str | None, str]]:
    """Quebra o texto extraído (blocos separados por linha em branco, com
    '## ' marcando seção — mesmo formato que extract.py já produz) em
    chunks de tamanho razoável pra embedding, cada um com a seção atual.
    """
    secao_atual: str | None = None
    chunks: list[tuple[str | None, str]] = []
    buffer: list[str] = []
    buffer_len = 0

    def flush() -> None:
        nonlocal buffer, buffer_len
        if buffer:
            chunks.append((secao_atual, "\n\n".join(buffer)))
        buffer = []
        buffer_len = 0

    for bloco in _BLOCO_RE.split(texto):
        bloco = bloco.strip()
        if not bloco:
            continue
        if bloco.startswith("## "):
            flush()
            secao_atual = bloco[3:].strip()
            continue
        if buffer_len + len(bloco) > max_chars and buffer:
            flush()
        buffer.append(bloco)
        buffer_len += len(bloco)
    flush()
    return chunks


def embed_passages(textos: list[str]) -> list[list[float]]:
    if not textos:
        return []
    vetores = _model().encode(
        [f"passage: {t}" for t in textos],
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vetores.tolist()
