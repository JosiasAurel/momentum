import { and, asc, count, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { project, task } from "@/server/db/schema";

const taskStatusValues = ["todo", "in_progress", "stalling", "done"] as const;
const taskStatusSchema = z.enum(taskStatusValues);

const taskInput = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(300).max(10000),
  dueAt: z.coerce.date().optional(),
});

export const taskRouter = createTRPCRouter({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.task.findMany({
        where: and(eq(task.userId, ctx.session.user.id), eq(task.projectId, input.projectId)),
        orderBy: [asc(task.createdAt)],
      });
    }),
  create: protectedProcedure.input(taskInput).mutation(async ({ ctx, input }) => {
    const ownerProject = await ctx.db.query.project.findFirst({
      where: and(eq(project.id, input.projectId), eq(project.userId, ctx.session.user.id)),
      columns: { id: true },
    });

    if (!ownerProject) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    const [created] = await ctx.db
      .insert(task)
      .values({
        id: crypto.randomUUID(),
        userId: ctx.session.user.id,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        dueAt: input.dueAt,
      })
      .returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Task was not created" });
    }

    return created;
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(180),
        description: z.string().trim().min(300).max(10000),
        dueAt: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(task)
        .set({
          title: input.title,
          description: input.description,
          dueAt: input.dueAt ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(task.id, input.id), eq(task.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      return updated;
    }),
  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: taskStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const completedAt = input.status === "done" ? new Date() : null;
      const [updated] = await ctx.db
        .update(task)
        .set({
          status: input.status,
          completedAt,
          updatedAt: new Date(),
          isActive: input.status === "done" ? false : undefined,
        })
        .where(and(eq(task.id, input.id), eq(task.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      return updated;
    }),
  setActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.query.task.findFirst({
        where: and(eq(task.id, input.id), eq(task.userId, ctx.session.user.id)),
        columns: { id: true, status: true },
      });

      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      if (candidate.status === "done") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Completed tasks cannot be active" });
      }

      await ctx.db
        .update(task)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(task.userId, ctx.session.user.id));

      const [updated] = await ctx.db
        .update(task)
        .set({ isActive: true, updatedAt: new Date() })
        .where(and(eq(task.id, input.id), eq(task.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      return updated;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(task)
        .where(and(eq(task.id, input.id), eq(task.userId, ctx.session.user.id)))
        .returning({ id: task.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      return deleted;
    }),
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const now = new Date();

    const rows = await ctx.db
      .select({ status: task.status, value: count(task.id) })
      .from(task)
      .where(eq(task.userId, userId))
      .groupBy(task.status);

    const statusCounts = {
      todo: 0,
      in_progress: 0,
      stalling: 0,
      done: 0,
    };

    for (const row of rows) {
      statusCounts[row.status] = Number(row.value);
    }

    const activeTask = await ctx.db.query.task.findFirst({
      where: and(eq(task.userId, userId), eq(task.isActive, true)),
      orderBy: [asc(task.updatedAt)],
    });

    const upcomingTasks = await ctx.db.query.task.findMany({
      where: and(eq(task.userId, userId), isNull(task.completedAt), gte(task.dueAt, now)),
      orderBy: [asc(task.dueAt)],
      limit: 5,
    });

    const overdueTasks = await ctx.db.query.task.findMany({
      where: and(eq(task.userId, userId), isNull(task.completedAt), lt(task.dueAt, now)),
      orderBy: [asc(task.dueAt)],
      limit: 5,
    });

    return {
      statusCounts,
      activeTask,
      upcomingTasks,
      overdueTasks,
    };
  }),
});
