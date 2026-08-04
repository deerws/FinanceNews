import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino do link do magic link (signInWithOtp usa fluxo PKCE por padrão no
// supabase-js atual: chega aqui com ?code=..., não #access_token=...).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
