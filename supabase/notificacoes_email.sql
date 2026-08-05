-- FinanceNews — preferência de alerta por e-mail (rodar depois de notificacoes.sql).
-- Reusa as seleções de gestora já feitas em notificacao_gestoras; este
-- flag só liga/desliga o canal de e-mail além do push.
-- Cola no SQL Editor do painel Supabase.

create table preferencias_notificacao (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_ativo boolean not null default false,
  atualizado_em timestamptz not null default now()
);

alter table preferencias_notificacao enable row level security;

create policy "cada um gerencia sua própria preferência" on preferencias_notificacao for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
