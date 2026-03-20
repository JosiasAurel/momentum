import { and, asc, eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { task, workSession } from "@/server/db/schema";
import { createReminderEmailSender } from "@/server/reminders/sender";

const sessionInput = z.object({
  taskId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(180),
  notes: z.string().trim().max(2000).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.toLowerCase()))].sort((a, b) => a.localeCompare(b));
}

export const workSessionRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.workSession.findMany({
      where: eq(workSession.userId, ctx.session.user.id),
      orderBy: [asc(workSession.startsAt)],
    });
  }),
  create: protectedProcedure.input(sessionInput).mutation(async ({ ctx, input }) => {
    if (input.endsAt <= input.startsAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Session end must be after start" });
    }

    if (input.taskId) {
      const ownerTask = await ctx.db.query.task.findFirst({
        where: and(eq(task.id, input.taskId), eq(task.userId, ctx.session.user.id)),
        columns: { id: true },
      });
      if (!ownerTask) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }
    }

    const [created] = await ctx.db
      .insert(workSession)
      .values({
        id: crypto.randomUUID(),
        userId: ctx.session.user.id,
        taskId: input.taskId ?? null,
        title: input.title,
        notes: input.notes ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        tags: normalizeTags(input.tags),
      })
      .returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Work session was not created" });
    }

    return created;
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        taskId: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(1).max(180),
        notes: z.string().trim().max(2000).optional(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endsAt <= input.startsAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Session end must be after start" });
      }

      if (input.taskId) {
        const ownerTask = await ctx.db.query.task.findFirst({
          where: and(eq(task.id, input.taskId), eq(task.userId, ctx.session.user.id)),
          columns: { id: true },
        });
        if (!ownerTask) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        }
      }

      const [updated] = await ctx.db
        .update(workSession)
        .set({
          taskId: input.taskId ?? null,
          title: input.title,
          notes: input.notes ?? null,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          tags: normalizeTags(input.tags),
          updatedAt: new Date(),
        })
        .where(and(eq(workSession.id, input.id), eq(workSession.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work session not found" });
      }

      return updated;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(workSession)
        .where(and(eq(workSession.id, input.id), eq(workSession.userId, ctx.session.user.id)))
        .returning({ id: workSession.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work session not found" });
      }

      return deleted;
    }),
  sendInvite: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.workSession.findFirst({
        where: and(eq(workSession.id, input.sessionId), eq(workSession.userId, ctx.session.user.id)),
      });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work session not found" });
      }

      const sendResult = await createReminderEmailSender().sendCalendarInvite({
        toEmail: ctx.session.user.email,
        toName: ctx.session.user.name ?? "Momentum user",
        sessionId: row.id,
        title: row.title,
        notes: row.notes,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        tags: row.tags,
        idempotencyKey: `work-session-invite:${ctx.session.user.id}:${row.id}:${row.startsAt.toISOString()}`,
      });

      const [updated] = await ctx.db
        .update(workSession)
        .set({ updatedAt: new Date() })
        .where(and(eq(workSession.id, row.id), eq(workSession.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to confirm invite send" });
      }

      return {
        providerMessageId: sendResult.providerMessageId,
      };
    }),
  taskCandidates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.task.findMany({
      where: and(
        eq(task.userId, ctx.session.user.id),
        or(eq(task.status, "todo"), eq(task.status, "in_progress"), eq(task.status, "stalling")),
      ),
      orderBy: [asc(task.dueAt), asc(task.createdAt)],
      limit: 30,
    });
  }),
});
