import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audioConfigurado, gerarAudioCarta } from "@/lib/audio";

// Gera áudio de uma carta inteira sob demanda — pode levar bastante tempo
// numa carta longa (vários trechos, uma chamada de TTS cada), daí o
// timeout estendido.
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!audioConfigurado()) {
    return NextResponse.json(
      {
        error:
          "Áudio ainda não configurado. Pra habilitar, contrate um serviço de texto-para-voz (Gemini TTS) e defina a variável de ambiente GEMINI_API_KEY.",
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: carta } = await supabase
    .from("cartas")
    .select("id, conteudo_txt")
    .eq("id", id)
    .maybeSingle();

  if (!carta) {
    return NextResponse.json({ error: "Carta não encontrada." }, { status: 404 });
  }

  try {
    const wav = await gerarAudioCarta(carta.conteudo_txt);
    return new NextResponse(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao gerar áudio." },
      { status: 502 },
    );
  }
}
