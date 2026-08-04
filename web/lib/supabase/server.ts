import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// cookies() é assíncrono no Next.js 16 (sem modo de compatibilidade síncrono) —
// por isso este helper também é assíncrono. Usar em Server Components, Server
// Actions e no proxy.ts.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component (não pode setar cookie) — o
            // proxy.ts já cuida de renovar a sessão nesse caso.
          }
        },
      },
    },
  );
}
