from __future__ import annotations

import json
import os
import time
from pathlib import Path

import httpx
import pdfplumber
from supabase import Client, create_client

from .dates import MESES_COMPLETO
from .embeddings import chunk_carta, embed_passages
from .graficos import FiguraDetectada, rasterizar
from .index_store import IndexStore
from .models import LetterRecord
from .mudancas import comparar_cartas
from .notify import notificar_cartas_novas
from .registry import load_sources
from .storage import DEFAULT_ROOT, figuras_path

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


def _upsert_in_batches(client: Client, table: str, rows: list[dict], on_conflict: str = "id") -> None:
    # upsert é idempotente por natureza (on_conflict) — seguro tentar de
    # novo em caso de timeout de rede transitório, comum rodando via cron.
    for i in range(0, len(rows), _BATCH):
        batch = rows[i : i + _BATCH]
        for tentativa in range(1, _MAX_TENTATIVAS + 1):
            try:
                client.table(table).upsert(batch, on_conflict=on_conflict).execute()
                break
            except httpx.TimeoutException:
                if tentativa == _MAX_TENTATIVAS:
                    raise
                time.sleep(2 * tentativa)


def _embed_cartas_pendentes(client: Client, cartas_payload: list[dict]) -> int:
    """Gera embeddings só pras cartas que ainda não têm chunk nenhum —
    cobre tanto carta genuinamente nova quanto backfill de cartas antigas
    que existiam antes dessa feature. Não reprocessa em re-ingest normal
    (custo de embedding só é pago uma vez por carta).
    """
    ids = [c["id"] for c in cartas_payload if c["conteudo_txt"]]
    ja_tem_chunks: set[str] = set()
    for i in range(0, len(ids), _BATCH):
        lote = ids[i : i + _BATCH]
        # filtra ordem=0 (todo carta com chunk tem exatamente 1 linha nesse
        # ordem) pra nunca ter mais de 1 linha por carta_id — uma carta com
        # dezenas de chunks (ex.: cartas anuais longas) podia estourar o
        # limite padrão de 1000 linhas do PostgREST e sumir do resultado,
        # fazendo re-embeddar carta que já tinha chunk (achado ao vivo no
        # backfill: reprocessou 46 cartas que já estavam prontas).
        rows = (
            client.table("chunks")
            .select("carta_id")
            .in_("carta_id", lote)
            .eq("ordem", 0)
            .execute()
            .data
        )
        ja_tem_chunks.update(r["carta_id"] for r in rows)

    pendentes = [c for c in cartas_payload if c["id"] not in ja_tem_chunks and c["conteudo_txt"]]
    if not pendentes:
        return 0

    tarefas: list[tuple[str, int, str | None, str]] = []
    for c in pendentes:
        for ordem, (secao, texto) in enumerate(chunk_carta(c["conteudo_txt"])):
            tarefas.append((c["id"], ordem, secao, texto))
    if not tarefas:
        return 0

    vetores = embed_passages([t[3] for t in tarefas])
    chunks_payload = [
        {"carta_id": carta_id, "ordem": ordem, "secao": secao, "texto": texto, "embedding": vetor}
        for (carta_id, ordem, secao, texto), vetor in zip(tarefas, vetores)
    ]
    _upsert_in_batches(client, "chunks", chunks_payload, on_conflict="carta_id,ordem")
    return len({t[0] for t in tarefas})


def _comparar_cartas_pendentes(client: Client, cartas_payload: list[dict]) -> int:
    """Compara cada carta com a anterior da mesma gestora (por
    data_referencia), reusando os embeddings já gerados em `chunks`. Só
    processa cartas que ainda não têm linha em `comparacoes` — idempotente.
    Carta sem antecessora comparável (primeira da gestora) ganha uma linha
    com similaridade nula, só pra não reprocessar toda hora.
    """
    ids = [c["id"] for c in cartas_payload]
    ja_comparadas: set[str] = set()
    for i in range(0, len(ids), _BATCH):
        lote = ids[i : i + _BATCH]
        rows = client.table("comparacoes").select("carta_id").in_("carta_id", lote).execute().data
        ja_comparadas.update(r["carta_id"] for r in rows)

    pendentes = [c for c in cartas_payload if c["id"] not in ja_comparadas]
    if not pendentes:
        return 0

    gestora_ids = list({c["gestora_id"] for c in pendentes})
    letras_por_gestora: dict[str, list[dict]] = {}
    for i in range(0, len(gestora_ids), _BATCH):
        lote = gestora_ids[i : i + _BATCH]
        rows = (
            client.table("cartas")
            .select("id, gestora_id, data_referencia")
            .in_("gestora_id", lote)
            .order("data_referencia")
            .execute()
            .data
        )
        for r in rows:
            letras_por_gestora.setdefault(r["gestora_id"], []).append(r)

    chunks_cache: dict[str, list[dict]] = {}

    def chunks_de(carta_id: str) -> list[dict]:
        if carta_id not in chunks_cache:
            chunks_cache[carta_id] = (
                client.table("chunks")
                .select("secao, texto, embedding")
                .eq("carta_id", carta_id)
                .execute()
                .data
            )
        return chunks_cache[carta_id]

    comparacoes_payload = []
    for carta in pendentes:
        letras = letras_por_gestora.get(carta["gestora_id"], [])
        anteriores = [
            c
            for c in letras
            if c["data_referencia"] < carta["data_referencia"] and c["id"] != carta["id"]
        ]
        if not anteriores:
            comparacoes_payload.append(
                {"carta_id": carta["id"], "carta_anterior_id": None, "similaridade": None, "trechos_novos": None}
            )
            continue

        anterior = anteriores[-1]
        similaridade, trechos = comparar_cartas(chunks_de(carta["id"]), chunks_de(anterior["id"]))
        comparacoes_payload.append(
            {
                "carta_id": carta["id"],
                "carta_anterior_id": anterior["id"],
                "similaridade": similaridade,
                "trechos_novos": trechos or None,
            }
        )

    _upsert_in_batches(client, "comparacoes", comparacoes_payload, on_conflict="carta_id")
    return sum(1 for c in comparacoes_payload if c["similaridade"] is not None)


