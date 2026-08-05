"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const TAMANHOS = ["sm", "base", "lg", "xl"] as const;
type Tamanho = (typeof TAMANHOS)[number];

const TAMANHO_CLASS: Record<Tamanho, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export function useTamanhoLeitura(): Tamanho {
  const [tamanho, setTamanho] = useState<Tamanho>("base");
  useEffect(() => {
    const salvo = localStorage.getItem("leitura-tamanho") as Tamanho | null;
    if (salvo && TAMANHOS.includes(salvo)) setTamanho(salvo);
    const onChange = () => {
      const atual = localStorage.getItem("leitura-tamanho") as Tamanho | null;
      if (atual && TAMANHOS.includes(atual)) setTamanho(atual);
    };
    window.addEventListener("leitura-tamanho-mudou", onChange);
    return () => window.removeEventListener("leitura-tamanho-mudou", onChange);
  }, []);
  return tamanho;
}

export function tamanhoClass(tamanho: Tamanho): string {
  return TAMANHO_CLASS[tamanho];
}

export function ReadingControls() {
  const [tamanhoIdx, setTamanhoIdx] = useState(1);

  useEffect(() => {
    const salvo = localStorage.getItem("leitura-tamanho") as Tamanho | null;
    const idx = salvo ? TAMANHOS.indexOf(salvo) : 1;
    setTamanhoIdx(idx >= 0 ? idx : 1);
  }, []);

  function mudarTamanho(delta: number) {
    const novoIdx = Math.min(TAMANHOS.length - 1, Math.max(0, tamanhoIdx + delta));
    setTamanhoIdx(novoIdx);
    localStorage.setItem("leitura-tamanho", TAMANHOS[novoIdx]);
    window.dispatchEvent(new Event("leitura-tamanho-mudou"));
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => mudarTamanho(-1)}
        disabled={tamanhoIdx === 0}
        aria-label="Diminuir fonte"
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => mudarTamanho(1)}
        disabled={tamanhoIdx === TAMANHOS.length - 1}
        aria-label="Aumentar fonte"
      >
        <Plus />
      </Button>
    </div>
  );
}
