import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const healthRouter = createTRPCRouter({
  ping: publicProcedure
    .input(z.object({ message: z.string().optional() }).optional())
    .query(({ input }) => {
      return {
        ok: true,
        message: input?.message ?? "pong",
        timestamp: new Date().toISOString(),
      };
    }),
});
