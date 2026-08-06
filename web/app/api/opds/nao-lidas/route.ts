import { verificarBasicAuth, respostaNaoAutenticado } from "@/lib/opds/auth";
import { buscarCartasPorIds, idsNaoLidos, paginaDaUrl, respostaFeedAquisicao } from "@/lib/opds/dados";

export async function GET(request: Request) {
  const sessao = await verificarBasicAuth(request);
  if (!sessao) return respostaNaoAutenticado();

  const pagina = paginaDaUrl(new URL(request.url));
  const ids = await idsNaoLidos(sessao.userId);
  const { cartas, temProxima } = await buscarCartasPorIds(ids, pagina);

  return respostaFeedAquisicao({
    id: "financenews:opds:nao-lidas",
    title: "Não lidas",
    selfHrefBase: "/api/opds/nao-lidas",
    pagina,
    cartas,
    temProxima,
  });
}
