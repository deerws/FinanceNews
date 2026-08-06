import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-dvh">
      <header className="border-b-4 border-double border-foreground px-4 pb-2 pt-4">
        <div className="mx-auto flex max-w-2xl items-end justify-between">
          <Link href="/" className="font-serif text-3xl font-semibold tracking-tight">
            FinanceNews
          </Link>
          <div className="flex items-center gap-1 text-xs text-muted-foreground sm:gap-3">
            <span className="hidden sm:inline">{user?.email}</span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon-sm"
              render={
                <Link href="/notificacoes" aria-label="Notificações">
                  <Bell />
                </Link>
              }
            />
            <Button
              variant="ghost"
              size="icon-sm"
              render={
                <Link href="/configuracoes" aria-label="Configurações">
                  <Settings />
                </Link>
              }
            />
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
              >
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
