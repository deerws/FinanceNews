# FinanceNews

Crawler pessoal para acompanhar cartas de gestores de investimento (Brasil + global). Baixa PDFs/posts, extrai o texto e organiza tudo numa pasta local para leitura — sem newsletter, sem resumo automático (isso vem depois). Roda sozinho todo dia às 7h via cron.

## Uso

```bash
uv run financenews crawl              # busca cartas novas em todas as fontes com implementado:true
uv run financenews crawl -s genoa      # só uma fonte específica
uv run financenews status              # resumo do que já está baixado
```

## Onde as coisas ficam

```
cartas/{trilha}/{gestora}/{AAAA}-{MM}-{slug}.{pdf|html}   # arquivo original
cartas/{trilha}/{gestora}/{AAAA}-{MM}-{slug}.txt          # texto extraído
cartas/index.json                                          # índice com status de leitura
cartas/crawl.log                                           # saída da rodada diária do cron
```

`cartas/` não vai pro git (PDFs de terceiros + dados gerados — ver `.gitignore`).

## Fontes

`config/registry.yaml` é a fonte da verdade: todas as gestoras mapeadas (~38), verificadas ou não,
com notas de cada uma. 13 têm estratégia de coleta funcionando (`implementado: true`) — é essa a
lista que `crawl` usa por padrão quando roda sem `-s`:

| Fonte | Trilha | Coleta |
|---|---|---|
| Genoa Capital | macro_br | pattern_wp |
| Bahia Asset | macro_br | pattern_wp |
| Novus Capital | macro_br | pattern_wp |
| Armor Capital | macro_br | pattern_wp |
| AZ Quest | macro_br | pattern_wp |
| Dynamo | equity_br | scrape_index |
| Guepardo | equity_br | scrape_index |
| Brasil Capital | equity_br | scrape_index |
| Organon Capital | equity_br | scrape_index |
| Versa Asset | equity_br | scrape_index (posts HTML) |
| Kinea | macro_br | scrape_index (posts HTML) |
| Persevera | macro_br | scrape_index (via RSS) |
| Oaktree — Howard Marks Memos | global | scrape_index |

**Fora do ar por motivo técnico real** (não por falta de tentativa — cada uma tem nota detalhada no
registry): Verde e Kínitro são SPAs (conteúdo só via JS, sem HTML estático); JGP e Garde recusam
conexão TLS a partir deste ambiente (pode ser bloqueio de IP de nuvem — vale retestar de outra rede);
Kapitalo não expõe as cartas mensais em nenhuma página estática encontrada.

## Adicionar uma fonte nova

1. Marcar `verificado: true` no registry depois de confirmar a URL manualmente.
2. Se for `pattern_wp`: adicionar um builder em `src/financenews/strategies/pattern_wp.py` (`_BUILDERS`).
   Cuidado com soft-404 (servidor devolve 200 com HTML de erro em vez de 404 de verdade) — o `discover()`
   já valida `content-type`, mas vale conferir manualmente com `curl -sI` antes de confiar no padrão.
3. Se for `scrape_index`: o fallback genérico em `strategies/scrape_index.py` já acha links `.pdf` e
   extrai trimestre/semestre/mês-ano do nome do arquivo — só especializar (como Kinea/Dynamo/Guepardo/
   Versa/Oaktree/Persevera) se o site fugir desse padrão (posts HTML, RSS, JS, etc.).
4. Marcar `implementado: true` no registry — o `crawl` pega a lista padrão de lá automaticamente,
   não precisa editar `cli.py`.

## Próximos passos (de propósito fora do escopo atual)

- As ~20 fontes `TBD` no registry (precisam descoberta manual de URL, não é só código).
- As 5 fontes bloqueadas acima, se algum bloqueio se resolver (ex.: testar JGP/Garde de outra rede).
- Detecção de mudança significativa entre cartas consecutivas da mesma gestora.
- Newsletter personalizado.
