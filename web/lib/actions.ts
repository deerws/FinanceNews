"use server";

import { randomBytes, createHash } from "node:crypto";
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

export async function atualizarEmailAtivo(ativo: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("preferencias_notificacao")
    .upsert({ user_id: user.id, email_ativo: ativo }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

// Gera um device token pro OPDS/Kindle. Devolve o token cru — quem chama
// mostra pro usuário UMA vez só; o banco guarda só o hash (ver
// lib/opds/auth.ts, que faz a mesma conta pra verificar no Basic Auth).
export async function gerarDeviceToken(nome: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await supabase.from("device_tokens").insert({
    user_id: user.id,
    nome,
    token_hash: tokenHash,
  });
  if (error) throw new Error(error.message);

  // Sem refresh() de propósito: o token cru só existe neste retorno, e o
  // componente já atualiza a própria lista localmente (setTokens). Um
  // refresh() aqui dispara um re-render da rota inteira alguns instantes
  // depois de mostrar o token — se esse re-render tropeçar em qualquer
  // coisa (rede, etc.), o error boundary do Next derruba a página inteira
  // e o token já exibido some sem chance de copiar. Acontecido de verdade
  // em produção — ver KINDLE.md.
  return token;
}

export async function revogarDeviceToken(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("device_tokens")
    .update({ revogado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Mesmo motivo do gerarDeviceToken: o componente já remove o token da
  // lista localmente, refresh() aqui só adiciona risco sem necessidade.
}

export async function alternarFavorito(cartaId: string, ativar: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("leituras").upsert(
    {
      user_id: user.id,
      carta_id: cartaId,
      favorito: ativar,
      favorito_em: ativar ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,carta_id" },
  );
  if (error) throw new Error(error.message);
}

export async function alternarFilaKindle(cartaId: string, ativar: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("leituras").upsert(
    {
      user_id: user.id,
      carta_id: cartaId,
      fila_kindle: ativar,
      fila_kindle_em: ativar ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,carta_id" },
  );
  if (error) throw new Error(error.message);

  refresh();
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
