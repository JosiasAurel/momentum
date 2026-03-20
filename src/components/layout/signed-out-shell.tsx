import { ArrowRight, Boxes, Database, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Auth baseline",
    description: "Email/password flows and sessions via Better Auth with a typed server API route.",
    icon: ShieldCheck,
  },
  {
    title: "Typed transport",
    description: "App Router-ready tRPC context, root router, and React Query client wiring.",
    icon: Workflow,
  },
  {
    title: "Database core",
    description: "PostgreSQL + Drizzle schema, generation config, and migration command path.",
    icon: Database,
  },
  {
    title: "Composable UI",
    description: "Tailwind + shadcn/ui base primitives for scalable product surface work.",
    icon: Boxes,
  },
];

export function SignedOutShell() {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24" id="start">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Greenfield foundation
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Ship features faster on a production-oriented starter.
          </h1>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Bun-first stack with App Router, typed APIs, validated env config, and PostgreSQL plumbing already in place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Start with an account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">Use existing account</Button>
            </Link>
          </div>
        </div>
        <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>What is wired now</CardTitle>
            <CardDescription>Everything below is ready before domain workflows begin.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border bg-background/70 p-4">
                <p className="mb-1 flex items-center gap-2 font-medium">
                  <feature.icon className="h-4 w-4 text-primary" />
                  {feature.title}
                </p>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
