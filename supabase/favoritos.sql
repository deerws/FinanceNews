-- FinanceNews — favoritar carta (rodar em qualquer ordem em relação aos
-- outros scripts). Cola no SQL Editor do painel Supabase.
--
-- Mesmo padrão de fila_kindle: 2 colunas em `leituras`, não uma tabela
-- nova — é a mesma relação usuário↔carta, só mais uma faceta dela.
alter table leituras add column favorito boolean not null default false;
alter table leituras add column favorito_em timestamptz;
