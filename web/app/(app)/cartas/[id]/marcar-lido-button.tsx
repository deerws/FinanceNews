"use client";

import { useState, useTransition } from "react";
import { BookCheck, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarLeitura } from "@/lib/actions";

export function MarcarLidoButton({
  cartaId,
  lidoInicial,
  compact = false,
}: {
  cartaId: string;
  lidoInicial: boolean;
  compact?: boolean;
}) {
  const [lido, setLido] = useState(lidoInicial);
  const [pending, startTransition] = useTransition();

  function alternar(e: React.MouseEvent) {
    // no card da lista o botão fica dentro do <Link> — não pode navegar no clique
    e.preventDefault();
    e.stopPropagation();
    const novoStatus = lido ? "pendente" : "lido";
    startTransition(async () => {
      await marcarLeitura(cartaId, novoStatus);
      setLido(!lido);
    });
  }

  return (
    <Button
      variant={compact ? "ghost" : lido ? "secondary" : "default"}
      size={compact ? "icon-sm" : "sm"}
      onClick={alternar}
      disabled={pending}
      aria-label={lido ? "Marcar como não lido" : "Marcar como lido"}
      title={lido ? "Marcar como não lido" : "Marcar como lido"}
    >
      {lido ? <BookCheck className="text-primary" /> : <BookOpen />}
      {!compact && (lido ? "Marcar como não lido" : "Marcar como lido")}
    </Button>
  );
}
