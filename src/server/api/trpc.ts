import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

export async function createTRPCContext(opts: { headers: Headers }) {
  return {
    headers: opts.headers,
  };
}

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ next }) => {
  // Session-enforced middleware will be added when authenticated app routes are introduced.
  throw new TRPCError({ code: "UNAUTHORIZED" });
  return next();
});
