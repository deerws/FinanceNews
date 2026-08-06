import { clienteOpds } from "./auth";
import { feedAquisicao, OPDS_HEADERS_AQUISICAO, type EntryAquisicao, type LinkAquisicao } from "../opds";

export const PAGE_SIZE = 25;

export type CartaOpds = {
  id: string;
  titulo: string | null;
  data_referencia: string;
  n_paginas: number | null;
  gestora_nome: string;
};

// true = tem PDF de verdade (raw baixado era .pdf); false = coletada como
// HTML, só existe o texto extraído (Kinea, Versa, Persevera, Verdad,
// memos do Oaktree, Berkshire pré-2004 etc.) — ver ingest.py::_n_paginas.
export function temPdf(carta: { n_paginas: number | null }): boolean {
  return carta.n_paginas != null;
}

export function linkAquisicaoCarta(carta: CartaOpds): LinkAquisicao {
  if (temPdf(carta)) {
    return {
      href: `/api/opds/cartas/${carta.id}/arquivo`,
      type: "application/pdf",
      title: `${carta.id}.pdf`,
    };
  }
  return {
    href: `/api/opds/cartas/${carta.id}/arquivo`,
    type: "text/plain",
    title: `${carta.id}.txt`,
  };
}

export function cartaParaEntry(carta: CartaOpds): EntryAquisicao {
  return {
    id: `financenews:carta:${carta.id}`,
    title: carta.titulo ?? carta.id,
    updated: new Date(carta.data_referencia).toISOString(),
    author: carta.gestora_nome,
    aquisicoes: [linkAquisicaoCarta(carta)],
  };
}

function selectCartas() {
  return clienteOpds()
    .from("cartas")
    .select("id, titulo, data_referencia, n_paginas, gestoras(nome)");
}

function normalizar(rows: any[]): CartaOpds[] {
  return rows.map((r) => {
    const gestoraRel = r.gestoras as { nome: string } | { nome: string }[] | null;
    const gestora_nome = Array.isArray(gestoraRel) ? (gestoraRel[0]?.nome ?? "") : (gestoraRel?.nome ?? "");
    return {
      id: r.id,
      titulo: r.titulo,
      data_referencia: r.data_referencia,
      n_paginas: r.n_paginas,
      gestora_nome,
    };
  });
}

// Busca 1 página (PAGE_SIZE + 1 pra saber se há próxima) de cartas já
// filtradas por uma lista de ids — usado por fila/não-lidas, cujo filtro
// de verdade mora em `leituras`, não em `cartas`.
export async function buscarCartasPorIds(
  ids: string[],
  pagina: number,
): Promise<{ cartas: CartaOpds[]; temProxima: boolean }> {
  if (ids.length === 0) return { cartas: [], temProxima: false };
  const offset = (pagina - 1) * PAGE_SIZE;
  const { data } = await selectCartas()
    .in("id", ids)
    .order("data_referencia", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  const rows = normalizar(data ?? []);
  return { cartas: rows.slice(0, PAGE_SIZE), temProxima: rows.length > PAGE_SIZE };
}

export async function buscarCartasPorGestora(
  gestoraId: string,
  pagina: number,
): Promise<{ cartas: CartaOpds[]; temProxima: boolean }> {
  const offset = (pagina - 1) * PAGE_SIZE;
  const { data } = await selectCartas()
    .eq("gestora_id", gestoraId)
    .order("data_referencia", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  const rows = normalizar(data ?? []);
  return { cartas: rows.slice(0, PAGE_SIZE), temProxima: rows.length > PAGE_SIZE };
}

export async function buscarCartasDesde(
  dataMinima: string,
  pagina: number,
): Promise<{ cartas: CartaOpds[]; temProxima: boolean }> {
  const offset = (pagina - 1) * PAGE_SIZE;
  const { data } = await selectCartas()
    .gte("data_referencia", dataMinima)
    .order("data_referencia", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  const rows = normalizar(data ?? []);
  return { cartas: rows.slice(0, PAGE_SIZE), temProxima: rows.length > PAGE_SIZE };
}

// ids de cartas na fila do Kindle / não lidas — vem de `leituras`, filtrado
// manualmente por user_id (sem RLS aqui, ver lib/opds/auth.ts).
export async function idsFilaKindle(userId: string): Promise<string[]> {
  const { data } = await clienteOpds()
    .from("leituras")
    .select("carta_id")
    .eq("user_id", userId)
    .eq("fila_kindle", true);
  return (data ?? []).map((r) => r.carta_id);
}

export async function idsNaoLidos(userId: string): Promise<string[]> {
  const [{ data: todasCartas }, { data: lidas }] = await Promise.all([
    clienteOpds().from("cartas").select("id"),
    clienteOpds().from("leituras").select("carta_id").eq("user_id", userId).eq("status", "lido"),
  ]);
  const lidasSet = new Set((lidas ?? []).map((r) => r.carta_id));
  return (todasCartas ?? []).map((c) => c.id).filter((id) => !lidasSet.has(id));
}

export function paginaDaUrl(url: URL): number {
  const p = Number(url.searchParams.get("pagina"));
  return Number.isInteger(p) && p > 0 ? p : 1;
}

// Monta e serializa um feed de aquisição paginado — usado por
// fila/não-lidas/gestora/período, que só diferem em como buscam as cartas.
export function respostaFeedAquisicao(opts: {
  id: string;
  title: string;
  selfHrefBase: string;
  pagina: number;
  cartas: CartaOpds[];
  temProxima: boolean;
}): Response {
  const xml = feedAquisicao({
    id: opts.id,
    title: opts.title,
    updated: new Date().toISOString(),
    selfHref: opts.pagina > 1 ? `${opts.selfHrefBase}?pagina=${opts.pagina}` : opts.selfHrefBase,
    nextHref: opts.temProxima ? `${opts.selfHrefBase}?pagina=${opts.pagina + 1}` : undefined,
    entries: opts.cartas.map(cartaParaEntry),
  });
  return new Response(xml, { headers: OPDS_HEADERS_AQUISICAO });
}
