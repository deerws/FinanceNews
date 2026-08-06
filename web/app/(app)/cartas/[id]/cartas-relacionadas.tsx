import Link from "next/link";
import type { CartaRelacionada } from "@/lib/cartas-relacionadas";

function formatarData(dataRef: string): string {
  const [ano, mes] = dataRef.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function CartasRelacionadas({ cartas }: { cartas: CartaRelacionada[] }) {
  if (cartas.length === 0) return null;

  return (
    <div className="mt-10 border-t pt-6">
      <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-primary">
        Cartas relacionadas
      </p>
      <p className="mb-4 text-sm text-muted-foreground">
        Mesmo período, tópicos parecidos — geralmente de outras gestoras. Útil pra comparar o que
        cada uma pensa sobre o mesmo assunto.
      </p>
      <div className="space-y-4">
        {cartas.map((c) => (
          <Link
            key={c.carta_id}
            href={`/cartas/${c.carta_id}`}
            className="block border-l-2 border-border pl-3 hover:border-foreground"
          >
            <p className="font-serif text-base font-medium leading-snug">{c.titulo}</p>
            <p className="text-sm text-muted-foreground">
              {c.gestora_nome} · {formatarData(c.data_referencia)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
