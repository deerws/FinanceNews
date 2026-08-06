import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { classificarMudanca } from "@/lib/mudanca";
import { ReadingControls } from "./reading-controls";
import { ConteudoTexto } from "./conteudo-texto";
import { MarcarLidoButton } from "./marcar-lido-button";
import { CompartilharMenu } from "./compartilhar-menu";
import { MudancaPainel } from "./mudanca-painel";
import { AudioPlayer } from "./audio-player";
import { FilaKindleButton } from "../../fila-kindle-button";
import { FavoritoButton } from "../../favorito-button";
import { CartasRelacionadas } from "./cartas-relacionadas";
import { buscarCartasRelacionadas } from "@/lib/cartas-relacionadas";

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

function Sumario({ secoes, className = "" }: { secoes: string[]; className?: string }) {
  return (
    <nav className={`border border-border bg-muted/40 p-4 ${className}`}>
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
  );
}

export default async function CartaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: carta }, { data: comparacao }] = await Promise.all([
    supabase
      .from("cartas")
      .select(
        "id, titulo, data_referencia, trilha, url_origem, conteudo_txt, n_paginas, gestoras(nome), leituras(status, fila_kindle, favorito)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("comparacoes")
      .select("carta_anterior_id, similaridade, trechos_novos")
      .eq("carta_id", id)
      .maybeSingle(),
  ]);

  if (!carta) notFound();

  const gestoraRel = carta.gestoras as { nome: string } | { nome: string }[] | null;
  const gestoraNome = Array.isArray(gestoraRel) ? gestoraRel[0]?.nome : gestoraRel?.nome;
  const lido = carta.leituras?.[0]?.status === "lido";
  const naFilaKindle = carta.leituras?.[0]?.fila_kindle === true;
  const favorito = carta.leituras?.[0]?.favorito === true;
  const secoes = extrairSecoes(carta.conteudo_txt);
  const temSumario = secoes.length > 1;

  const cartaAnteriorId = comparacao?.carta_anterior_id ?? null;
  const severidadeMudanca = cartaAnteriorId ? classificarMudanca(comparacao?.similaridade) : null;
  const { data: cartaAnterior } = severidadeMudanca
    ? await supabase
        .from("cartas")
        .select("titulo, data_referencia, gestoras(nome)")
        .eq("id", cartaAnteriorId)
        .maybeSingle()
    : { data: null };

  const cartasRelacionadas = await buscarCartasRelacionadas(carta.id, carta.data_referencia);

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link href="/">
          <ArrowLeft /> Voltar
        </Link>} />
        <ReadingControls />
      </div>

      <div className="lg:flex lg:items-start lg:gap-10">
        {temSumario && (
          <aside className="hidden lg:block lg:w-56 lg:shrink-0">
            <Sumario secoes={secoes} className="sticky top-8" />
          </aside>
        )}

        <div className="max-w-2xl">
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
              <CompartilharMenu
                cartaId={carta.id}
                titulo={carta.titulo ?? "Carta"}
                gestoraNome={gestoraNome ?? ""}
                urlOrigem={carta.url_origem}
                nPaginas={carta.n_paginas}
              />
              <AudioPlayer cartaId={carta.id} />
              <FilaKindleButton cartaId={carta.id} naFilaInicial={naFilaKindle} />
              <FavoritoButton cartaId={carta.id} favoritoInicial={favorito} />
            </div>
          </div>

          <hr className="mb-6 border-t-2 border-foreground" />

          {severidadeMudanca && cartaAnteriorId && (
            <MudancaPainel
              severidade={severidadeMudanca}
              cartaAnteriorId={cartaAnteriorId}
              cartaAnteriorTitulo={cartaAnterior?.titulo ?? "carta anterior"}
              trechos={(comparacao?.trechos_novos as
                | { secao: string | null; texto: string; similaridade: number }[]
                | null) ?? []}
            />
          )}

          {temSumario && <Sumario secoes={secoes} className="mb-8 lg:hidden" />}

          <ConteudoTexto texto={carta.conteudo_txt} />

          <CartasRelacionadas cartas={cartasRelacionadas} />
        </div>
      </div>
    </div>
  );
}
