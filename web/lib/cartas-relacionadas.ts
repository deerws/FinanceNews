import { createClient } from "@/lib/supabase/server";

const JANELA_DIAS_PADRAO = 60;
const LIMITE_PADRAO = 6;

export type CartaRelacionada = {
  carta_id: string;
  titulo: string | null;
  gestora_nome: string;
  data_referencia: string;
  similaridade: number;
};

function parseEmbedding(raw: string | number[]): number[] {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

// Sem chamada de modelo nenhuma — os embeddings da carta atual e de todas
// as outras já existem em `chunks` (gerados no ingest, ver embeddings.py).
// Só precisa fazer a média dos vetores da carta atual e comparar com o
// resto via a mesma RPC da busca semântica.
function mediaNormalizada(vetores: number[][]): number[] | null {
  if (vetores.length === 0) return null;
  const dim = vetores[0].length;
  const soma = new Array(dim).fill(0);
  for (const v of vetores) {
    for (let i = 0; i < dim; i++) soma[i] += v[i];
  }
  const media = soma.map((s) => s / vetores.length);
  const norma = Math.sqrt(media.reduce((acc, x) => acc + x * x, 0));
  if (norma === 0) return null;
  return media.map((x) => x / norma);
}

export async function buscarCartasRelacionadas(
  cartaId: string,
  dataReferencia: string,
  janelaDias: number = JANELA_DIAS_PADRAO,
  limite: number = LIMITE_PADRAO,
): Promise<CartaRelacionada[]> {
  const supabase = await createClient();

  const { data: chunks } = await supabase.from("chunks").select("embedding").eq("carta_id", cartaId);
  if (!chunks || chunks.length === 0) return [];

  const media = mediaNormalizada(chunks.map((c) => parseEmbedding(c.embedding)));
  if (!media) return [];

  const dataRef = new Date(dataReferencia);
  const de = new Date(dataRef);
  de.setDate(de.getDate() - janelaDias);
  const ate = new Date(dataRef);
  ate.setDate(ate.getDate() + janelaDias);

  const { data: resultados } = await supabase.rpc("buscar_semantica", {
    query_embedding: media,
    match_count: limite + 1, // +1 pra sobrar espaço depois de excluir a própria carta
    filtro_trilha: null,
    filtro_gestoras: null,
    filtro_data_de: de.toISOString().slice(0, 10),
    filtro_data_ate: ate.toISOString().slice(0, 10),
  });

  const rankeadas = (resultados as { carta_id: string; similaridade: number }[] | null ?? [])
    .filter((r) => r.carta_id !== cartaId)
    .slice(0, limite);
  if (rankeadas.length === 0) return [];

  const { data: cartas } = await supabase
    .from("cartas")
    .select("id, titulo, data_referencia, gestoras(nome)")
    .in(
      "id",
      rankeadas.map((r) => r.carta_id),
    );

  const simPorId = new Map(rankeadas.map((r) => [r.carta_id, r.similaridade]));
  return (cartas ?? [])
    .map((c) => {
      const gestoraRel = c.gestoras as { nome: string } | { nome: string }[] | null;
      const gestora_nome = Array.isArray(gestoraRel) ? (gestoraRel[0]?.nome ?? "") : (gestoraRel?.nome ?? "");
      return {
        carta_id: c.id,
        titulo: c.titulo,
        gestora_nome,
        data_referencia: c.data_referencia,
        similaridade: simPorId.get(c.id) ?? 0,
      };
    })
    .sort((a, b) => b.similaridade - a.similaridade);
}
