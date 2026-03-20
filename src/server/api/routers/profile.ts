import { and, eq, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, createTRPCRouter } from "@/server/api/trpc";
import { user } from "@/server/db/schema";
import { getPublicProfileByUsername } from "@/server/profile/public-profile";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, "Username may only include lowercase letters, numbers, and underscores");

export const profileRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.session.user.id),
      columns: {
        id: true,
        email: true,
        name: true,
        username: true,
        isProfilePublic: true,
      },
    });

    if (!currentUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return currentUser;
  }),
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        username: usernameSchema,
        isProfilePublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conflicting = await ctx.db.query.user.findFirst({
        where: and(eq(user.username, input.username), ne(user.id, ctx.session.user.id)),
        columns: { id: true },
      });

      if (conflicting) {
        throw new TRPCError({ code: "CONFLICT", message: "Username is already taken" });
      }

      const [updated] = await ctx.db
        .update(user)
        .set({
          name: input.name,
          username: input.username,
          isProfilePublic: input.isProfilePublic,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id))
        .returning({
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          isProfilePublic: user.isProfilePublic,
        });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return updated;
    }),
  publicByUsername: publicProcedure
    .input(
      z.object({
        username: usernameSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const publicProfile = await getPublicProfileByUsername(ctx.db, input.username);

      if (!publicProfile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Public profile not found" });
      }

      return publicProfile;
    }),
});
