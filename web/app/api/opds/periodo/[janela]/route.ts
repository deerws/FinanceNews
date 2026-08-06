import { NextResponse } from "next/server";
import { verificarBasicAuth, respostaNaoAutenticado } from "@/lib/opds/auth";
import { buscarCartasDesde, paginaDaUrl, respostaFeedAquisicao } from "@/lib/opds/dados";

const TITULOS: Record<string, string> = {
  "30dias": "Últimos 30 dias",
  trimestre: "Trimestre atual",
  ano: "Ano atual",
};

function dataMinima(janela: string): string | null {
  const hoje = new Date();
  if (janela === "30dias") {
    const d = new Date(hoje);
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }
  if (janela === "trimestre") {
    const inicioMes = Math.floor(hoje.getMonth() / 3) * 3;
    return new Date(hoje.getFullYear(), inicioMes, 1).toISOString().slice(0, 10);
  }
  if (janela === "ano") {
    return new Date(hoje.getFullYear(), 0, 1).toISOString().slice(0, 10);
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ janela: string }> },
) {
  const sessao = await verificarBasicAuth(request);
  if (!sessao) return respostaNaoAutenticado();

  const { janela } = await params;
  const desde = dataMinima(janela);
  if (!desde) {
    return NextResponse.json({ error: "Período inválido." }, { status: 404 });
  }

  const pagina = paginaDaUrl(new URL(request.url));
  const { cartas, temProxima } = await buscarCartasDesde(desde, pagina);

  return respostaFeedAquisicao({
    id: `financenews:opds:periodo:${janela}`,
    title: TITULOS[janela] ?? janela,
    selfHrefBase: `/api/opds/periodo/${janela}`,
    pagina,
    cartas,
    temProxima,
  });
}
