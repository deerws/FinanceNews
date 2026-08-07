-- FinanceNews — RLS do bucket `graficos` (esqueci isso no graficos.sql).
-- Cola no SQL Editor do painel Supabase.
--
-- Marcar o bucket como privado (public: false) só desliga o acesso
-- anônimo por padrão — não cria política nenhuma de acesso pra usuário
-- autenticado. Sem isso, toda tentativa de download (mesmo pela sessão
-- normal do usuário) é negada pelo RLS de storage.objects, que por
-- padrão nega tudo. Mesma allowlist de sempre (is_allowed()).
create policy "leitura liberada p/ allowlist" on storage.objects for select
  using (bucket_id = 'graficos' and is_allowed());
