// Mostrado automaticamente pelo Next.js (App Router) enquanto a página de
// lista busca os dados no servidor — sem isso, navegar de volta da leitura
// pra lista fica com a tela parada/em branco até a resposta chegar, o que
// parece mais lento do que realmente é.
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <div className="mb-4 h-20 animate-pulse rounded-md bg-muted/60" />
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 border-b py-4 lg:py-5">
            <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
