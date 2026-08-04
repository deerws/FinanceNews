import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renomeado de middleware.ts para proxy.ts no Next.js 16. Roda em toda
// request pra renovar o cookie de sessão do Supabase antes que ele expire —
// sem isso, sessões de Server Component ficam obsoletas silenciosamente.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Exclui assets estáticos (_next, favicon, manifest, ícones do PWA e
  // qualquer arquivo com extensão — svg/png/ico/webmanifest/etc) do guard de
  // auth. Sem isso o navegador/SO não consegue buscar o manifest.webmanifest
  // nem os ícones pra sequer mostrar o prompt de instalação.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|[^?]*\\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest|js)).*)",
  ],
};
