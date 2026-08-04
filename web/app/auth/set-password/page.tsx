"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function SetPasswordPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [status, setStatus] = useState<"idle" | "salvando" | "erro">("idle");
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
    router.push("/");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 border-b-4 border-double border-foreground pb-4 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Defina sua senha
          </h1>
          <p className="font-serif text-sm italic text-muted-foreground">
            Só precisa fazer isso uma vez.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
            placeholder="Confirme a senha"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={status === "salvando"} className="w-full">
            {status === "salvando" ? "Salvando..." : "Salvar e entrar"}
          </Button>
          {status === "erro" && (
            <p className="text-center text-sm text-destructive">{erro}</p>
          )}
        </form>
      </div>
    </main>
  );
}
