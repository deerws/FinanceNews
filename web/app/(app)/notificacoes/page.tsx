import { createClient } from "@/lib/supabase/server";
import { NotificacoesForm, type GestoraOption } from "./notificacoes-form";

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: gestorasComCartas }, { data: ativasRows }, { data: preferencia }] = await Promise.all([
    supabase.from("gestoras").select("id, nome, cartas(count)").order("nome"),
    supabase.from("notificacao_gestoras").select("gestora_id").eq("user_id", user?.id ?? ""),
    supabase.from("preferencias_notificacao").select("email_ativo").eq("user_id", user?.id ?? "").maybeSingle(),
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
      <h1 className="mb-6 font-serif text-2xl font-bold">Notificações</h1>
      <NotificacoesForm
        gestoras={gestoras}
        ativasIniciais={ativasIniciais}
        emailAtivoInicial={preferencia?.email_ativo ?? false}
      />
    </div>
  );
}
