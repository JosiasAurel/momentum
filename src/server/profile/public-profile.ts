import "server-only";
import { count, eq } from "drizzle-orm";
import type { DB } from "@/server/db";
import { folder, project, task, user } from "@/server/db/schema";

type PublicTaskStats = {
  todo: number;
  inProgress: number;
  stalling: number;
  done: number;
  total: number;
  completionRate: number;
};

export type PublicProfile = {
  name: string;
  username: string;
  joinedAt: Date;
  stats: {
    folders: number;
    projects: number;
    tasks: PublicTaskStats;
  };
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function getPublicProfileByUsername(db: DB, username: string): Promise<PublicProfile | null> {
  const profile = await db.query.user.findFirst({
    where: eq(user.username, username),
    columns: {
      id: true,
      name: true,
      username: true,
      createdAt: true,
      isProfilePublic: true,
    },
  });

  if (!profile || !profile.isProfilePublic || !profile.username) {
    return null;
  }

  const [folderCountRows, projectCountRows, taskStatusRows] = await Promise.all([
    db.select({ value: count(folder.id) }).from(folder).where(eq(folder.userId, profile.id)),
    db.select({ value: count(project.id) }).from(project).where(eq(project.userId, profile.id)),
    db
      .select({
        status: task.status,
        value: count(task.id),
      })
      .from(task)
      .where(eq(task.userId, profile.id))
      .groupBy(task.status),
  ]);

  const taskCounts: Record<"todo" | "in_progress" | "stalling" | "done", number> = {
    todo: 0,
    in_progress: 0,
    stalling: 0,
    done: 0,
  };

  for (const row of taskStatusRows) {
    taskCounts[row.status] = toNumber(row.value);
  }

  const totalTasks = taskCounts.todo + taskCounts.in_progress + taskCounts.stalling + taskCounts.done;
  const completionRate = totalTasks > 0 ? Math.round((taskCounts.done / totalTasks) * 100) : 0;

  return {
    name: profile.name,
    username: profile.username,
    joinedAt: profile.createdAt,
    stats: {
      folders: toNumber(folderCountRows[0]?.value),
      projects: toNumber(projectCountRows[0]?.value),
      tasks: {
        todo: taskCounts.todo,
        inProgress: taskCounts.in_progress,
        stalling: taskCounts.stalling,
        done: taskCounts.done,
        total: totalTasks,
        completionRate,
      },
    },
  };
}
