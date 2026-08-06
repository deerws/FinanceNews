import { verificarBasicAuth, respostaNaoAutenticado } from "@/lib/opds/auth";
import { buscarCartasPorGestora, paginaDaUrl, respostaFeedAquisicao } from "@/lib/opds/dados";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gestoraId: string }> },
) {
  const sessao = await verificarBasicAuth(request);
  if (!sessao) return respostaNaoAutenticado();

  const { gestoraId } = await params;
  const pagina = paginaDaUrl(new URL(request.url));
  const { cartas, temProxima } = await buscarCartasPorGestora(gestoraId, pagina);

  return respostaFeedAquisicao({
    id: `financenews:opds:gestora:${gestoraId}`,
    title: cartas[0]?.gestora_nome ?? gestoraId,
    selfHrefBase: `/api/opds/gestoras/${gestoraId}`,
    pagina,
    cartas,
    temProxima,
  });
}
