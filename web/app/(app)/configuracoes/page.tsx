import { createClient } from "@/lib/supabase/server";
import { TrocarSenhaForm } from "./trocar-senha-form";
import { DeviceTokens, type DeviceToken } from "./device-tokens";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("id, nome, criado_em, ultimo_uso_em, revogado_em")
    .eq("user_id", user?.id ?? "")
    .order("criado_em", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-10 p-4">
      <div>
        <h1 className="mb-6 font-serif text-2xl font-bold">Configurações</h1>
        <TrocarSenhaForm />
      </div>

      <div>
        <h2 className="mb-6 font-serif text-xl font-bold">Kindle</h2>
        <DeviceTokens tokensIniciais={(tokens ?? []) as DeviceToken[]} />
      </div>
    </div>
  );
}
