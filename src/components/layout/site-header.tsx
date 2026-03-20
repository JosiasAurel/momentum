import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="rounded-md bg-primary/12 p-1.5 text-primary">
            <Compass className="h-4 w-4" />
          </span>
          <span>Tasktracker</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#why" className="transition-colors hover:text-foreground">Why</a>
          <a href="#stack" className="transition-colors hover:text-foreground">Foundation</a>
          <a href="#start" className="transition-colors hover:text-foreground">Get started</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Create account
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
