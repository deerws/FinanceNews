"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [erro, setErro] = useState<string | null>(null);

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
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">FinanceNews</h1>
          <p className="text-sm text-muted-foreground">
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
