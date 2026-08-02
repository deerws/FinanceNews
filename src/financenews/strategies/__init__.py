from __future__ import annotations

from ..fetch import Fetcher
from ..models import Candidate, Source
from . import pattern_wp, scrape_index

_BY_COLETA = {
    "pattern_wp": pattern_wp.discover,
    "scrape_index": scrape_index.discover,
}


def discover(source: Source, fetcher: Fetcher) -> list[Candidate]:
    handler = _BY_COLETA.get(source.coleta)
    if handler is None:
        raise ValueError(f"sem estratégia de coleta implementada para '{source.coleta}'")
    return handler(source, fetcher)
