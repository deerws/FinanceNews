import { verificarBasicAuth, respostaNaoAutenticado, clienteOpds } from "@/lib/opds/auth";
import { temPdf } from "@/lib/opds/dados";

// Proxeia o PDF original (fetch do url_origem, nunca armazenado — mesma
// política de sempre) em vez de redirecionar direto pra gestora: o
// objetivo da Fase 1 é provar a canalização inteira com o mínimo de
// variáveis desconhecidas, e várias gestoras já são conhecidas por
// bloquear/instabilidade de TLS vindo de fora do nosso próprio fetch
// (ver notas de JGP/Garde/Kapitalo no registry.yaml). Cartas sem PDF
// (coletadas como HTML) servem o texto extraído como .txt na hora —
// zero geração, zero Storage.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await verificarBasicAuth(request);
  if (!sessao) return respostaNaoAutenticado();

  const { id } = await params;
  const { data: carta } = await clienteOpds()
    .from("cartas")
    .select("id, url_origem, n_paginas, conteudo_txt")
    .eq("id", id)
    .maybeSingle();

  if (!carta) {
    return new Response("Carta não encontrada.", { status: 404 });
  }

  if (!temPdf(carta)) {
    return new Response(carta.conteudo_txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${carta.id}.txt"`,
      },
    });
  }

  const original = await fetch(carta.url_origem);
  if (!original.ok) {
    return new Response("Não consegui baixar o PDF original.", { status: 502 });
  }

  return new Response(original.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${carta.id}.pdf"`,
    },
  });
}
