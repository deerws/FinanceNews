from __future__ import annotations

import hashlib


def logical_key(gestora: str, ano: int, mes: int, slug: str) -> str:
    # Inclui o slug (não só gestora+ano+mes): a maioria das fontes publica no
    # máximo uma carta por mês, mas a Kinea publica vários posts na mesma
    # categoria no mesmo mês — sem o slug, o segundo post do mês seria
    # descartado como "duplicata" do primeiro.
    return f"{gestora}-{ano:04d}-{mes:02d}-{slug}"


def sha256_of(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()
