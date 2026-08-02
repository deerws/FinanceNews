# FinanceNews

Crawler pessoal para acompanhar cartas de gestores de investimento (Brasil + global). Baixa PDFs/posts, extrai o texto e organiza tudo numa pasta local para leitura — sem newsletter, sem resumo automático (isso vem depois).

## Uso

```bash
uv run financenews crawl              # busca cartas novas nas 6 fontes do lote v1
uv run financenews crawl -s genoa      # só uma fonte específica
uv run financenews status              # resumo do que já está baixado
```

## Onde as coisas ficam

```
cartas/{trilha}/{gestora}/{AAAA}-{MM}-{slug}.{pdf|html}   # arquivo original
cartas/{trilha}/{gestora}/{AAAA}-{MM}-{slug}.txt          # texto extraído
cartas/index.json                                          # índice com status de leitura
```

`cartas/` não vai pro git (PDFs de terceiros + dados gerados — ver `.gitignore`).

## Fontes

`config/registry.yaml` é a fonte da verdade: todas as gestoras mapeadas (~40), verificadas ou não,
com notas de cada uma. Hoje só 6 têm estratégia de coleta implementada (`implementado: true`):

| Fonte | Trilha | Coleta |
|---|---|---|
| Genoa Capital | macro_br | pattern_wp |
| Bahia Asset | macro_br | pattern_wp |
| Novus Capital | macro_br | pattern_wp |
| Dynamo | equity_br | scrape_index |
| Guepardo | equity_br | scrape_index |
| Kinea | macro_br | scrape_index (posts HTML, não PDF) |

Verde (site é uma SPA) e JGP (conexão bloqueada neste ambiente, possivelmente só daqui) ficaram de
fora do v1 — ver notas na entrada de cada uma no registry.

## Adicionar uma fonte nova

1. Marcar `verificado: true` no registry depois de confirmar a URL manualmente.
2. Se for `pattern_wp`: adicionar um builder em `src/financenews/strategies/pattern_wp.py` (`_BUILDERS`).
3. Se for `scrape_index`: o fallback genérico em `strategies/scrape_index.py` já tenta achar links
   `.pdf` na página índice — só especializar (como Kinea/Dynamo/Guepardo) se o site fugir do padrão.
4. Marcar `implementado: true` e adicionar o id em `V1_SOURCES` (`cli.py`) se quiser que entre no
   `crawl` por padrão.

## Próximos passos (de propósito fora do v1)

- Resto das fontes verificadas + as `TBD` (precisam descoberta manual de URL).
- Agendamento automático (crawl periódico).
- Detecção de mudança significativa entre cartas consecutivas da mesma gestora.
- Newsletter personalizado.
