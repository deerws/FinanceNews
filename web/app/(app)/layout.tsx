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
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">FinanceNews</span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{user?.email}</span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
