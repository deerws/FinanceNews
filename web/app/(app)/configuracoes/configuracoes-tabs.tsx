"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificacoesForm, type GestoraOption } from "./notificacoes-form";
import { TrocarSenhaForm } from "./trocar-senha-form";

type Aba = "notificacoes" | "senha";

export function ConfiguracoesTabs({
  gestoras,
  ativasIniciais,
}: {
  gestoras: GestoraOption[];
  ativasIniciais: string[];
}) {
  const [aba, setAba] = useState<Aba>("notificacoes");

  return (
    <div>
      <div className="mb-6 flex gap-4 border-b">
        {(
          [
            ["notificacoes", "Notificações"],
            ["senha", "Senha"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            className={cn(
              "pb-2 text-sm font-medium",
              aba === valor
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "notificacoes" ? (
        <NotificacoesForm gestoras={gestoras} ativasIniciais={ativasIniciais} />
      ) : (
        <TrocarSenhaForm />
      )}
    </div>
  );
}
