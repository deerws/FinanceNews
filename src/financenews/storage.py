from __future__ import annotations

import re
import unicodedata
from pathlib import Path

DEFAULT_ROOT = Path(__file__).resolve().parent.parent.parent / "cartas"


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return normalized or "carta"


def letter_dir(trilha: str, gestora: str, root: Path = DEFAULT_ROOT) -> Path:
    path = root / trilha / gestora
    path.mkdir(parents=True, exist_ok=True)
    return path


def raw_path(trilha: str, gestora: str, ano: int, mes: int, slug: str, ext: str, root: Path = DEFAULT_ROOT) -> Path:
    return letter_dir(trilha, gestora, root) / f"{ano:04d}-{mes:02d}-{slug}.{ext}"


def txt_path(raw: Path) -> Path:
    return raw.with_suffix(".txt")


def figuras_path(raw: Path) -> Path:
    return raw.parent / f"{raw.stem}.figuras.json"
