import { createHash } from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// O cliente OPDS do KOReader só fala HTTP Basic Auth — sem cookie de
// sessão Supabase, sem magic link. Por isso essas rotas usam a chave
// service_role (não a anon key), a única forma de consultar `cartas`
// (RLS via `is_allowed()`) sem uma sessão de verdade. Fica isolada aqui:
// nunca é reexportada, e toda query feita com ela abaixo filtra
// manualmente por user_id — a aplicação assume o papel que o RLS faria.
function clienteAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessaoOpds = { userId: string; email: string };

export async function verificarBasicAuth(request: Request): Promise<SessaoOpds | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;

  let decodificado: string;
  try {
    decodificado = Buffer.from(header.slice(6), "base64").toString("utf-8");
  } catch {
    return null;
  }
  const separador = decodificado.indexOf(":");
  if (separador < 0) return null;
  const token = decodificado.slice(separador + 1);
  if (!token) return null;

  const admin = clienteAdmin();
  const tokenHash = hashToken(token);

  const { data: deviceToken } = await admin
    .from("device_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .is("revogado_em", null)
    .maybeSingle();
  if (!deviceToken) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(deviceToken.user_id);
  const email = authUser?.user?.email;
  if (!email) return null;

  // Mesma checagem que a policy de RLS "leitura liberada p/ allowlist"
  // faria via is_allowed() — precisa ser refeita em código porque o
  // cliente service_role não passa por RLS nenhuma.
  const { data: permitido } = await admin
    .from("usuarios_permitidos")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (!permitido) return null;

  admin
    .from("device_tokens")
    .update({ ultimo_uso_em: new Date().toISOString() })
    .eq("id", deviceToken.id)
    .then(
      () => {},
      () => {},
    );

  return { userId: deviceToken.user_id, email };
}

export function respostaNaoAutenticado(): Response {
  return new Response("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="FinanceNews OPDS"' },
  });
}

// Cliente service_role pra uso dentro das rotas /api/opds/* depois que o
// token já foi verificado — sempre acompanhado de filtro manual por
// user_id nas queries de `leituras`.
export { clienteAdmin as clienteOpds };
