import { verificarBasicAuth, respostaNaoAutenticado } from "@/lib/opds/auth";
import { feedNavegacao, OPDS_HEADERS_NAVEGACAO } from "@/lib/opds";

const JANELAS = [
  { id: "30dias", title: "Últimos 30 dias" },
  { id: "trimestre", title: "Trimestre atual" },
  { id: "ano", title: "Ano atual" },
] as const;

export async function GET(request: Request) {
  const sessao = await verificarBasicAuth(request);
  if (!sessao) return respostaNaoAutenticado();

  const agora = new Date().toISOString();
  const xml = feedNavegacao({
    id: "financenews:opds:periodo",
    title: "Por período",
    updated: agora,
    selfHref: "/api/opds/periodo",
    entries: JANELAS.map((j) => ({
      id: `financenews:opds:periodo:${j.id}`,
      title: j.title,
      updated: agora,
      href: `/api/opds/periodo/${j.id}`,
      kind: "acquisition" as const,
    })),
  });

  return new Response(xml, { headers: OPDS_HEADERS_NAVEGACAO });
}
