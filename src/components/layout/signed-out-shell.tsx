import { ArrowRight, Boxes, Database, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Momentum dashboard",
    description: "Plan and execute work with folders, projects, focused task lanes, and active-task momentum.",
    icon: ShieldCheck,
  },
  {
    title: "Daily rhythm",
    description: "Track upcoming and overdue work while reminder automation keeps execution pressure realistic.",
    icon: Workflow,
  },
  {
    title: "Garden devlogs",
    description: "Write markdown updates, upload attachments, and publish a calm public activity trail.",
    icon: Database,
  },
  {
    title: "Production core",
    description: "Bun, tRPC, Drizzle, Better Auth, PostgreSQL, and S3-ready flows for deployment.",
    icon: Boxes,
  },
];

export function SignedOutShell() {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24" id="why">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Momentum garden
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Build steady progress with a calm, garden-inspired execution space.
          </h1>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Momentum helps you keep projects moving with focused task flow, reflective devlogs, public progress surfaces, and reminder cadence.
          </p>
          <div className="flex flex-wrap gap-3" id="start">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Plant your workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">Return to Momentum</Button>
            </Link>
          </div>
        </div>
        <Card className="border-primary/20 bg-card/90" id="stack">
          <CardHeader>
            <CardTitle>What momentum includes</CardTitle>
            <CardDescription>A complete personal execution product, ready for daily use.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border bg-background/80 p-4">
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
