# Task Tracker App

Production-oriented task tracking app built with Bun, Next.js App Router, TypeScript, tRPC, Better Auth, Drizzle ORM, and PostgreSQL.

## Stack

- Bun scripts and package management
- Next.js 15 App Router + React 19 + TypeScript
- tRPC for typed server/client API
- Better Auth for email/password auth
- Drizzle ORM + PostgreSQL
- Tailwind CSS + shadcn-style UI primitives
- Docker multi-stage production image

## Prerequisites

- Bun `>=1.3`
- Docker (recommended for local PostgreSQL)
- PostgreSQL 16+ (if not using Docker)

## Environment Setup

1. Copy the env template:

```bash
cp .env.example .env
```

2. Set required values in `.env`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (32+ random characters)
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Optional values for reminder email delivery, S3 uploads, and seed behavior are already listed in `.env.example`.

## Local Development

1. Install dependencies:

```bash
bun install
```

2. Start PostgreSQL (Docker):

```bash
docker compose up -d postgres
```

3. Apply migrations:

```bash
bun run db:migrate
```

4. Start the app:

```bash
bun run dev
```

5. Create your first account at `http://localhost:3000/sign-up`.

6. (Optional) seed bootstrap workspace/project/tasks for an existing user:

```bash
# optional: choose the account that receives seed data
export SEED_USER_EMAIL="you@example.com"
bun run db:seed
```

For a one-command DB bootstrap after migrations:

```bash
bun run db:bootstrap
```

## Key Scripts

- `bun run dev`: start Next.js dev server
- `bun run build`: production build
- `bun run start`: run production build
- `bun run test`: run reminder/domain unit tests with Bun
- `bun run lint`: lint checks
- `bun run typecheck`: TypeScript checks
- `bun run verify`: `typecheck + lint + build`
- `bun run worker:reminders`: run reminder planner + overdue rescheduler + sender worker
- `bun run worker:reminders:dry`: run worker in dry-run mode (marks sends without delivering email)
- `bun run db:generate`: generate Drizzle migrations
- `bun run db:migrate`: apply Drizzle migrations
- `bun run db:push`: push schema directly (dev-only shortcut)
- `bun run db:studio`: open Drizzle Studio
- `bun run db:seed`: idempotent local seed for first/existing user
- `bun run db:bootstrap`: migrate then seed
- `bun run docker:build`: build production container image
- `bun run docker:run`: run image with local `.env`

## Behavior Notes

- Reminders/overdue worker flow: reminders are persisted and processed by worker execution; frequency increases as due dates approach, and overdue unfinished tasks move to the next available day slot.
- Upload flow: authenticated users upload files to S3 and reference attachments from devlogs.
- Public profile flow: each user has a unique username and opt-in public profile/devlog visibility at `/username`.

These behaviors depend on corresponding feature modules and env variables being configured in your branch/environment.

## Reminder Worker

The reminder subsystem is worker-driven and idempotent:

- Reminder events are generated and stored in `reminder_event`.
- Email delivery attempts and state transitions are audited in `reminder_event_audit`.
- Overdue auto-reschedules are stored in `overdue_reschedule_event`.

Run locally:

```bash
bun run worker:reminders:dry
```

Run with delivery enabled (requires `RESEND_API_KEY` + `RESEND_FROM_EMAIL`):

```bash
bun run worker:reminders
```

Production cron example:

```bash
*/10 * * * * cd /app && bun run worker:reminders
```

## Docker (Production-Oriented)

Build image:

```bash
bun run docker:build
```

Run image:

```bash
docker run --rm \
  --env-file .env \
  -e RUN_MIGRATIONS=true \
  -p 3000:3000 \
  task-tracker-app
```

`RUN_MIGRATIONS=true` executes `bun run db:migrate` in the container entrypoint before starting the app.

## Verification Checklist

Run before shipping:

```bash
bun run typecheck
bun run lint
bun run build
```

If using Docker for deployment checks:

```bash
docker build -t task-tracker-app:verify .
```

## Troubleshooting

- `No users found` during seed: sign up once in the app, then rerun `bun run db:seed`.
- DB connection errors: verify `DATABASE_URL` and that PostgreSQL is reachable.
- Auth callback/session issues: confirm `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` match the running app URL.
