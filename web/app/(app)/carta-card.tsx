import Link from "next/link";

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
  leituras: { status: string }[] | null;
};

function nomeGestora(carta: CartaListItem): string {
  const g = carta.gestoras;
  if (!g) return "";
  return Array.isArray(g) ? (g[0]?.nome ?? "") : g.nome;
}

function formatarData(dataRef: string): string {
  const [ano, mes] = dataRef.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function CartaCard({ carta }: { carta: CartaListItem }) {
  const lido = carta.leituras?.[0]?.status === "lido";

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
        {lido && (
          <span className="font-sans font-normal normal-case tracking-normal text-muted-foreground">
            · lido
          </span>
        )}
      </div>
      <p className="font-serif text-xl font-semibold leading-snug group-hover:underline">
        {carta.titulo}
      </p>
      <p className="font-sans text-sm text-muted-foreground">{nomeGestora(carta)}</p>
    </Link>
  );
}
