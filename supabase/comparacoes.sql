-- FinanceNews — detector de "mudança significativa" entre cartas
-- consecutivas da mesma gestora (rodar depois de busca_semantica.sql).
-- Cola no SQL Editor do painel Supabase.
--
-- Reusa os embeddings da busca semântica: compara o vetor médio da carta
-- nova com o da anterior (mesma gestora, data_referencia mais recente
-- antes da atual). Sem threshold aqui de propósito — a similaridade crua
-- é armazenada sempre que há carta anterior comparável, e o frontend
-- decide o que conta como "mudou bastante" (mais fácil de recalibrar sem
-- reprocessar). Calibração feita em cima do corpus real (233 pares
-- consecutivos, 2026-08-05): mediana de similaridade ~0.99, p10 ~0.98 —
-- cartas do dia a dia da mesma gestora são naturalmente muito parecidas
-- entre si (mesmo autor/tom/estrutura), então mesmo diferenças reais de
-- conteúdo produzem números altos em termos absolutos.

create table comparacoes (
  carta_id text primary key references cartas(id) on delete cascade,
  carta_anterior_id text references cartas(id) on delete set null,
  similaridade float,
  trechos_novos jsonb,  -- array de {secao, texto, similaridade} — trechos da carta nova sem equivalente parecido na anterior
  criado_em timestamptz not null default now()
);

alter table comparacoes enable row level security;
create policy "leitura liberada p/ allowlist" on comparacoes for select using (is_allowed());
