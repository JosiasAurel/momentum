import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownPreview } from "@/components/devlog/markdown-preview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/env";
import { db } from "@/server/db";
import { getPublicDevlogByUsernameAndId } from "@/server/devlog/public-devlogs";
import { getPublicProfileByUsername } from "@/server/profile/public-profile";

type PublicDevlogPageProps = {
  params: Promise<{
    username: string;
    devlogId: string;
  }>;
};

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function createDevlogUrl(username: string, devlogId: string) {
  return new URL(`/${username}/devlogs/${devlogId}`, env.NEXT_PUBLIC_APP_URL).toString();
}

function summarizeMarkdown(markdown: string) {
  const plain = markdown
    .replaceAll(/[#*_`~>\-[\]()!]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  return plain.length > 170 ? `${plain.slice(0, 167)}...` : plain;
}

async function resolvePublicDevlog(usernameParam: string, devlogId: string) {
  const username = normalizeUsername(usernameParam);
  const [profile, entry] = await Promise.all([
    getPublicProfileByUsername(db, username),
    getPublicDevlogByUsernameAndId(db, username, devlogId),
  ]);

  if (!profile || !entry) {
    return null;
  }

  return { profile, entry };
}

export async function generateMetadata({ params }: PublicDevlogPageProps): Promise<Metadata> {
  const { username, devlogId } = await params;
  const result = await resolvePublicDevlog(username, devlogId);

  if (!result) {
    return {
      title: "Public devlog not found | Tasktracker",
      description: "This public devlog does not exist or is not visible.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${result.entry.title} · ${result.profile.name} (@${result.profile.username}) | Tasktracker`;
  const description = summarizeMarkdown(result.entry.content);
  const canonicalUrl = createDevlogUrl(result.profile.username, result.entry.id);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicDevlogPage({ params }: PublicDevlogPageProps) {
  const { username, devlogId } = await params;
  const result = await resolvePublicDevlog(username, devlogId);

  if (!result) {
    notFound();
  }

  const { profile, entry } = result;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm text-muted-foreground">
        <Link
          href={`/${profile.username}`}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          @{profile.username}
        </Link>{" "}
        / Public devlog
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">{entry.title}</CardTitle>
          <CardDescription>
            {new Date(entry.createdAt).toLocaleString()} · {entry.project.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MarkdownPreview content={entry.content} />

          {entry.attachments.length > 0 ? (
            <section className="space-y-2 border-t pt-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Attachments
              </h2>
              <ul className="space-y-1 text-sm">
                {entry.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={attachment.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {attachment.originalFilename}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
