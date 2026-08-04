"use client";

import { useTamanhoLeitura, tamanhoClass } from "./reading-controls";

export function ConteudoTexto({ texto }: { texto: string }) {
  const tamanho = useTamanhoLeitura();
  const blocos = texto.split(/\n{2,}/).filter((b) => b.trim());

  let indiceSecao = -1;

  return (
    <div className={`${tamanhoClass(tamanho)} max-w-prose font-serif`}>
      {blocos.map((bloco, i) => {
        const isHeading = bloco.startsWith("## ");
        const conteudo = isHeading ? bloco.slice(3).trim() : bloco.trim();

        if (isHeading) {
          indiceSecao += 1;
          return (
            <h2
              key={i}
              id={`secao-${indiceSecao}`}
              className="mt-8 mb-3 scroll-mt-20 text-[1.15em] font-bold first:mt-0"
            >
              {conteudo}
            </h2>
          );
        }
        return (
          <p key={i} className="mb-5 whitespace-pre-wrap leading-relaxed">
            {conteudo}
          </p>
        );
      })}
    </div>
  );
}
