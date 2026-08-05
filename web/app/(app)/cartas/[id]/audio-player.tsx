"use client";

import { useState } from "react";
import { Headphones, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AudioPlayer({ cartaId }: { cartaId: string }) {
  const [estado, setEstado] = useState<"idle" | "carregando" | "pronto" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function gerar() {
    setEstado("carregando");
    setErro(null);
    try {
      const resp = await fetch(`/api/cartas/${cartaId}/audio`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        setErro(body?.error ?? "Falha ao gerar áudio.");
        setEstado("erro");
        return;
      }
      const blob = await resp.blob();
      setAudioUrl(URL.createObjectURL(blob));
      setEstado("pronto");
    } catch {
      setErro("Falha ao gerar áudio.");
      setEstado("erro");
    }
  }

  if (estado === "pronto" && audioUrl) {
    return <audio controls autoPlay src={audioUrl} className="h-9 max-w-[240px]" />;
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" disabled={estado === "carregando"} onClick={gerar}>
        {estado === "carregando" ? <Loader2 className="animate-spin" /> : <Headphones />}
        {estado === "carregando" ? "Gerando áudio..." : "Ouvir"}
      </Button>
      {estado === "erro" && erro && <p className="max-w-xs text-xs text-destructive">{erro}</p>}
    </div>
  );
}
