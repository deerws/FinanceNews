"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const ERRO_LABEL: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  otp_expired: "O link expirou. Peça um novo.",
  access_denied: "Acesso negado — esse e-mail pode não estar na lista liberada.",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState<"idle" | "entrando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("erro");
    if (codigo) {
      setStatus("erro");
      setErro(ERRO_LABEL[codigo] ?? `Falha no login (${codigo}).`);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("entrando");
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setStatus("erro");
      setErro(ERRO_LABEL.invalid_credentials ?? error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 border-b-4 border-double border-foreground pb-4 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight">
            FinanceNews
          </h1>
          <p className="font-serif text-sm italic text-muted-foreground">
            Cartas de gestores, organizadas pra leitura.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            type="password"
            required
            placeholder="senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={status === "entrando"} className="w-full">
            {status === "entrando" ? "Entrando..." : "Entrar"}
          </Button>
          {status === "erro" && (
            <p className="text-center text-sm text-destructive">{erro}</p>
          )}
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Acesso restrito. Sem conta ainda? Peça um convite.
        </p>
      </div>
    </main>
  );
}
