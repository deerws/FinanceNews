"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function TrocarSenhaForm() {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [status, setStatus] = useState<"idle" | "salvando" | "erro" | "salvo">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setStatus("erro");
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setStatus("erro");
      setErro("As senhas não coincidem.");
      return;
    }

    setStatus("salvando");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setStatus("erro");
      setErro(error.message);
      return;
    }
    setStatus("salvo");
    setSenha("");
    setConfirmacao("");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
      <input
        type="password"
        required
        minLength={8}
        placeholder="Nova senha (mín. 8 caracteres)"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <input
        type="password"
        required
        placeholder="Confirme a nova senha"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" disabled={status === "salvando"} size="sm">
        {status === "salvando" ? "Salvando..." : "Trocar senha"}
      </Button>
      {status === "erro" && <p className="text-sm text-destructive">{erro}</p>}
      {status === "salvo" && (
        <p className="text-sm text-green-600 dark:text-green-500">Senha atualizada.</p>
      )}
    </form>
  );
}