def _extrair_graficos_pendentes(client: Client, letters: list[LetterRecord], repo_root: Path) -> int:
    """Sobe pro Storage as figuras já detectadas no crawl (sidecar
    `.figuras.json` ao lado do PDF, ver extract.py/graficos.py) — a
    detecção roda uma vez só, no crawl; aqui só rasteriza (determinístico,
    dado o mesmo bbox) e envia. Idempotente: só processa carta que ainda
    não tem nenhuma linha em `figuras` (carta sem gráfico nenhum, ou
    HTML-origem, nunca tem sidecar e é pulada sempre — barato o bastante
    pra não precisar marcar "já verificado, zero gráficos").
    """
    ids = [l.id for l in letters]
    ja_tem: set[str] = set()
    for i in range(0, len(ids), _BATCH):
        lote = ids[i : i + _BATCH]
        # .eq("ordem", 0): mesmo motivo do _embed_cartas_pendentes — sem
        # isso, carta com muitas figuras podia estourar o limite padrão de
        # 1000 linhas do PostgREST e sumir do resultado.
        rows = client.table("figuras").select("carta_id").in_("carta_id", lote).eq("ordem", 0).execute().data
        ja_tem.update(r["carta_id"] for r in rows)

    processadas = 0
    for letter in letters:
        if letter.id in ja_tem:
            continue
        raw = repo_root / letter.arquivo_raw
        sidecar = figuras_path(raw)
        if not sidecar.exists():
            continue
        try:
            metas = json.loads(sidecar.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if not metas:
            continue

        linhas = []
        for meta in metas:
            fig = FiguraDetectada(pagina=meta["pagina"], bbox=tuple(meta["bbox"]))
            try:
                png, largura, altura = rasterizar(str(raw), fig)
            except Exception:  # noqa: BLE001 - 1 figura ruim não pode travar a carta inteira
                continue
            storage_path = f"{letter.gestora}/{letter.id}/{meta['ordem']}.png"
            try:
                client.storage.from_("graficos").upload(
                    storage_path, png, {"content-type": "image/png", "upsert": "true"}
                )
            except Exception:  # noqa: BLE001 - idem
                continue
            linhas.append(
                {
                    "carta_id": letter.id,
                    "ordem": meta["ordem"],
                    "pagina": meta["pagina"],
                    "bbox": meta["bbox"],
                    "storage_path": storage_path,
                    "largura": largura,
                    "altura": altura,
                }
            )
        if linhas:
            _upsert_in_batches(client, "figuras", linhas, on_conflict="carta_id,ordem")
            processadas += 1
    return processadas


def ingest() -> tuple[int, int, int, int, int, int]:
    """Sincroniza gestoras + cartas com o Supabase. Idempotente (upsert por id).
    Notifica por push/e-mail quem segue a gestora de cada carta genuinamente
    nova, gera embeddings (busca semântica) pra cartas que ainda não têm,
    compara cada carta com a anterior da mesma gestora (detector de
    mudança), e sobe pro Storage os gráficos/tabelas já detectados no
    crawl.

    Retorna (n_gestoras, n_cartas, n_notificacoes, n_cartas_indexadas,
    n_cartas_comparadas, n_cartas_com_figuras).
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
    n_indexadas = _embed_cartas_pendentes(client, cartas_payload)
    n_comparadas = _comparar_cartas_pendentes(client, cartas_payload)
    n_figuras = _extrair_graficos_pendentes(client, letters, repo_root)

    return len(gestoras_payload), len(cartas_payload), n_notificacoes, n_indexadas, n_comparadas, n_figuras
