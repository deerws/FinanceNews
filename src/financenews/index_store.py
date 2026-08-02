from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from .models import LetterRecord
from .storage import DEFAULT_ROOT

DEFAULT_INDEX_PATH = DEFAULT_ROOT / "index.json"


class IndexStore:
    def __init__(self, path: Path = DEFAULT_INDEX_PATH) -> None:
        self.path = path
        self._letters: dict[str, LetterRecord] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        data = json.loads(self.path.read_text(encoding="utf-8"))
        for item in data.get("letters", []):
            record = LetterRecord(**item)
            self._letters[record.id] = record

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "letters": [
                asdict(record)
                for record in sorted(self._letters.values(), key=lambda r: (r.gestora, r.ano, r.mes))
            ]
        }
        self.path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def has(self, logical_key: str) -> bool:
        return logical_key in self._letters

    def add(self, record: LetterRecord) -> None:
        self._letters[record.id] = record

    def all(self) -> list[LetterRecord]:
        return list(self._letters.values())

    def pending(self) -> list[LetterRecord]:
        return [r for r in self._letters.values() if r.status_leitura == "pendente"]
