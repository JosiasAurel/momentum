import { createTRPCRouter } from "@/server/api/trpc";
import { devlogRouter } from "@/server/api/routers/devlog";
import { folderRouter } from "@/server/api/routers/folder";
import { healthRouter } from "@/server/api/routers/health";
import { profileRouter } from "@/server/api/routers/profile";
import { projectRouter } from "@/server/api/routers/project";
import { taskRouter } from "@/server/api/routers/task";
import { workSessionRouter } from "@/server/api/routers/work-session";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  profile: profileRouter,
  folder: folderRouter,
  project: projectRouter,
  task: taskRouter,
  workSession: workSessionRouter,
  devlog: devlogRouter,
});

export type AppRouter = typeof appRouter;
