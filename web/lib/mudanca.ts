// Calibrado em cima do corpus real (233 pares consecutivos da mesma
// gestora, 2026-08-05): mediana de similaridade ~0.99, p10 ~0.98. Cartas
// do dia a dia da mesma gestora são naturalmente muito parecidas entre si
// (mesmo autor/tom/estrutura), então mesmo diferenças reais de conteúdo
// produzem números altos em termos absolutos — por isso o corte fica em
// 0.98 (top ~10% mais diferente do normal), não em algo "intuitivo" tipo
// 0.7. Reavaliar se o corpus crescer muito ou a mistura de fontes mudar.
export const LIMIAR_MUDANCA_SIGNIFICATIVA = 0.98;
