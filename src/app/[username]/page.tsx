import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/env";
import { db } from "@/server/db";
import { getPublicProfileByUsername } from "@/server/profile/public-profile";

type PublicProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function resolvePublicProfile(usernameParam: string) {
  return getPublicProfileByUsername(db, normalizeUsername(usernameParam));
}

function createProfileUrl(username: string) {
  return new URL(`/${username}`, env.NEXT_PUBLIC_APP_URL).toString();
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await resolvePublicProfile(username);

  if (!profile) {
    return {
      title: "Profile not found | Tasktracker",
      description: "This public profile does not exist or is not published.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${profile.name} (@${profile.username}) | Tasktracker`;
  const description = `${profile.name}'s public task activity on Tasktracker.`;
  const canonicalUrl = createProfileUrl(profile.username);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await resolvePublicProfile(username);

  if (!profile) {
    notFound();
  }

  const publicCards = [
    { label: "Projects", value: profile.stats.projects },
    { label: "Tasks", value: profile.stats.tasks.total },
    { label: "Completed", value: profile.stats.tasks.done },
    { label: "Completion", value: `${profile.stats.tasks.completionRate}%` },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-2xl border bg-card/90 p-6">
        <p className="text-sm font-medium text-primary">@{profile.username}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{profile.name}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Public profile surfaces expose aggregate activity only. Private tasks, projects, and non-public content are not listed.
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Joined {profile.joinedAt.toLocaleDateString()}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {publicCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task status</CardTitle>
            <CardDescription>Aggregate counts only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Todo</span>
              <span className="font-medium">{profile.stats.tasks.todo}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">In progress</span>
              <span className="font-medium">{profile.stats.tasks.inProgress}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Stalling</span>
              <span className="font-medium">{profile.stats.tasks.stalling}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Done</span>
              <span className="font-medium">{profile.stats.tasks.done}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public feed</CardTitle>
            <CardDescription>Latest public devlogs will appear here</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Public devlog listing depends on the devlog domain task and is intentionally omitted until public devlog data is implemented.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
