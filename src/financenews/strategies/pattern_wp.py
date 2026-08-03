from __future__ import annotations

import datetime
from collections.abc import Callable

from ..dates import MESES_ABREV, MESES_COMPLETO, months_window
from ..fetch import Fetcher
from ..models import Candidate, Source

# Cada builder recebe (ano, mes) e devolve uma ou mais URLs candidatas para
# aquele mês (mais provável primeiro), no formato exato daquela gestora.
# Heterogêneo de propósito: cada site usa uma convenção de data diferente
# (abreviação maiúscula/minúscula, nome completo, ano com 2 ou 4 dígitos,
# mês da pasta de upload vs. mês de referência) — não compensa forçar um
# template genérico para só 3 fontes.

_Builder = Callable[[int, int], list[str]]


def _add_months(ano: int, mes: int, delta: int) -> tuple[int, int]:
    idx = (ano * 12 + (mes - 1)) + delta
    return idx // 12, idx % 12 + 1


def _genoa_url(ano: int, mes: int) -> list[str]:
    mes_abrev = MESES_ABREV[mes]
    aa = ano % 100
    return [f"https://www.genoacapital.com.br/docs/CartaMensalGenoaCapital_{mes_abrev}{aa:02d}.pdf"]


def _bahia_asset_url(ano: int, mes: int) -> list[str]:
    mes_abrev = MESES_ABREV[mes].lower()
    aa = ano % 100
    fname = f"carta_do_gestor_{mes_abrev}{aa:02d}.pdf"
    # Confirmado ao vivo: carta de referência jun/26 está na pasta de upload
    # 2026/07 (mes+1). Mantemos mes+1 como 1ª tentativa e mes como fallback,
    # já que só temos um ponto de dado confirmado.
    up_ano1, up_mes1 = _add_months(ano, mes, 1)
    return [
        f"https://www.bahiaasset.com.br/wp-content/uploads/{up_ano1:04d}/{up_mes1:02d}/{fname}",
        f"https://www.bahiaasset.com.br/wp-content/uploads/{ano:04d}/{mes:02d}/{fname}",
    ]


def _novus_url(ano: int, mes: int) -> list[str]:
    mes_completo = MESES_COMPLETO[mes]
    return [f"https://novuscapital.com.br/storage/carta-mensal/CM-{mes_completo}-{ano:04d}.pdf"]


def _armor_url(ano: int, mes: int) -> list[str]:
    # Confirmado ao vivo: pasta de upload é mes+1, nome do arquivo usa o mês
    # de referência (mesmo padrão da Bahia Asset).
    up_ano, up_mes = _add_months(ano, mes, 1)
    fname = f"{ano:04d}{mes:02d}_CartaMensalArmorCapital.pdf"
    return [f"https://armorcapital.com.br/wp-content/uploads/{up_ano:04d}/{up_mes:02d}/{fname}"]


def _az_quest_url(ano: int, mes: int) -> list[str]:
    # Espaços no nome do arquivo — precisa urlencode (%20).
    fname = f"AZ%20Quest%20Carta%20Mensal%20{ano:04d}_{mes:02d}.pdf"
    return [f"https://azquest.com.br/arquivos/carta/{fname}"]


def _kinitro_url(ano: int, mes: int) -> list[str]:
    # Acento (í) + espaços no nome — urlencode manual (í = %C3%AD em UTF-8).
    mes_completo = MESES_COMPLETO[mes]
    aa = ano % 100
    fname = f"Carta%20Mensal%20K%C3%ADnitro%20-%20{mes_completo}.{aa:02d}.pdf"
    up_ano, up_mes = _add_months(ano, mes, 1)
    return [f"https://www.kinitro.com.br/documentos/cartas/{up_ano:04d}/{up_mes:02d}/{fname}"]


_BUILDERS: dict[str, _Builder] = {
    "genoa": _genoa_url,
    "bahia_asset": _bahia_asset_url,
    "novus": _novus_url,
    "armor": _armor_url,
    "az_quest": _az_quest_url,
    "kinitro": _kinitro_url,
}


def discover(source: Source, fetcher: Fetcher, back_months: int = 2) -> list[Candidate]:
    builder = _BUILDERS.get(source.id)
    if builder is None:
        return []

    today = datetime.date.today()
    candidates: list[Candidate] = []
    for ano, mes in months_window(today.year, today.month, back=back_months):
        for url in builder(ano, mes):
            resp = fetcher.head(url)
            # Alguns sites (ex.: AZ Quest) devolvem 200 com uma página HTML de
            # "não encontrado" em vez de um 404 de verdade — sem checar o
            # content-type, isso passaria como se fosse a carta.
            is_pdf = resp is not None and "pdf" in resp.headers.get("content-type", "").lower()
            if resp is not None and resp.status_code == 200 and is_pdf:
                candidates.append(
                    Candidate(source_id=source.id, url=url, ano=ano, mes=mes, content_type="pdf")
                )
                break
    return candidates
