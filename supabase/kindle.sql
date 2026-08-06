-- FinanceNews — Kindle/OPDS Fase 1: device tokens + fila de leitura.
-- Cola no SQL Editor do painel Supabase.
--
-- device_tokens: um token por "dispositivo" (ex.: "Kindle Paperwhite"),
-- gerado uma vez no app, exibido uma vez, colado no KOReader como senha de
-- HTTP Basic Auth (o cliente OPDS do KOReader só fala Basic Auth — sem
-- cookie de sessão, sem magic link). O "username" digitado no KOReader
-- pode ser qualquer coisa (ex. o email, só por clareza) — o token sozinho
-- já identifica o usuário. Só o hash é guardado, nunca o token cru.
create table device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  token_hash text not null unique,
  criado_em timestamptz not null default now(),
  ultimo_uso_em timestamptz,
  revogado_em timestamptz
);

alter table device_tokens enable row level security;
create policy "cada um gerencia seus próprios tokens" on device_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fila de leitura do Kindle — 2 colunas em `leituras`, não uma tabela nova.
-- `leituras` já é "a relação de um usuário com uma carta"; fila_kindle é só
-- mais uma faceta dessa relação, distinta de status (lido/pendente é
-- passivo/automático, fila_kindle é uma ação explícita do usuário — por
-- isso continuam sendo campos separados, só que na mesma linha).
alter table leituras add column fila_kindle boolean not null default false;
alter table leituras add column fila_kindle_em timestamptz;
