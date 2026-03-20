# Momentum

Momentum is a production-ready personal project/task tracker built with Bun, Next.js App Router, TypeScript, tRPC, Better Auth, Drizzle ORM, and PostgreSQL.

## What Ships

- Authenticated workspace with folders, projects, and tasks.
- Reminder scheduling, idempotent reminder delivery, and overdue auto-rescheduling.
- Markdown devlogs with optional S3-backed attachments.
- Public profile/devlog surfaces at `/[username]` with opt-in visibility.

## Stack

- Bun scripts and package management.
- Next.js 15 App Router + React 19 + TypeScript.
- tRPC for typed API boundaries.
- Better Auth for email/password auth.
- Drizzle ORM + PostgreSQL.
- Tailwind CSS + shadcn-style primitives.
- Docker multi-stage production image.

## Prerequisites

- Bun `>=1.3`.
- Docker (recommended for local PostgreSQL and image verification).
- PostgreSQL 16+ (if not using Docker Compose).

## Quick Start (Local)

1. Copy env template:

```bash
cp .env.example .env
```

2. Set required variables in `.env`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (32+ random characters)
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

3. Install dependencies:

```bash
bun install
```

4. Start PostgreSQL:

```bash
docker compose up -d postgres
```

5. Apply schema:

```bash
bun run db:migrate
```

6. Bootstrap sample data (optional but recommended for first run):

```bash
bun run db:bootstrap
```

7. Start web app:

```bash
bun run dev
```

8. Start reminder worker in a second terminal:

```bash
bun run worker:reminders:dry
```

Switch to `bun run worker:reminders` when `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured.

## Environment Reference

Required for app startup/build:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Optional but relevant:

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `REMINDER_WORKER_BATCH_SIZE` for reminder email delivery.
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_PUBLIC_BASE_URL` for attachment uploads.
- `SEED_USER_EMAIL` to target a specific existing account during `db:seed`.

## Script Reference

- `bun run dev`: start Next.js dev server.
- `bun run build`: production build.
- `bun run start`: run production server.
- `bun run test`: reminder/rescheduler unit tests.
- `bun run lint`: lint checks.
- `bun run typecheck`: TypeScript checks.
- `bun run verify`: `typecheck + lint + build`.
- `bun run worker:reminders`: live reminder worker.
- `bun run worker:reminders:dry`: dry-run reminder worker.
- `bun run db:generate`: generate Drizzle migrations.
- `bun run db:migrate`: apply Drizzle migrations.
- `bun run db:push`: schema push shortcut (dev-only).
- `bun run db:studio`: Drizzle Studio.
- `bun run db:seed`: idempotent seed for an existing user.
- `bun run db:bootstrap`: migrate then seed.
- `bun run docker:build`: build production image.
- `bun run docker:run`: run app image with local `.env`.
- `bun run docker:run:migrate`: run app image and migrate at startup.
- `bun run docker:worker:reminders`: run reminder worker from container image.

## Behavior Notes

- Reminder events are persisted/auditable and processed idempotently by the worker.
- Overdue unfinished tasks are rescheduled to the next available day slot.
- Devlog attachment uploads require valid S3 configuration.
- Public profile/devlogs are opt-in and rendered at `/[username]`.

## Deployment Runbook

1. Build image:

```bash
bun run docker:build
```

2. Start app container with startup migrations:

```bash
bun run docker:run:migrate
```

3. Run reminder worker separately (cron/scheduled job):

```bash
bun run docker:worker:reminders
```

Recommended production schedule:

```bash
*/10 * * * * bun run docker:worker:reminders
```

## Verification Checklist

Run before release:

```bash
bun run verify
bun test
bun run db:migrate
bun run db:bootstrap
bun run worker:reminders:dry -- --limit=5
docker build -t task-tracker-app:verify .
```

## Troubleshooting

- `No users found` during seed: sign up once, then rerun `bun run db:seed`.
- DB connection failures: verify `DATABASE_URL` and that PostgreSQL is reachable.
- Auth callback/session issues: ensure `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` match the running host.
