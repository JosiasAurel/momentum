import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { folder, project } from "@/server/db/schema";

const projectInput = z.object({
  folderId: z.string().uuid(),
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).optional(),
});

export const projectRouter = createTRPCRouter({
  listByFolder: protectedProcedure
    .input(z.object({ folderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.project.findMany({
        where: and(eq(project.userId, ctx.session.user.id), eq(project.folderId, input.folderId)),
        orderBy: [asc(project.createdAt)],
      });
    }),
  create: protectedProcedure.input(projectInput).mutation(async ({ ctx, input }) => {
    const ownerFolder = await ctx.db.query.folder.findFirst({
      where: and(eq(folder.id, input.folderId), eq(folder.userId, ctx.session.user.id)),
      columns: { id: true },
    });

    if (!ownerFolder) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
    }

    const [created] = await ctx.db
      .insert(project)
      .values({
        id: crypto.randomUUID(),
        folderId: input.folderId,
        userId: ctx.session.user.id,
        name: input.name,
        description: input.description,
      })
      .returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Project was not created" });
    }

    return created;
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(140),
        description: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(project)
        .set({
          name: input.name,
          description: input.description,
          updatedAt: new Date(),
        })
        .where(and(eq(project.id, input.id), eq(project.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return updated;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(project)
        .where(and(eq(project.id, input.id), eq(project.userId, ctx.session.user.id)))
        .returning({ id: project.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return deleted;
    }),
});
