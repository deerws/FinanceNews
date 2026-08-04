import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui/button";

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
          <span className="font-serif text-3xl font-semibold tracking-tight">
            FinanceNews
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{user?.email}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              render={
                <Link href="/configuracoes" aria-label="Notificações">
                  <Bell />
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
