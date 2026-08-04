import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
      className="flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{TRILHA_LABEL[carta.trilha] ?? carta.trilha}</Badge>
        <span>{formatarData(carta.data_referencia)}</span>
        {lido && <span className="text-green-600 dark:text-green-500">lido</span>}
      </div>
      <p className="font-medium leading-snug">{carta.titulo}</p>
      <p className="text-sm text-muted-foreground">{nomeGestora(carta)}</p>
    </Link>
  );
}
