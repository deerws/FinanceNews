"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type GestoraOption = { id: string; nome: string };

export function FiltrosBar({ gestoras }: { gestoras: GestoraOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const gestorasAtivas = new Set(
    (searchParams.get("gestoras") ?? "").split(",").filter(Boolean),
  );
  const [selecionadas, setSelecionadas] = useState<Set<string>>(gestorasAtivas);
  const [de, setDe] = useState(searchParams.get("de") ?? "");
  const [ate, setAte] = useState(searchParams.get("ate") ?? "");
  const [busca, setBusca] = useState(searchParams.get("q") ?? "");

  function aplicar(next: { gestoras?: Set<string>; de?: string; ate?: string; q?: string }) {
    const g = next.gestoras ?? selecionadas;
    const d = next.de ?? de;
    const a = next.ate ?? ate;
    const q = next.q ?? busca;

    const params = new URLSearchParams();
    if (g.size > 0) params.set("gestoras", Array.from(g).join(","));
    if (d) params.set("de", d);
    if (a) params.set("ate", a);
    if (q) params.set("q", q);

    router.push(params.size > 0 ? `/?${params.toString()}` : "/");
  }

  function toggleGestora(id: string) {
    const next = new Set(selecionadas);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelecionadas(next);
    aplicar({ gestoras: next });
  }

  const temFiltro = selecionadas.size > 0 || de || ate || busca;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") aplicar({ q: busca });
          }}
          placeholder="Buscar por palavra ou trecho..."
          className="w-full rounded-md border border-input bg-transparent py-2 pr-8 pl-8 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {busca && (
          <button
            type="button"
            onClick={() => {
              setBusca("");
              aplicar({ q: "" });
            }}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm">
                Gestoras{selecionadas.size > 0 ? ` (${selecionadas.size})` : ""}
              </Button>
            }
          />
          <PopoverContent className="w-64 max-h-80 overflow-y-auto" align="start">
            <div className="space-y-2">
              {gestoras.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selecionadas.has(g.id)}
                    onCheckedChange={() => toggleGestora(g.id)}
                  />
                  {g.nome}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <input
          type="date"
          value={de}
          onChange={(e) => {
            setDe(e.target.value);
            aplicar({ de: e.target.value });
          }}
          className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
          aria-label="De"
        />
        <span className="text-sm text-muted-foreground">até</span>
        <input
          type="date"
          value={ate}
          onChange={(e) => {
            setAte(e.target.value);
            aplicar({ ate: e.target.value });
          }}
          className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
          aria-label="Até"
        />

        {temFiltro && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelecionadas(new Set());
              setDe("");
              setAte("");
              setBusca("");
              router.push("/");
            }}
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
