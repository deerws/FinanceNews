import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link href="/">
          <ArrowLeft /> Voltar
        </Link>} />
        <ReadingControls />
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{TRILHA_LABEL[carta.trilha] ?? carta.trilha}</Badge>
          <span>{formatarData(carta.data_referencia)}</span>
        </div>
        <h1 className="text-2xl font-semibold leading-tight">{carta.titulo}</h1>
        <p className="text-muted-foreground">{gestoraNome}</p>

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

      <hr className="mb-4" />

      <ConteudoTexto texto={carta.conteudo_txt} />
    </div>
  );
}
