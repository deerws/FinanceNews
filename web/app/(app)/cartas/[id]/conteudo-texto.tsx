"use client";

import { useTamanhoLeitura, tamanhoClass } from "./reading-controls";

export function ConteudoTexto({ texto }: { texto: string }) {
  const tamanho = useTamanhoLeitura();

  return (
    <div
      className={`${tamanhoClass(tamanho)} max-w-prose whitespace-pre-wrap leading-relaxed`}
    >
      {texto}
    </div>
  );
}
