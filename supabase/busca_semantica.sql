-- FinanceNews — busca semântica (rodar depois de schema.sql).
-- Cola no SQL Editor do painel Supabase.
--
-- Modelo escolhido: intfloat/multilingual-e5-small (384 dimensões, roda
-- local/grátis tanto no Python do crawler quanto no Next.js via
-- transformers.js — mesmo modelo dos dois lados é obrigatório pra
-- similaridade de cosseno fazer sentido). Sem índice HNSW de propósito:
-- no volume atual (centenas de cartas) um sequential scan sobre o
-- subconjunto já filtrado por trilha/gestora é rápido o suficiente e mais
-- simples — reavaliar só se o volume crescer ordens de magnitude.

create extension if not exists vector;

create table chunks (
  id bigint generated always as identity primary key,
  carta_id text not null references cartas(id) on delete cascade,
  ordem integer not null,
  secao text,
  texto text not null,
  embedding vector(384) not null,
  criado_em timestamptz not null default now(),
  unique (carta_id, ordem)
);
create index chunks_carta_idx on chunks (carta_id);

alter table chunks enable row level security;
create policy "leitura liberada p/ allowlist" on chunks for select using (is_allowed());

-- Retorna 1 linha por carta (a melhor correspondência entre os chunks dela),
-- ordenado por similaridade — não 1 linha por chunk, pra não duplicar carta
-- na listagem do app.
create or replace function buscar_semantica(
  query_embedding vector(384),
  match_count int default 20,
  filtro_trilha trilha[] default null,
  filtro_gestoras text[] default null
)
returns table (carta_id text, similaridade float)
language sql stable
as $$
  select c.carta_id, (1 - min(c.embedding <=> query_embedding))::float as similaridade
  from chunks c
  join cartas ca on ca.id = c.carta_id
  where is_allowed()
    and (filtro_trilha is null or ca.trilha = any(filtro_trilha))
    and (filtro_gestoras is null or ca.gestora_id = any(filtro_gestoras))
  group by c.carta_id
  order by similaridade desc
  limit match_count
$$;
