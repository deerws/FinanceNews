"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const ERRO_LABEL: Record<string, string> = {
  otp_expired: "O link expirou (magic links valem por um tempo limitado). Peça um novo.",
  access_denied: "Acesso negado — esse e-mail pode não estar na lista liberada.",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("erro");
    if (codigo) {
      setStatus("error");
      setErro(ERRO_LABEL[codigo] ?? `Falha no login (${codigo}). Peça um novo link.`);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErro(error.message);
      return;
    }
    setStatus("sent");
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

        {status === "sent" ? (
          <p className="text-center text-sm">
            Te mandamos um link de acesso pro e-mail <strong>{email}</strong>.
            Abre no celular e volta aqui.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              disabled={status === "sending"}
              className="w-full"
            >
              {status === "sending" ? "Enviando..." : "Entrar"}
            </Button>
            {status === "error" && (
              <p className="text-center text-sm text-destructive">{erro}</p>
            )}
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Acesso restrito. Se seu e-mail não estiver liberado, o link não vai
          funcionar.
        </p>
      </div>
    </main>
  );
}
