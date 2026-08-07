import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Serve a imagem recortada de um gráfico/tabela detectado no PDF. O bucket
// `graficos` é privado (sem policy de acesso público) — a única forma de
// baixar um objeto é por aqui, autenticado pela sessão normal do usuário
// (RLS via is_allowed() já cobre `figuras`, mesma allowlist de sempre).
// Uma tag <img> não consegue mandar Authorization header, então servir
// via rota própria é o caminho mais simples — mesmo padrão já usado pro
// PDF e pro áudio.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; ordem: string }> },
) {
  const { id, ordem } = await params;
  const ordemNum = Number(ordem);
  if (!Number.isInteger(ordemNum) || ordemNum < 0) {
    return NextResponse.json({ error: "Ordem inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: figura } = await supabase
    .from("figuras")
    .select("storage_path")
    .eq("carta_id", id)
    .eq("ordem", ordemNum)
    .maybeSingle();

  if (!figura) {
    return NextResponse.json({ error: "Figura não encontrada." }, { status: 404 });
  }

  const { data: blob, error } = await supabase.storage.from("graficos").download(figura.storage_path);
  if (error || !blob) {
    return NextResponse.json({ error: "Não consegui baixar a imagem." }, { status: 502 });
  }

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
