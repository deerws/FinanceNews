"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { alternarFavorito } from "@/lib/actions";

export function FavoritoButton({
  cartaId,
  favoritoInicial,
  compact = false,
}: {
  cartaId: string;
  favoritoInicial: boolean;
  compact?: boolean;
}) {
  const [favorito, setFavorito] = useState(favoritoInicial);
  const [pending, startTransition] = useTransition();

  function alternar(e: React.MouseEvent) {
    // usado dentro do <Link> do card da lista — não pode navegar no clique
    e.preventDefault();
    e.stopPropagation();
    const novo = !favorito;
    startTransition(async () => {
      await alternarFavorito(cartaId, novo);
      setFavorito(novo);
    });
  }

  return (
    <Button
      variant="ghost"
      size={compact ? "icon-sm" : "sm"}
      onClick={alternar}
      disabled={pending}
      aria-label={favorito ? "Remover dos favoritos" : "Favoritar"}
      title={favorito ? "Remover dos favoritos" : "Favoritar"}
    >
      <Star className={favorito ? "fill-amber-500 text-amber-500" : ""} />
      {!compact && (favorito ? "Favorito" : "Favoritar")}
    </Button>
  );
}
