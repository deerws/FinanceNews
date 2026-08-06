import { createClient } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/semantic-search";
import { FiltrosBar, type GestoraOption } from "./filtros-bar";
import { CartaCard, type CartaListItem } from "./carta-card";

const PAGE_SIZE = 60;

// Busca semântica carrega um modelo ONNX na primeira chamada de uma
// instância serverless fria (~15-20s); já quente, é ~10ms. Sem isso o
// timeout padrão da função mataria a primeira busca depois de um tempo
// sem uso.
export const maxDuration = 60;

type Search = { [key: string]: string | string[] | undefined };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const gestorasSelecionadas =
    typeof params.gestoras === "string" ? params.gestoras.split(",").filter(Boolean) : [];
  const trilhasSelecionadas =
    typeof params.trilha === "string" ? params.trilha.split(",").filter(Boolean) : [];
  const de = typeof params.de === "string" ? params.de : undefined;
  const ate = typeof params.ate === "string" ? params.ate : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;
  const modoSemantico = params.modo === "semantica" && !!q;
  const naoLidos = params.naoLidos === "1";
  const limit = typeof params.limit === "string" ? Number(params.limit) : PAGE_SIZE;

  const supabase = await createClient();

  const gestorasQuery = supabase
    .from("gestoras")
    .select("id, nome, cartas(count)")
    .order("nome");

  let cartasQuery = supabase
    .from("cartas")
    .select(
      "id, titulo, data_referencia, trilha, gestoras(nome), leituras(status, fila_kindle), comparacoes!carta_id(similaridade)",
    )
    .order("data_referencia", { ascending: false })
    .limit(limit);
  if (gestorasSelecionadas.length > 0) {
    cartasQuery = cartasQuery.in("gestora_id", gestorasSelecionadas);
  }
  if (trilhasSelecionadas.length > 0) {
    cartasQuery = cartasQuery.in("trilha", trilhasSelecionadas);
  }
  if (de) cartasQuery = cartasQuery.gte("data_referencia", de);
  if (ate) cartasQuery = cartasQuery.lte("data_referencia", ate);

  let idsSemanticos: string[] | null = null;
  let erroSemantico: string | null = null;
  if (modoSemantico) {
    try {
      const embedding = await embedQuery(q!);
      const { data: resultados, error: erroRpc } = await supabase.rpc("buscar_semantica", {
        query_embedding: embedding,
        match_count: limit,
        filtro_trilha: trilhasSelecionadas.length > 0 ? trilhasSelecionadas : null,
        filtro_gestoras: gestorasSelecionadas.length > 0 ? gestorasSelecionadas : null,
      });
      if (erroRpc) throw erroRpc;
      idsSemanticos = (resultados as { carta_id: string }[] | null ?? []).map((r) => r.carta_id);
    } catch (e) {
      erroSemantico = e instanceof Error ? e.message : "Falha na busca semântica.";
    }
  }

  if (idsSemanticos !== null) {
    cartasQuery = cartasQuery.in("id", idsSemanticos.length > 0 ? idsSemanticos : ["__nenhuma__"]);
  } else if (q) {
    cartasQuery = cartasQuery.textSearch("busca", q, { type: "websearch", config: "portuguese" });
  }

  const [{ data: gestorasComCartas }, lidoIds] = await Promise.all([
    gestorasQuery,
    naoLidos
      ? supabase
          .from("leituras")
          .select("carta_id")
          .eq("status", "lido")
          .then((r) => r.data ?? [])
      : Promise.resolve<{ carta_id: string }[]>([]),
  ]);
  if (naoLidos && lidoIds.length > 0) {
    cartasQuery = cartasQuery.not(
      "id",
      "in",
      `(${lidoIds.map((l) => `"${l.carta_id}"`).join(",")})`,
    );
  }

  const { data: cartas, error } = await cartasQuery;

  if (idsSemanticos && cartas) {
    const rank = new Map(idsSemanticos.map((id, i) => [id, i]));
    (cartas as unknown as CartaListItem[]).sort(
      (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999),
    );
  }

  const gestoras: GestoraOption[] = (gestorasComCartas ?? [])
    .filter((g) => {
      const count = Array.isArray(g.cartas) ? g.cartas[0]?.count : undefined;
      return (count ?? 0) > 0;
    })
    .map((g) => ({ id: g.id, nome: g.nome }));

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <div className="border-b pb-4">
        <FiltrosBar gestoras={gestoras} />
      </div>

      {error && (
        <p className="pt-4 text-sm text-destructive">
          Erro carregando cartas: {error.message}
        </p>
      )}
      {erroSemantico && (
        <p className="pt-4 text-sm text-destructive">
          Busca semântica indisponível: {erroSemantico}
        </p>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
        {(cartas as unknown as CartaListItem[] | null)?.map((carta) => (
          <CartaCard key={carta.id} carta={carta} />
        ))}
        {cartas?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma carta encontrada com esses filtros.
          </p>
        )}
      </div>

      {cartas && cartas.length >= limit && (
        <a
          href={`?${new URLSearchParams({ ...(params as Record<string, string>), limit: String(limit + PAGE_SIZE) }).toString()}`}
          className="block py-4 text-center text-sm text-muted-foreground underline"
        >
          Carregar mais
        </a>
      )}
    </div>
  );
}
