from __future__ import annotations

import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

import typer

from .dedupe import logical_key, sha256_of
from .extract import extract_text
from .fetch import Fetcher
from .index_store import IndexStore
from .models import LetterRecord
from .registry import load_sources
from .storage import DEFAULT_ROOT, raw_path, slugify, txt_path
from .strategies import discover

app = typer.Typer(add_completion=False)


def _slug_for(url: str) -> str:
    stem = Path(unquote(urlparse(url).path)).stem
    return slugify(stem)


@app.command()
def crawl(
    source: list[str] = typer.Option(
        [], "--source", "-s", help="IDs de fontes específicas (padrão: todas com implementado:true no registry)"
    ),
) -> None:
    """Busca cartas novas nas fontes configuradas e baixa para ./cartas/."""
    sources = load_sources()
    ids = source or [sid for sid, src in sources.items() if src.implementado]
    index = IndexStore()

    novos = 0
    with Fetcher() as fetcher:
        for sid in ids:
            src = sources.get(sid)
            if src is None:
                typer.echo(f"[{sid}] fonte não encontrada no registry — pulando")
                continue

            typer.echo(f"[{sid}] buscando cartas ({src.coleta})...")
            try:
                candidates = discover(src, fetcher)
            except Exception as exc:  # noqa: BLE001 - crawler não deve cair por causa de 1 fonte
                typer.echo(f"[{sid}] erro na descoberta: {exc}")
                continue

            if not candidates:
                typer.echo(f"[{sid}] nenhuma carta encontrada")
                continue

            for cand in candidates:
                slug = _slug_for(cand.url)
                key = logical_key(sid, cand.ano, cand.mes, slug)
                if index.has(key):
                    continue

                raw: Path | None = None
                try:
                    if cand.content_type == "pdf":
                        resp = fetcher.get(cand.url)
                        if resp is None:
                            typer.echo(f"[{sid}] falha ao baixar {cand.url}")
                            continue
                        content = resp.content
                        raw = raw_path(src.trilha, sid, cand.ano, cand.mes, slug, "pdf")
                        raw.write_bytes(content)
                        text = extract_text(raw)
                    else:
                        html_content = cand.html_content or ""
                        content = html_content.encode("utf-8")
                        raw = raw_path(src.trilha, sid, cand.ano, cand.mes, slug, "html")
                        raw.write_text(html_content, encoding="utf-8")
                        text = extract_text(raw, html_content=html_content)

                    txt = txt_path(raw)
                    txt.write_text(text, encoding="utf-8")

                    record = LetterRecord(
                        id=key,
                        gestora=sid,
                        trilha=src.trilha,
                        tier=src.tier,
                        ano=cand.ano,
                        mes=cand.mes,
                        url_origem=cand.url,
                        arquivo_raw=str(raw.relative_to(DEFAULT_ROOT.parent)),
                        arquivo_txt=str(txt.relative_to(DEFAULT_ROOT.parent)),
                        sha256=sha256_of(content),
                        baixado_em=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                        titulo=cand.titulo,
                    )
                    index.add(record)
                    novos += 1
                    typer.echo(f"[{sid}] novo: {cand.ano}-{cand.mes:02d} ({slug})")
                except Exception as exc:  # noqa: BLE001 - 1 carta ruim não pode derrubar o resto do crawl
                    typer.echo(f"[{sid}] erro processando {cand.url}: {exc}")
                    if raw is not None and raw.exists():
                        raw.unlink()

    index.save()
    typer.echo(f"\nConcluído: {novos} carta(s) nova(s).")


@app.command()
def status() -> None:
    """Resumo do que já está no repositório local de cartas."""
    index = IndexStore()
    letters = index.all()
    if not letters:
        typer.echo("Nenhuma carta no índice ainda. Rode `financenews crawl` primeiro.")
        return

    pending = index.pending()
    typer.echo(f"Total de cartas: {len(letters)}")
    typer.echo(f"Pendentes de leitura: {len(pending)}")

    by_gestora: dict[str, int] = {}
    for letter in letters:
        by_gestora[letter.gestora] = by_gestora.get(letter.gestora, 0) + 1
    typer.echo("\nPor gestora:")
    for gestora, n in sorted(by_gestora.items()):
        typer.echo(f"  {gestora}: {n}")

    recentes = sorted(letters, key=lambda letter: (letter.ano, letter.mes), reverse=True)[:8]
    typer.echo("\nCartas mais recentes (por período de referência, não data de download):")
    for letter in recentes:
        typer.echo(f"  {letter.ano}-{letter.mes:02d}  {letter.gestora} (tier {letter.tier})")


@app.command()
def ingest() -> None:
    """Sincroniza gestoras + cartas com o Supabase (idempotente, upsert por id)."""
    from dotenv import load_dotenv

    from .ingest import ingest as run_ingest

    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
    n_gestoras, n_cartas = run_ingest()
    typer.echo(f"Sincronizado: {n_gestoras} gestoras, {n_cartas} cartas.")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
