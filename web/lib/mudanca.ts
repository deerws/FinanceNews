// Calibrado em cima do corpus real (227 pares consecutivos comparáveis,
// reconferido em 2026-08-06): mediana de similaridade ~0.99, p10 ~0.96,
// p5 ~0.93. Cartas do dia a dia da mesma gestora são naturalmente muito
// parecidas entre si (mesmo autor/tom/estrutura), então mesmo diferenças
// reais de conteúdo produzem números altos em termos absolutos — por isso
// o corte fica em 0.95 (top ~7% mais diferente do normal), não em algo
// "intuitivo" tipo 0.7. Reavaliar se o corpus crescer muito.
//
// Só sinaliza mudança drástica — a faixa intermediária (0.95–0.98) foi
// removida por pedido do usuário: mudança "comum" é esperada demais pra
// valer um indicativo próprio.
export const LIMIAR_MUDANCA_DRASTICA = 0.95;

export type SeveridadeMudanca = "drastica" | null;

export function classificarMudanca(similaridade: number | null | undefined): SeveridadeMudanca {
  if (similaridade == null) return null;
  return similaridade < LIMIAR_MUDANCA_DRASTICA ? "drastica" : null;
}

export const SEVERIDADE_LABEL: Record<Exclude<SeveridadeMudanca, null>, string> = {
  drastica: "Mudança drástica",
};

export const SEVERIDADE_CLASSES: Record<Exclude<SeveridadeMudanca, null>, string> = {
  drastica: "text-red-600 dark:text-red-500",
};
