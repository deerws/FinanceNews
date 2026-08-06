-- FinanceNews — extensão da busca semântica pra achar cartas relacionadas
-- (mesmo período, tópicos parecidos, geralmente de outras gestoras).
-- Cola no SQL Editor do painel Supabase, depois de busca_semantica.sql.
--
-- Só adiciona 2 parâmetros novos (com default null) na função que já
-- existe — chamadas antigas (busca semântica na lista) continuam
-- funcionando sem mudança nenhuma.
create or replace function buscar_semantica(
  query_embedding vector(384),
  match_count int default 20,
  filtro_trilha trilha[] default null,
  filtro_gestoras text[] default null,
  filtro_data_de date default null,
  filtro_data_ate date default null
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
    and (filtro_data_de is null or ca.data_referencia >= filtro_data_de)
    and (filtro_data_ate is null or ca.data_referencia <= filtro_data_ate)
  group by c.carta_id
  order by similaridade desc
  limit match_count
$$;
