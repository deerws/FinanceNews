"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { marcarLeitura } from "@/lib/actions";

export function MarcarLidoButton({
  cartaId,
  lidoInicial,
}: {
  cartaId: string;
  lidoInicial: boolean;
}) {
  const [lido, setLido] = useState(lidoInicial);
  const [pending, startTransition] = useTransition();

  function alternar() {
    const novoStatus = lido ? "pendente" : "lido";
    startTransition(async () => {
      await marcarLeitura(cartaId, novoStatus);
      setLido(!lido);
    });
  }

  return (
    <Button
      variant={lido ? "secondary" : "default"}
      size="sm"
      onClick={alternar}
      disabled={pending}
    >
      {lido ? "Marcar como não lido" : "Marcar como lido"}
    </Button>
  );
}
