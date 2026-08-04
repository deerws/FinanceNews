import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesTabs } from "./configuracoes-tabs";
import type { GestoraOption } from "./notificacoes-form";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: gestorasComCartas }, { data: ativasRows }] = await Promise.all([
    supabase.from("gestoras").select("id, nome, cartas(count)").order("nome"),
    supabase.from("notificacao_gestoras").select("gestora_id").eq("user_id", user?.id ?? ""),
  ]);

  const gestoras: GestoraOption[] = (gestorasComCartas ?? [])
    .filter((g) => {
      const count = Array.isArray(g.cartas) ? g.cartas[0]?.count : undefined;
      return (count ?? 0) > 0;
    })
    .map((g) => ({ id: g.id, nome: g.nome }));

  const ativasIniciais = (ativasRows ?? []).map((r) => r.gestora_id);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 font-serif text-2xl font-bold">Configurações</h1>
      <ConfiguracoesTabs gestoras={gestoras} ativasIniciais={ativasIniciais} />
    </div>
  );
}
