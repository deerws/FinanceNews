"use client";

import { useState } from "react";
import { Share2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CompartilharMenu({
  cartaId,
  titulo,
  gestoraNome,
  urlOrigem,
  nPaginas,
}: {
  cartaId: string;
  titulo: string;
  gestoraNome: string;
  urlOrigem: string;
  nPaginas: number | null;
}) {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function compartilharCompleta() {
    const dados = { title: `${gestoraNome} — ${titulo}`, text: titulo, url: urlOrigem };
    if (navigator.share && (!navigator.canShare || navigator.canShare(dados))) {
      try {
        await navigator.share(dados);
      } catch {
        // usuário cancelou o share nativo — não é erro
      }
    } else {
      await navigator.clipboard.writeText(urlOrigem);
      alert("Link copiado.");
    }
  }

  async function compartilharPaginas() {
    setErro(null);
    const deNum = Number(de);
    const ateNum = Number(ate);
    if (!Number.isInteger(deNum) || !Number.isInteger(ateNum) || deNum < 1 || ateNum < deNum) {
      setErro("Intervalo inválido.");
      return;
    }
    if (nPaginas && ateNum > nPaginas) {
      setErro(`Essa carta só tem ${nPaginas} páginas.`);
      return;
    }

    setCarregando(true);
    try {
      const resp = await fetch(`/api/cartas/${cartaId}/pdf?de=${deNum}&ate=${ateNum}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        setErro(body?.error ?? "Falha ao gerar o PDF.");
        return;
      }
      const blob = await resp.blob();
      const nomeArquivo = `${titulo.slice(0, 40).replace(/[^\w-]+/g, "-")}_p${deNum}-${ateNum}.pdf`;
      const file = new File([blob], nomeArquivo, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${titulo} (p. ${deNum}-${ateNum})` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setErro("Falha ao gerar o PDF.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <Share2 /> Compartilhar
          </Button>
        }
      />
      <PopoverContent className="w-72" align="start">
        <div className="space-y-4">
          <button
            type="button"
            onClick={compartilharCompleta}
            className="flex w-full items-center gap-2 text-left text-sm hover:underline"
          >
            <Share2 className="size-4 shrink-0" />
            Carta completa (link original)
          </button>

          {nPaginas && nPaginas > 1 && (
            <div className="space-y-2 border-t pt-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileDown className="size-4 shrink-0" />
                Só algumas páginas ({nPaginas} no total)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={nPaginas}
                  placeholder="de"
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                  className="w-16 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                />
                <span className="text-sm text-muted-foreground">até</span>
                <input
                  type="number"
                  min={1}
                  max={nPaginas}
                  placeholder="até"
                  value={ate}
                  onChange={(e) => setAte(e.target.value)}
                  className="w-16 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                />
                <Button size="sm" disabled={carregando} onClick={compartilharPaginas}>
                  {carregando ? "..." : "Ir"}
                </Button>
              </div>
              {erro && <p className="text-xs text-destructive">{erro}</p>}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
