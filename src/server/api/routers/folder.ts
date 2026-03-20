import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { folder } from "@/server/db/schema";

const folderInput = z.object({
  name: z.string().trim().min(1).max(120),
});

export const folderRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.folder.findMany({
      where: eq(folder.userId, ctx.session.user.id),
      orderBy: [asc(folder.createdAt)],
    });
  }),
  create: protectedProcedure.input(folderInput).mutation(async ({ ctx, input }) => {
    const [created] = await ctx.db
      .insert(folder)
      .values({
        id: crypto.randomUUID(),
        name: input.name,
        userId: ctx.session.user.id,
      })
      .returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Folder was not created" });
    }

    return created;
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(folder)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(and(eq(folder.id, input.id), eq(folder.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return updated;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(folder)
        .where(and(eq(folder.id, input.id), eq(folder.userId, ctx.session.user.id)))
        .returning({ id: folder.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return deleted;
    }),
});
