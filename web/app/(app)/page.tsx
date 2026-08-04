import { createClient } from "@/lib/supabase/server";
import { FiltrosBar, type GestoraOption } from "./filtros-bar";
import { CartaCard, type CartaListItem } from "./carta-card";

const PAGE_SIZE = 60;

type Search = { [key: string]: string | string[] | undefined };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const gestorasSelecionadas =
    typeof params.gestoras === "string" ? params.gestoras.split(",").filter(Boolean) : [];
  const de = typeof params.de === "string" ? params.de : undefined;
  const ate = typeof params.ate === "string" ? params.ate : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;
  const limit = typeof params.limit === "string" ? Number(params.limit) : PAGE_SIZE;

  const supabase = await createClient();

  const gestorasQuery = supabase
    .from("gestoras")
    .select("id, nome, cartas(count)")
    .order("nome");

  let cartasQuery = supabase
    .from("cartas")
    .select("id, titulo, data_referencia, trilha, gestoras(nome), leituras(status)")
    .order("data_referencia", { ascending: false })
    .limit(limit);
  if (gestorasSelecionadas.length > 0) {
    cartasQuery = cartasQuery.in("gestora_id", gestorasSelecionadas);
  }
  if (de) cartasQuery = cartasQuery.gte("data_referencia", de);
  if (ate) cartasQuery = cartasQuery.lte("data_referencia", ate);
  if (q) cartasQuery = cartasQuery.textSearch("busca", q, { type: "websearch", config: "portuguese" });

  const [{ data: gestorasComCartas }, { data: cartas, error }] = await Promise.all([
    gestorasQuery,
    cartasQuery,
  ]);

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
