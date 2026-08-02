from __future__ import annotations

from pathlib import Path

import yaml

from .models import Source

DEFAULT_REGISTRY_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "registry.yaml"


def load_sources(path: Path = DEFAULT_REGISTRY_PATH) -> dict[str, Source]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    sources: dict[str, Source] = {}
    for raw in data.get("fontes", []):
        source = Source(
            id=raw["id"],
            nome=raw["nome"],
            tier=raw["tier"],
            trilha=raw["trilha"],
            cadencia=raw["cadencia"],
            coleta=raw["coleta"],
            url=raw.get("url", "TBD"),
            verificado=bool(raw.get("verificado", False)),
            implementado=bool(raw.get("implementado", False)),
            padrao_pdf=raw.get("padrao_pdf"),
            notas=raw.get("notas"),
        )
        sources[source.id] = source
    return sources


def load_policy(path: Path = DEFAULT_REGISTRY_PATH) -> dict:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data.get("meta", {}).get("politica", {})
