export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <p>Momentum is powered by Bun, Next.js, tRPC, Drizzle, Better Auth, and PostgreSQL.</p>
        <p className="text-foreground">Grow steadily. Ship intentionally.</p>
      </div>
    </footer>
  );
}
