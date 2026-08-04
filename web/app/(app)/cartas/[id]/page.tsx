import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ReadingControls } from "./reading-controls";
import { ConteudoTexto } from "./conteudo-texto";
import { MarcarLidoButton } from "./marcar-lido-button";

const TRILHA_LABEL: Record<string, string> = {
  equity_br: "Equity BR",
  macro_br: "Macro BR",
  global: "Global",
  complemento: "Complemento",
};

function formatarData(dataRef: string): string {
  const [ano, mes] = dataRef.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Mesma lógica de índice que ConteudoTexto usa pra gerar os ids das seções —
// splita nos mesmos blocos e conta só os que são título ("## ").
function extrairSecoes(texto: string): string[] {
  return texto
    .split(/\n{2,}/)
    .filter((b) => b.trim().startsWith("## "))
    .map((b) => b.slice(3).trim());
}

export default async function CartaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: carta } = await supabase
    .from("cartas")
    .select(
      "id, titulo, data_referencia, trilha, url_origem, conteudo_txt, gestoras(nome), leituras(status)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!carta) notFound();

  const gestoraRel = carta.gestoras as { nome: string } | { nome: string }[] | null;
  const gestoraNome = Array.isArray(gestoraRel) ? gestoraRel[0]?.nome : gestoraRel?.nome;
  const lido = carta.leituras?.[0]?.status === "lido";
  const secoes = extrairSecoes(carta.conteudo_txt);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link href="/">
          <ArrowLeft /> Voltar
        </Link>} />
        <ReadingControls />
      </div>

      <div className="mb-6 space-y-3">
        <div className="text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
          {TRILHA_LABEL[carta.trilha] ?? carta.trilha}
        </div>
        <h1 className="font-serif text-3xl font-bold leading-tight text-balance">
          {carta.titulo}
        </h1>
        <p className="font-serif text-base italic text-muted-foreground">
          {gestoraNome} · {formatarData(carta.data_referencia)}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <MarcarLidoButton cartaId={carta.id} lidoInicial={lido} />
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={carta.url_origem} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Ver original
              </a>
            }
          />
        </div>
      </div>

      <hr className="mb-6 border-t-2 border-foreground" />

      {secoes.length > 1 && (
        <nav className="mb-8 border border-border bg-muted/40 p-4">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
            Sumário
          </p>
          <ol className="space-y-1.5">
            {secoes.map((secao, i) => (
              <li key={i}>
                <a
                  href={`#secao-${i}`}
                  className="font-serif text-sm underline decoration-border underline-offset-2 hover:decoration-foreground"
                >
                  {secao}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <ConteudoTexto texto={carta.conteudo_txt} />
    </div>
  );
}
