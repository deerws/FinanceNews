import { verificarBasicAuth, respostaNaoAutenticado } from "@/lib/opds/auth";
import { buscarCartasPorIds, idsFilaKindle, paginaDaUrl, respostaFeedAquisicao } from "@/lib/opds/dados";

export async function GET(request: Request) {
  const sessao = await verificarBasicAuth(request);
  if (!sessao) return respostaNaoAutenticado();

  const pagina = paginaDaUrl(new URL(request.url));
  const ids = await idsFilaKindle(sessao.userId);
  const { cartas, temProxima } = await buscarCartasPorIds(ids, pagina);

  return respostaFeedAquisicao({
    id: "financenews:opds:fila",
    title: "Fila de leitura",
    selfHrefBase: "/api/opds/fila",
    pagina,
    cartas,
    temProxima,
  });
}
