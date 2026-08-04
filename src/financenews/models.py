from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Source:
    id: str
    nome: str
    tier: int
    trilha: str
    cadencia: str
    coleta: str
    url: str
    verificado: bool
    implementado: bool
    padrao_pdf: str | None = None
    notas: str | None = None


@dataclass(frozen=True)
class Candidate:
    """Uma carta encontrada por uma estratégia, ainda não baixada."""

    source_id: str
    url: str
    ano: int
    mes: int
    content_type: str  # "pdf" | "html"
    titulo: str | None = None
    html_content: str | None = None  # já disponível quando content_type == "html"


@dataclass
class LetterRecord:
    id: str
    gestora: str
    trilha: str
    tier: int
    ano: int
    mes: int
    url_origem: str
    arquivo_raw: str
    arquivo_txt: str
    sha256: str
    baixado_em: str
    status_leitura: str = "pendente"
    titulo: str | None = None
