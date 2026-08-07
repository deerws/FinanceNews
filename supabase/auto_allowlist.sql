-- FinanceNews — libera acesso automático pra quem se cadastra, sem precisar
-- de intervenção manual (inserir email em usuarios_permitidos na mão).
--
-- Mantém a tabela usuarios_permitidos como está (dá pra revogar acesso de
-- alguém específico depois, deletando a linha) — só passa a preenchê-la
-- sozinha a cada novo cadastro em auth.users, via trigger no schema auth
-- (padrão documentado do Supabase pra esse tipo de auto-provisionamento).
-- Cola no SQL Editor do painel Supabase.
create or replace function liberar_novo_usuario() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into usuarios_permitidos (email) values (new.email)
    on conflict (email) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_liberar_novo_usuario on auth.users;
create trigger trg_liberar_novo_usuario
  after insert on auth.users
  for each row execute function liberar_novo_usuario();
