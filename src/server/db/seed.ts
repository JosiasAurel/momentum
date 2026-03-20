import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import { folder, project, task, user } from "./schema";

type SeedTaskInput = {
  title: string;
  description: string;
  status: "todo" | "in_progress" | "stalling" | "done";
  dueAt?: Date;
  completedAt?: Date;
  isActive?: boolean;
};

function buildLongDescription(summary: string) {
  return [
    summary,
    "This seeded task exists so a new developer can immediately see realistic dashboard behavior including status cards, active-task selection, and due date grouping.",
    "Use this content as disposable sample data while verifying create/edit/delete flows, and replace it with your own project details once setup is complete.",
  ].join(" ");
}

async function resolveSeedUser() {
  const explicitEmail = process.env.SEED_USER_EMAIL?.trim().toLowerCase();

  if (explicitEmail) {
    const existing = await db.query.user.findFirst({
      where: eq(user.email, explicitEmail),
    });

    if (!existing) {
      throw new Error(
        `SEED_USER_EMAIL="${explicitEmail}" was provided, but no matching user exists.`,
      );
    }

    return existing;
  }

  const fallback = await db.query.user.findFirst({
    orderBy: [asc(user.createdAt)],
  });

  if (!fallback) {
    throw new Error(
      "No users found. Create an account in the app first, then rerun `bun run db:seed`.",
    );
  }

  return fallback;
}

async function ensureFolder(seedUserId: string, name: string) {
  const existing = await db.query.folder.findFirst({
    where: and(eq(folder.userId, seedUserId), eq(folder.name, name)),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(folder)
    .values({
      id: crypto.randomUUID(),
      userId: seedUserId,
      name,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create seed folder.");
  }

  return created;
}

async function ensureProject(seedUserId: string, folderId: string, name: string) {
  const existing = await db.query.project.findFirst({
    where: and(
      eq(project.userId, seedUserId),
      eq(project.folderId, folderId),
      eq(project.name, name),
    ),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(project)
    .values({
      id: crypto.randomUUID(),
      userId: seedUserId,
      folderId,
      name,
      description:
        "Seeded project for smoke-testing dashboard stats, due-date buckets, and task lifecycle transitions.",
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create seed project.");
  }

  return created;
}

async function ensureTask(seedUserId: string, projectId: string, input: SeedTaskInput) {
  const existing = await db.query.task.findFirst({
    where: and(
      eq(task.userId, seedUserId),
      eq(task.projectId, projectId),
      eq(task.title, input.title),
    ),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(task)
    .values({
      id: crypto.randomUUID(),
      userId: seedUserId,
      projectId,
      title: input.title,
      description: input.description,
      status: input.status,
      dueAt: input.dueAt,
      completedAt: input.completedAt,
      isActive: Boolean(input.isActive),
    })
    .returning();

  if (!created) {
    throw new Error(`Failed to create seed task "${input.title}".`);
  }

  return created;
}

async function main() {
  const seedUser = await resolveSeedUser();
  const now = new Date();

  const seedFolder = await ensureFolder(seedUser.id, "Seeded Workspace");
  const seedProject = await ensureProject(seedUser.id, seedFolder.id, "Momentum Launch");

  await ensureTask(seedUser.id, seedProject.id, {
    title: "Finalize onboarding docs",
    status: "todo",
    dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    description: buildLongDescription(
      "Document installation, environment setup, migrations, and verification commands for first-time contributors.",
    ),
  });

  await ensureTask(seedUser.id, seedProject.id, {
    title: "Verify core workspace flows",
    status: "in_progress",
    dueAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
    isActive: true,
    description: buildLongDescription(
      "Walk through folder, project, and task CRUD behavior and confirm status transitions update dashboard metrics correctly.",
    ),
  });

  await ensureTask(seedUser.id, seedProject.id, {
    title: "Audit reminder cadence",
    status: "stalling",
    dueAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
    description: buildLongDescription(
      "Review reminder and overdue policies with product stakeholders before enabling worker-driven email scheduling in production.",
    ),
  });

  await ensureTask(seedUser.id, seedProject.id, {
    title: "Ship MVP baseline",
    status: "done",
    completedAt: new Date(now.getTime() - 90 * 60 * 1000),
    dueAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    description: buildLongDescription(
      "Track a completed milestone so dashboard analytics have representative historical data for local smoke testing.",
    ),
  });

  const totalTasks = await db.query.task.findMany({
    where: and(eq(task.userId, seedUser.id), eq(task.projectId, seedProject.id)),
    columns: { id: true },
  });

  console.log(
    `Seed complete for ${seedUser.email}. Folder "${seedFolder.name}" / project "${seedProject.name}" now has ${totalTasks.length} tasks.`,
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Seed failed.");
    console.error(error);
    process.exit(1);
  });
