import { verificarBasicAuth, respostaNaoAutenticado } from "@/lib/opds/auth";
import { feedNavegacao, OPDS_HEADERS_NAVEGACAO } from "@/lib/opds";

export async function GET(request: Request) {
  const sessao = await verificarBasicAuth(request);
  if (!sessao) return respostaNaoAutenticado();

  const agora = new Date().toISOString();
  const xml = feedNavegacao({
    id: "financenews:opds:root",
    title: "FinanceNews",
    updated: agora,
    selfHref: "/api/opds",
    entries: [
      {
        id: "financenews:opds:fila",
        title: "Fila de leitura",
        updated: agora,
        href: "/api/opds/fila",
        kind: "acquisition",
        content: "Cartas que você marcou pra ler no Kindle.",
      },
      {
        id: "financenews:opds:nao-lidas",
        title: "Não lidas",
        updated: agora,
        href: "/api/opds/nao-lidas",
        kind: "acquisition",
        content: "Tudo que você ainda não marcou como lido, mais recente primeiro.",
      },
      {
        id: "financenews:opds:gestoras",
        title: "Por gestora",
        updated: agora,
        href: "/api/opds/gestoras",
        kind: "navigation",
      },
      {
        id: "financenews:opds:periodo",
        title: "Por período",
        updated: agora,
        href: "/api/opds/periodo",
        kind: "navigation",
      },
    ],
  });

  return new Response(xml, { headers: OPDS_HEADERS_NAVEGACAO });
}
