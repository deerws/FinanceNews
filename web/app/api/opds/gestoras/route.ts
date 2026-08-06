import { verificarBasicAuth, respostaNaoAutenticado } from "@/lib/opds/auth";
import { clienteOpds } from "@/lib/opds/auth";
import { feedNavegacao, OPDS_HEADERS_NAVEGACAO } from "@/lib/opds";

export async function GET(request: Request) {
  const sessao = await verificarBasicAuth(request);
  if (!sessao) return respostaNaoAutenticado();

  const { data } = await clienteOpds()
    .from("gestoras")
    .select("id, nome, cartas(count)")
    .order("nome");

  const gestoras = (data ?? []).filter((g) => {
    const count = Array.isArray(g.cartas) ? g.cartas[0]?.count : undefined;
    return (count ?? 0) > 0;
  });

  const agora = new Date().toISOString();
  const xml = feedNavegacao({
    id: "financenews:opds:gestoras",
    title: "Por gestora",
    updated: agora,
    selfHref: "/api/opds/gestoras",
    entries: gestoras.map((g) => ({
      id: `financenews:opds:gestora:${g.id}`,
      title: g.nome,
      updated: agora,
      href: `/api/opds/gestoras/${g.id}`,
      kind: "acquisition" as const,
    })),
  });

  return new Response(xml, { headers: OPDS_HEADERS_NAVEGACAO });
}
