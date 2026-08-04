"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function marcarLeitura(cartaId: string, status: "lido" | "pendente") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("leituras").upsert(
    {
      user_id: user.id,
      carta_id: cartaId,
      status,
      lido_em: status === "lido" ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,carta_id" },
  );
  if (error) throw new Error(error.message);

  refresh();
}

export async function salvarPushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth_key: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function removerPushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

export async function alternarNotificacaoGestora(gestoraId: string, ativar: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  if (ativar) {
    const { error } = await supabase
      .from("notificacao_gestoras")
      .upsert({ user_id: user.id, gestora_id: gestoraId }, { onConflict: "user_id,gestora_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("notificacao_gestoras")
      .delete()
      .eq("user_id", user.id)
      .eq("gestora_id", gestoraId);
    if (error) throw new Error(error.message);
  }
}
