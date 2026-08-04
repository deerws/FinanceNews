-- FinanceNews — schema Fase 1 (lista, filtro, leitura, allowlist).
-- Rodar uma vez no SQL Editor do painel Supabase (Project > SQL Editor > New query).
-- chunks/pgvector (busca semântica) fica para a Fase 3, de propósito não criado aqui.

create type trilha as enum ('equity_br', 'macro_br', 'global', 'complemento');

create table gestoras (
  id text primary key,               -- mesmo id do registry.yaml (ex: 'genoa')
  nome text not null,
  slug text not null unique,
  trilha trilha not null,
  site text,
  tier smallint not null default 3,
  created_at timestamptz not null default now()
);

create table cartas (
  id text primary key,                          -- mesmo id lógico do index.json (ex: 'genoa-2026-06-...')
  gestora_id text not null references gestoras(id),
  titulo text,                                    -- da fonte quando existe; fallback gerado na ingestão
  data_referencia date not null,                  -- ano/mes do index.json, dia 1
  data_publicacao timestamptz,                    -- baixado_em do scraper (proxy; nem toda fonte expõe data real de publicação)
  url_origem text not null,
  conteudo_txt text not null,                     -- texto extraído — é o que a Fase 1 lê, não o PDF
  hash text not null unique,                       -- sha256 do scraper — dedupe adicional por conteúdo
  n_paginas integer,                               -- null para posts HTML
  trilha trilha not null,                          -- desnormalizado, evita join só pra filtrar
  tier smallint not null,
  criado_em timestamptz not null default now(),
  busca tsvector generated always as
    (to_tsvector('portuguese', coalesce(titulo,'') || ' ' || conteudo_txt)) stored
);
create index cartas_gestora_data_idx on cartas (gestora_id, data_referencia desc);
create index cartas_busca_idx on cartas using gin (busca);

create table leituras (
  user_id uuid not null references auth.users(id) on delete cascade,
  carta_id text not null references cartas(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','lido')),
  anotacao text,
  lido_em timestamptz,
  primary key (user_id, carta_id)
);

create table usuarios_permitidos (
  email text primary key,
  criado_em timestamptz not null default now()
);

-- RLS: leitura de gestoras/cartas liberada só pra quem está na allowlist;
-- leituras é por dono (user_id = auth.uid()).
create or replace function is_allowed() returns boolean
  language sql security definer stable as
  $$ select exists (select 1 from usuarios_permitidos where email = auth.email()) $$;

alter table gestoras enable row level security;
alter table cartas enable row level security;
alter table leituras enable row level security;

create policy "leitura liberada p/ allowlist" on gestoras for select using (is_allowed());
create policy "leitura liberada p/ allowlist" on cartas for select using (is_allowed());
create policy "cada um vê só as próprias leituras" on leituras for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Coloque seu email (e dos amigos, quando for a hora) aqui:
-- insert into usuarios_permitidos (email) values ('paes.andre33@gmail.com');
