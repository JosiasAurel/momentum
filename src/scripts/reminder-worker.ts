import { DEFAULT_WORKER_BATCH_SIZE } from "@/server/reminders/constants";
import { runReminderWorker } from "@/server/reminders/worker";

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");

  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const parsedLimit = limitArg ? Number(limitArg.split("=")[1]) : DEFAULT_WORKER_BATCH_SIZE;

  return {
    dryRun,
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_WORKER_BATCH_SIZE,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runReminderWorker({
    dryRun: args.dryRun,
    limit: args.limit,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown worker failure";
  console.error(message);
  process.exit(1);
});
