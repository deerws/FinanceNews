"use client";

import { useTamanhoLeitura, tamanhoClass } from "./reading-controls";

const FIGURA_RE = /^\[\[FIGURA:(\d+)\]\]$/;

export function ConteudoTexto({ texto, cartaId }: { texto: string; cartaId: string }) {
  const tamanho = useTamanhoLeitura();
  const blocos = texto.split(/\n{2,}/).filter((b) => b.trim());

  let indiceSecao = -1;

  return (
    <div className={`${tamanhoClass(tamanho)} max-w-prose font-serif`}>
      {blocos.map((bloco, i) => {
        const conteudoBruto = bloco.trim();
        const matchFigura = conteudoBruto.match(FIGURA_RE);
        if (matchFigura) {
          const ordem = matchFigura[1];
          return (
            // eslint-disable-next-line @next/next/no-img-element -- imagem vem de uma rota autenticada, não dá pra usar next/image com domínio fixo
            <img
              key={i}
              src={`/api/cartas/${cartaId}/figuras/${ordem}`}
              alt="Gráfico ou tabela extraído da carta"
              loading="lazy"
              className="mb-5 w-full max-w-full border border-border"
            />
          );
        }

        const isHeading = bloco.startsWith("## ");
        const conteudo = isHeading ? bloco.slice(3).trim() : conteudoBruto;

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
