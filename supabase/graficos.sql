-- FinanceNews — figuras extraídas de gráficos/tabelas do PDF.
-- Cola no SQL Editor do painel Supabase.
--
-- Primeira vez que o projeto usa Supabase Storage — só pra imagens que
-- NÓS geramos (recortes rasterizados de região gráfica detectada), nunca
-- o PDF original (essa política continua igual: PDF sempre buscado ao
-- vivo do url_origem, nunca espelhado).

create table figuras (
  id bigint generated always as identity primary key,
  carta_id text not null references cartas(id) on delete cascade,
  ordem integer not null,       -- posição de leitura dentro da carta
  pagina integer not null,
  bbox jsonb not null,          -- {x0,top,x1,bottom} — guardado pra debug/reuso futuro
  storage_path text not null unique,
  largura integer,
  altura integer,
  criado_em timestamptz not null default now(),
  unique (carta_id, ordem)
);

alter table figuras enable row level security;
create policy "leitura liberada p/ allowlist" on figuras for select using (is_allowed());

-- Bucket privado — o único jeito de baixar um objeto é pela nossa própria
-- rota autenticada (/api/cartas/[id]/figuras/[ordem]), nunca direto do
-- Storage (que não teria como checar allowlist numa tag <img> crua).
insert into storage.buckets (id, name, public)
values ('graficos', 'graficos', false)
on conflict (id) do nothing;
