import Link from "next/link";
import { AlertTriangle, TrendingUp } from "lucide-react";
import type { SeveridadeMudanca } from "@/lib/mudanca";

type Trecho = { secao: string | null; texto: string; similaridade: number };

const ESTILO = {
  drastica: {
    borda: "border-red-600/40 dark:border-red-500/40",
    fundo: "bg-red-600/5 dark:bg-red-500/5",
    texto: "text-red-700 dark:text-red-500",
    borda_trecho: "border-red-600/40 dark:border-red-500/40",
    icone: AlertTriangle,
    titulo: "Mudança drástica desde a carta anterior",
  },
  comum: {
    borda: "border-green-600/40 dark:border-green-500/40",
    fundo: "bg-green-600/5 dark:bg-green-500/5",
    texto: "text-green-700 dark:text-green-500",
    borda_trecho: "border-green-600/40 dark:border-green-500/40",
    icone: TrendingUp,
    titulo: "Mudou desde a carta anterior",
  },
} as const;

export function MudancaPainel({
  severidade,
  cartaAnteriorId,
  cartaAnteriorTitulo,
  trechos,
}: {
  severidade: Exclude<SeveridadeMudanca, null>;
  cartaAnteriorId: string;
  cartaAnteriorTitulo: string;
  trechos: Trecho[];
}) {
  const estilo = ESTILO[severidade];
  const Icone = estilo.icone;

  return (
    <div className={`mb-8 border p-4 ${estilo.borda} ${estilo.fundo}`}>
      <p className={`mb-2 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-widest ${estilo.texto}`}>
        <Icone className="size-3.5" />
        {estilo.titulo}
      </p>
      <p className="mb-3 text-sm text-muted-foreground">
        {severidade === "drastica"
          ? "O conteúdo desta carta é bem diferente da"
          : "Dá pra notar diferença em relação à"}{" "}
        <Link href={`/cartas/${cartaAnteriorId}`} className="underline hover:no-underline">
          {cartaAnteriorTitulo}
        </Link>
        . Trechos que parecem genuinamente novos:
      </p>
      {trechos.length > 0 && (
        <ul className="space-y-2">
          {trechos.map((t, i) => (
            <li key={i} className={`border-l-2 pl-3 text-sm ${estilo.borda_trecho}`}>
              {t.secao && <span className="font-medium">{t.secao}: </span>}
              <span className="text-muted-foreground">
                {t.texto.length > 220 ? `${t.texto.slice(0, 220)}…` : t.texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
