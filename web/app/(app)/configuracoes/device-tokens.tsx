"use client";

import { useState } from "react";
import { KeyRound, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gerarDeviceToken, revogarDeviceToken } from "@/lib/actions";

export type DeviceToken = {
  id: string;
  nome: string;
  criado_em: string;
  ultimo_uso_em: string | null;
  revogado_em: string | null;
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function DeviceTokens({ tokensIniciais }: { tokensIniciais: DeviceToken[] }) {
  const [tokens, setTokens] = useState(tokensIniciais.filter((t) => !t.revogado_em));
  const [nome, setNome] = useState("");
  const [gerando, setGerando] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<{ nome: string; valor: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setErro(null);
    setGerando(true);
    try {
      const token = await gerarDeviceToken(nome.trim());
      setTokenGerado({ nome: nome.trim(), valor: token });
      setTokens((prev) => [
        { id: crypto.randomUUID(), nome: nome.trim(), criado_em: new Date().toISOString(), ultimo_uso_em: null, revogado_em: null },
        ...prev,
      ]);
      setNome("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar token.");
    } finally {
      setGerando(false);
    }
  }

  async function revogar(id: string) {
    await revogarDeviceToken(id);
    setTokens((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-sm text-muted-foreground">
          Pra usar no leitor de OPDS do KOReader (Kindle) — o cliente só aceita usuário/senha (HTTP
          Basic Auth), não o login normal do app. Use qualquer usuário e o token como senha.
        </p>
        <form onSubmit={gerar} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            required
            placeholder="Nome do dispositivo (ex.: Kindle Paperwhite)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="sm" disabled={gerando}>
            <KeyRound /> {gerando ? "Gerando..." : "Gerar token"}
          </Button>
        </form>
        {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      </div>

      {tokenGerado && (
        <div className="border-2 border-amber-600/50 bg-amber-600/5 p-4 dark:border-amber-500/50 dark:bg-amber-500/5">
          <p className="mb-2 text-sm font-medium">
            Token de &ldquo;{tokenGerado.nome}&rdquo; — copie agora, ele não aparece de novo:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border border-input bg-background px-3 py-2 text-xs">
              {tokenGerado.valor}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(tokenGerado.valor)}
            >
              <Copy /> Copiar
            </Button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
          Dispositivos autorizados
        </p>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dispositivo ainda.</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 border p-3 text-sm">
                <div>
                  <p className="font-medium">{t.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    criado em {formatarData(t.criado_em)}
                    {t.ultimo_uso_em ? ` · último uso em ${formatarData(t.ultimo_uso_em)}` : " · nunca usado"}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => revogar(t.id)} aria-label="Revogar">
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
