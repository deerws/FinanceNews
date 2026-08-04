from __future__ import annotations

import os
import time
from pathlib import Path

import httpx
import pdfplumber
from supabase import Client, create_client

from .dates import MESES_COMPLETO
from .index_store import IndexStore
from .notify import notificar_cartas_novas
from .registry import load_sources
from .storage import DEFAULT_ROOT

_BATCH = 50
_MAX_TENTATIVAS = 3


def _fallback_titulo(gestora_nome: str, ano: int, mes: int) -> str:
    return f"{gestora_nome} — {MESES_COMPLETO[mes]}/{ano}"


def _n_paginas(raw_path: Path) -> int | None:
    if raw_path.suffix.lower() != ".pdf" or not raw_path.exists():
        return None
    try:
        with pdfplumber.open(raw_path) as pdf:
            return len(pdf.pages)
    except Exception:  # noqa: BLE001 - metadado opcional, não pode travar a ingestão
        return None


def _client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _upsert_in_batches(client: Client, table: str, rows: list[dict]) -> None:
    # upsert é idempotente por natureza (on_conflict=id) — seguro tentar de
    # novo em caso de timeout de rede transitório, comum rodando via cron.
    for i in range(0, len(rows), _BATCH):
        batch = rows[i : i + _BATCH]
        for tentativa in range(1, _MAX_TENTATIVAS + 1):
            try:
                client.table(table).upsert(batch, on_conflict="id").execute()
                break
            except httpx.TimeoutException:
                if tentativa == _MAX_TENTATIVAS:
                    raise
                time.sleep(2 * tentativa)


def ingest() -> tuple[int, int, int]:
    """Sincroniza gestoras + cartas com o Supabase. Idempotente (upsert por id).
    Notifica por push quem segue a gestora de cada carta genuinamente nova.

    Retorna (n_gestoras, n_cartas, n_notificacoes) enviadas.
    """
    client = _client()
    sources = load_sources()
    repo_root = DEFAULT_ROOT.parent

    gestoras_payload = [
        {
            "id": src.id,
            "nome": src.nome,
            "slug": src.id,
            "trilha": src.trilha,
            "site": None if src.url == "TBD" else src.url,
            "tier": src.tier,
        }
        for src in sources.values()
    ]
    _upsert_in_batches(client, "gestoras", gestoras_payload)

    # Precisa saber quais ids já existiam ANTES do upsert pra separar carta
    # genuinamente nova (dispara notificação) de atualização de uma já
    # existente (ex.: reextração de texto não deve notificar de novo).
    ids_existentes = {
        row["id"] for row in client.table("cartas").select("id").execute().data
    }

    letters = IndexStore().all()
    cartas_payload = []
    metadados: dict[str, dict] = {}
    for letter in letters:
        src = sources.get(letter.gestora)
        gestora_nome = src.nome if src else letter.gestora
        titulo = letter.titulo or _fallback_titulo(gestora_nome, letter.ano, letter.mes)
        raw_path = repo_root / letter.arquivo_raw
        txt_path = repo_root / letter.arquivo_txt
        conteudo = txt_path.read_text(encoding="utf-8") if txt_path.exists() else ""

        cartas_payload.append(
            {
                "id": letter.id,
                "gestora_id": letter.gestora,
                "titulo": titulo,
                "data_referencia": f"{letter.ano:04d}-{letter.mes:02d}-01",
                "data_publicacao": letter.baixado_em,
                "url_origem": letter.url_origem,
                "conteudo_txt": conteudo,
                "hash": letter.sha256,
                "n_paginas": _n_paginas(raw_path),
                "trilha": letter.trilha,
                "tier": letter.tier,
            }
        )
        metadados[letter.id] = {"gestora_nome": gestora_nome, "titulo": titulo}
    _upsert_in_batches(client, "cartas", cartas_payload)

    novas = [
        {"id": c["id"], "gestora_id": c["gestora_id"], **metadados[c["id"]]}
        for c in cartas_payload
        if c["id"] not in ids_existentes
    ]
    n_notificacoes = notificar_cartas_novas(client, novas)

    return len(gestoras_payload), len(cartas_payload), n_notificacoes
