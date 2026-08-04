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
