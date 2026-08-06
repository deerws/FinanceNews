"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const ERRO_LABEL: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  otp_expired: "O link expirou. Peça um novo.",
  access_denied: "Acesso negado — esse e-mail pode não estar na lista liberada.",
};

type Modo = "entrar" | "cadastrar";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [status, setStatus] = useState<"idle" | "enviando" | "erro" | "cadastrado">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("erro");
    if (codigo) {
      setStatus("erro");
      setErro(ERRO_LABEL[codigo] ?? `Falha no login (${codigo}).`);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
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

  async function handleCadastrar(e: React.FormEvent) {
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

    setStatus("enviando");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password: senha });

    if (error) {
      setStatus("erro");
      setErro(error.message);
      return;
    }
    setStatus("cadastrado");
  }

  if (status === "cadastrado") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="font-serif text-2xl font-bold">Quase lá</h1>
          <p className="text-sm text-muted-foreground">
            Te mandamos um e-mail de confirmação pra <strong>{email}</strong>.
            Clique no link e você já entra direto — não precisa fazer mais nada
            aqui. Se o e-mail não estiver na lista liberada, você terá conta
            mas não verá conteúdo.
          </p>
        </div>
      </main>
    );
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

        <form
          onSubmit={modo === "entrar" ? handleEntrar : handleCadastrar}
          className="space-y-3"
        >
          <input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="relative">
            <input
              type={mostrarSenha ? "text" : "password"}
              required
              minLength={modo === "cadastrar" ? 8 : undefined}
              placeholder={modo === "cadastrar" ? "senha (mín. 8 caracteres)" : "senha"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {modo === "cadastrar" && (
            <input
              type={mostrarSenha ? "text" : "password"}
              required
              placeholder="confirme a senha"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
          <Button type="submit" disabled={status === "enviando"} className="w-full">
            {status === "enviando"
              ? "Aguarde..."
              : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
          </Button>
          {status === "erro" && (
            <p className="text-center text-sm text-destructive">{erro}</p>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setModo(modo === "entrar" ? "cadastrar" : "entrar");
            setStatus("idle");
            setErro(null);
          }}
          className="block w-full text-center text-xs text-muted-foreground underline"
        >
          {modo === "entrar" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Acesso restrito ao conteúdo — sua conta só vê as cartas se o e-mail
          estiver liberado.
        </p>
      </div>
    </main>
  );
}
