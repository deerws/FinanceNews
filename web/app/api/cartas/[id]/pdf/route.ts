import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

// Extrai um intervalo de páginas do PDF original da carta e devolve como um
// PDF novo, menor. O PDF original nunca é armazenado por nós — buscamos
// direto do url_origem (site da gestora) a cada pedido.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const de = Number(searchParams.get("de"));
  const ate = Number(searchParams.get("ate"));

  if (!Number.isInteger(de) || !Number.isInteger(ate) || de < 1 || ate < de) {
    return NextResponse.json({ error: "Intervalo de páginas inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: carta } = await supabase
    .from("cartas")
    .select("id, titulo, url_origem, n_paginas")
    .eq("id", id)
    .maybeSingle();

  if (!carta) {
    return NextResponse.json({ error: "Carta não encontrada." }, { status: 404 });
  }
  if (!carta.n_paginas || ate > carta.n_paginas) {
    return NextResponse.json({ error: "Intervalo fora do número de páginas da carta." }, { status: 400 });
  }

  const original = await fetch(carta.url_origem);
  if (!original.ok) {
    return NextResponse.json({ error: "Não consegui baixar o PDF original." }, { status: 502 });
  }

  try {
    const srcBytes = await original.arrayBuffer();
    const srcDoc = await PDFDocument.load(srcBytes);
    const novoDoc = await PDFDocument.create();

    const indices = Array.from({ length: ate - de + 1 }, (_, i) => de - 1 + i);
    const paginas = await novoDoc.copyPages(srcDoc, indices);
    paginas.forEach((pagina) => novoDoc.addPage(pagina));

    const novoBytes = await novoDoc.save();
    const nomeArquivo = `${(carta.titulo ?? "carta").slice(0, 40).replace(/[^\w-]+/g, "-")}_p${de}-${ate}.pdf`;

    return new NextResponse(new Uint8Array(novoBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Não consegui processar o PDF." }, { status: 500 });
  }
}
