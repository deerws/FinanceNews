import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type Trecho = { secao: string | null; texto: string; similaridade: number };

export function MudancaPainel({
  cartaAnteriorId,
  cartaAnteriorTitulo,
  trechos,
}: {
  cartaAnteriorId: string;
  cartaAnteriorTitulo: string;
  trechos: Trecho[];
}) {
  return (
    <div className="mb-8 border border-red-600/40 bg-red-600/5 p-4 dark:border-red-500/40 dark:bg-red-500/5">
      <p className="mb-2 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-widest text-red-700 dark:text-red-500">
        <AlertTriangle className="size-3.5" />
        Mudança drástica desde a carta anterior
      </p>
      <p className="mb-3 text-sm text-muted-foreground">
        O conteúdo desta carta é bem diferente da{" "}
        <Link href={`/cartas/${cartaAnteriorId}`} className="underline hover:no-underline">
          {cartaAnteriorTitulo}
        </Link>
        . Trechos que parecem genuinamente novos:
      </p>
      {trechos.length > 0 && (
        <ul className="space-y-2">
          {trechos.map((t, i) => (
            <li key={i} className="border-l-2 border-red-600/40 pl-3 text-sm dark:border-red-500/40">
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
