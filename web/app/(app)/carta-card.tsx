import Link from "next/link";
import { classificarMudanca, SEVERIDADE_CLASSES, SEVERIDADE_LABEL } from "@/lib/mudanca";
import { FavoritoButton } from "./favorito-button";
import { MarcarLidoButton } from "./cartas/[id]/marcar-lido-button";

const TRILHA_LABEL: Record<string, string> = {
  equity_br: "Equity BR",
  macro_br: "Macro BR",
  global: "Global",
  complemento: "Complemento",
};

export type CartaListItem = {
  id: string;
  titulo: string | null;
  data_referencia: string;
  trilha: string;
  gestoras: { nome: string } | { nome: string }[] | null;
  leituras: { status: string; favorito: boolean }[] | null;
  // carta_id em `comparacoes` é chave primária (1:1), então o PostgREST
  // embeda como objeto único, não array — diferente de `leituras`, cuja
  // chave (user_id, carta_id) permite várias linhas por carta.
  comparacoes: { similaridade: number | null } | { similaridade: number | null }[] | null;
};

function nomeGestora(carta: CartaListItem): string {
  const g = carta.gestoras;
  if (!g) return "";
  return Array.isArray(g) ? (g[0]?.nome ?? "") : g.nome;
}

function similaridadeMudanca(carta: CartaListItem): number | null {
  const c = carta.comparacoes;
  if (!c) return null;
  const row = Array.isArray(c) ? c[0] : c;
  return row?.similaridade ?? null;
}

function formatarData(dataRef: string): string {
  const [ano, mes] = dataRef.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function CartaCard({ carta }: { carta: CartaListItem }) {
  const lido = carta.leituras?.[0]?.status === "lido";
  const favorito = carta.leituras?.[0]?.favorito === true;
  const similaridade = similaridadeMudanca(carta);
  const severidade = classificarMudanca(similaridade);

  return (
    <Link
      href={`/cartas/${carta.id}`}
      className="group flex flex-col gap-1 border-b py-4 transition-colors lg:py-5"
    >
      <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
        <span>{TRILHA_LABEL[carta.trilha] ?? carta.trilha}</span>
        <span className="text-border">/</span>
        <span className="font-sans font-normal normal-case tracking-normal text-muted-foreground">
          {formatarData(carta.data_referencia)}
        </span>
        {severidade && (
          <span className={`font-sans font-normal normal-case tracking-normal ${SEVERIDADE_CLASSES[severidade]}`}>
            · {SEVERIDADE_LABEL[severidade]}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-xl font-semibold leading-snug group-hover:underline">
          {carta.titulo}
        </p>
        <div className="flex shrink-0 items-center">
          <FavoritoButton cartaId={carta.id} favoritoInicial={favorito} compact />
          <MarcarLidoButton cartaId={carta.id} lidoInicial={lido} compact />
        </div>
      </div>
      <p className="font-sans text-sm text-muted-foreground">{nomeGestora(carta)}</p>
    </Link>
  );
}
