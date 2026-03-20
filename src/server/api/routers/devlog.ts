import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { devlog, devlogAttachment, project } from "@/server/db/schema";
import { buildSignedUpload } from "@/server/devlog/uploads";
import { getLatestPublicDevlogsByUsername } from "@/server/devlog/public-devlogs";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, "Username may only include lowercase letters, numbers, and underscores");

const devlogInput = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(30000),
  isPublic: z.boolean().default(false),
});

function ensureStorageKeyOwnership(storageKey: string, userId: string) {
  return storageKey.startsWith(`devlogs/${userId}/`);
}

export const devlogRouter = createTRPCRouter({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ownerProject = await ctx.db.query.project.findFirst({
        where: and(eq(project.id, input.projectId), eq(project.userId, ctx.session.user.id)),
        columns: { id: true },
      });

      if (!ownerProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const entries = await ctx.db.query.devlog.findMany({
        where: and(eq(devlog.userId, ctx.session.user.id), eq(devlog.projectId, input.projectId)),
        orderBy: [desc(devlog.createdAt)],
      });

      if (entries.length === 0) {
        return [];
      }

      const attachments = await ctx.db.query.devlogAttachment.findMany({
        where: inArray(devlogAttachment.devlogId, entries.map((entry) => entry.id)),
        orderBy: [desc(devlogAttachment.createdAt)],
      });

      const attachmentMap = new Map<string, typeof attachments>();
      for (const attachment of attachments) {
        const current = attachmentMap.get(attachment.devlogId) ?? [];
        current.push(attachment);
        attachmentMap.set(attachment.devlogId, current);
      }

      return entries.map((entry) => ({
        ...entry,
        attachments: attachmentMap.get(entry.id) ?? [],
      }));
    }),
  create: protectedProcedure.input(devlogInput).mutation(async ({ ctx, input }) => {
    const ownerProject = await ctx.db.query.project.findFirst({
      where: and(eq(project.id, input.projectId), eq(project.userId, ctx.session.user.id)),
      columns: { id: true },
    });

    if (!ownerProject) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    const [created] = await ctx.db
      .insert(devlog)
      .values({
        id: crypto.randomUUID(),
        userId: ctx.session.user.id,
        projectId: input.projectId,
        title: input.title,
        content: input.content,
        isPublic: input.isPublic,
      })
      .returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Devlog was not created" });
    }

    return created;
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(180),
        content: z.string().trim().min(1).max(30000),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(devlog)
        .set({
          title: input.title,
          content: input.content,
          isPublic: input.isPublic,
          updatedAt: new Date(),
        })
        .where(and(eq(devlog.id, input.id), eq(devlog.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devlog not found" });
      }

      return updated;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(devlog)
        .where(and(eq(devlog.id, input.id), eq(devlog.userId, ctx.session.user.id)))
        .returning({ id: devlog.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devlog not found" });
      }

      return deleted;
    }),
  signUpload: protectedProcedure
    .input(
      z.object({
        filename: z.string().trim().min(1).max(180),
        mimeType: z.string().trim().min(1).max(120),
        sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await buildSignedUpload({
          userId: ctx.session.user.id,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
        });
      } catch (error) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: error instanceof Error ? error.message : "Could not sign upload",
        });
      }
    }),
  registerAttachment: protectedProcedure
    .input(
      z.object({
        devlogId: z.string().uuid(),
        originalFilename: z.string().trim().min(1).max(180),
        storageKey: z.string().trim().min(1).max(500),
        mimeType: z.string().trim().min(1).max(120),
        sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
        publicUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ownedDevlog = await ctx.db.query.devlog.findFirst({
        where: and(eq(devlog.id, input.devlogId), eq(devlog.userId, ctx.session.user.id)),
        columns: { id: true },
      });

      if (!ownedDevlog) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devlog not found" });
      }

      if (!ensureStorageKeyOwnership(input.storageKey, ctx.session.user.id)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Storage key does not belong to the current user" });
      }

      const [created] = await ctx.db
        .insert(devlogAttachment)
        .values({
          id: crypto.randomUUID(),
          devlogId: input.devlogId,
          userId: ctx.session.user.id,
          originalFilename: input.originalFilename,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          publicUrl: input.publicUrl,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Attachment could not be registered" });
      }

      return created;
    }),
  publicByUsername: publicProcedure
    .input(
      z.object({
        username: usernameSchema,
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => getLatestPublicDevlogsByUsername(ctx.db, input.username, input.limit)),
});
