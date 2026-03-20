import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { DB } from "@/server/db";
import { devlog, devlogAttachment, project, user } from "@/server/db/schema";

export type PublicDevlogItem = {
  id: string;
  title: string;
  content: string;
  project: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  attachments: Array<{
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    publicUrl: string;
    createdAt: Date;
  }>;
};

export async function getLatestPublicDevlogsByUsername(db: DB, username: string, limit = 20): Promise<PublicDevlogItem[]> {
  const owner = await db.query.user.findFirst({
    where: and(eq(user.username, username), eq(user.isProfilePublic, true)),
    columns: { id: true },
  });

  if (!owner) {
    return [];
  }

  const rows = await db
    .select({
      id: devlog.id,
      title: devlog.title,
      content: devlog.content,
      projectId: project.id,
      projectName: project.name,
      createdAt: devlog.createdAt,
      updatedAt: devlog.updatedAt,
    })
    .from(devlog)
    .innerJoin(project, eq(project.id, devlog.projectId))
    .where(and(eq(devlog.userId, owner.id), eq(devlog.isPublic, true)))
    .orderBy(desc(devlog.createdAt))
    .limit(limit);

  if (rows.length === 0) {
    return [];
  }

  const attachments = await db.query.devlogAttachment.findMany({
    where: inArray(devlogAttachment.devlogId, rows.map((row) => row.id)),
    orderBy: [desc(devlogAttachment.createdAt)],
  });

  const attachmentMap = new Map<string, PublicDevlogItem["attachments"]>();

  for (const attachment of attachments) {
    const bucket = attachmentMap.get(attachment.devlogId) ?? [];
    bucket.push({
      id: attachment.id,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      publicUrl: attachment.publicUrl,
      createdAt: attachment.createdAt,
    });
    attachmentMap.set(attachment.devlogId, bucket);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    project: {
      id: row.projectId,
      name: row.projectName,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    attachments: attachmentMap.get(row.id) ?? [],
  }));
}

export async function getPublicDevlogByUsernameAndId(
  db: DB,
  username: string,
  devlogId: string,
): Promise<PublicDevlogItem | null> {
  const owner = await db.query.user.findFirst({
    where: and(eq(user.username, username), eq(user.isProfilePublic, true)),
    columns: { id: true },
  });

  if (!owner) {
    return null;
  }

  const [entry] = await db
    .select({
      id: devlog.id,
      title: devlog.title,
      content: devlog.content,
      projectId: project.id,
      projectName: project.name,
      createdAt: devlog.createdAt,
      updatedAt: devlog.updatedAt,
    })
    .from(devlog)
    .innerJoin(project, eq(project.id, devlog.projectId))
    .where(and(eq(devlog.id, devlogId), eq(devlog.userId, owner.id), eq(devlog.isPublic, true)))
    .limit(1);

  if (!entry) {
    return null;
  }

  const attachments = await db.query.devlogAttachment.findMany({
    where: eq(devlogAttachment.devlogId, entry.id),
    orderBy: [desc(devlogAttachment.createdAt)],
  });

  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    project: {
      id: entry.projectId,
      name: entry.projectName,
    },
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      publicUrl: attachment.publicUrl,
      createdAt: attachment.createdAt,
    })),
  };
}
