// Calibrado em cima do corpus real (227 pares consecutivos comparáveis,
// reconferido em 2026-08-06): mediana de similaridade ~0.99, p10 ~0.96,
// p5 ~0.93. Cartas do dia a dia da mesma gestora são naturalmente muito
// parecidas entre si (mesmo autor/tom/estrutura), então mesmo diferenças
// reais de conteúdo produzem números altos em termos absolutos — por isso
// os cortes ficam em 0.98/0.95 (top ~20%/~7% mais diferente do normal),
// não em algo "intuitivo" tipo 0.7. Reavaliar se o corpus crescer muito.
export const LIMIAR_MUDANCA_SIGNIFICATIVA = 0.98;
export const LIMIAR_MUDANCA_DRASTICA = 0.95;

export type SeveridadeMudanca = "drastica" | "comum" | null;

export function classificarMudanca(similaridade: number | null | undefined): SeveridadeMudanca {
  if (similaridade == null) return null;
  if (similaridade < LIMIAR_MUDANCA_DRASTICA) return "drastica";
  if (similaridade < LIMIAR_MUDANCA_SIGNIFICATIVA) return "comum";
  return null;
}

export const SEVERIDADE_LABEL: Record<Exclude<SeveridadeMudanca, null>, string> = {
  drastica: "Mudança drástica",
  comum: "Mudou desde a anterior",
};

export const SEVERIDADE_CLASSES: Record<Exclude<SeveridadeMudanca, null>, string> = {
  drastica: "text-red-600 dark:text-red-500",
  comum: "text-green-600 dark:text-green-500",
};
