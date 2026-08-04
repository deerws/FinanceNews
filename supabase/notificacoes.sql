-- FinanceNews — notificações push (rodar depois de schema.sql).
-- Cola no SQL Editor do painel Supabase.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  criado_em timestamptz not null default now()
);

create table notificacao_gestoras (
  user_id uuid not null references auth.users(id) on delete cascade,
  gestora_id text not null references gestoras(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (user_id, gestora_id)
);

alter table push_subscriptions enable row level security;
alter table notificacao_gestoras enable row level security;

create policy "cada um gerencia suas próprias subscriptions" on push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "cada um gerencia suas próprias preferências" on notificacao_gestoras for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
