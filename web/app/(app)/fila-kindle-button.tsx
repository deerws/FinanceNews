"use client";

import { useState, useTransition } from "react";
import { BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { alternarFilaKindle } from "@/lib/actions";

export function FilaKindleButton({
  cartaId,
  naFilaInicial,
  compact = false,
}: {
  cartaId: string;
  naFilaInicial: boolean;
  compact?: boolean;
}) {
  const [naFila, setNaFila] = useState(naFilaInicial);
  const [pending, startTransition] = useTransition();

  function alternar(e: React.MouseEvent) {
    // usado dentro do <Link> do card da lista — não pode navegar no clique
    e.preventDefault();
    e.stopPropagation();
    const novo = !naFila;
    startTransition(async () => {
      await alternarFilaKindle(cartaId, novo);
      setNaFila(novo);
    });
  }

  return (
    <Button
      variant={naFila ? "secondary" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      onClick={alternar}
      disabled={pending}
      aria-label={naFila ? "Remover da fila do Kindle" : "Adicionar à fila do Kindle"}
      title={naFila ? "Remover da fila do Kindle" : "Adicionar à fila do Kindle"}
    >
      <BookMarked />
      {!compact && (naFila ? "Na fila do Kindle" : "Adicionar ao Kindle")}
    </Button>
  );
}
