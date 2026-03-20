# Tasktracker Foundation

Production-oriented starter for the task tracker app using Bun, Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui primitives, tRPC, Drizzle ORM, PostgreSQL, and Better Auth.

## Stack Baseline

- Bun package manager and scripts
- Next.js App Router + TypeScript + Tailwind CSS
- shadcn/ui-style reusable primitives (`Button`, `Card`, `Input`, `Label`)
- tRPC server route + typed client provider
- Drizzle ORM PostgreSQL config + schema
- Better Auth email/password baseline + Next.js auth route
- Docker + PostgreSQL compose baseline

## Bootstrap

1. Copy env vars:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
bun install
```

3. Start PostgreSQL (Docker) or use an existing local PostgreSQL instance reachable at `127.0.0.1:5432`:

```bash
docker compose up -d postgres
```

4. Generate/apply schema:

```bash
bun run db:generate
bun run db:migrate
```

5. Run app:

```bash
bun run dev
```

Open http://localhost:3000.

## Scripts

- `bun run dev` - Run Next.js dev server
- `bun run build` - Production build
- `bun run start` - Start built app
- `bun run typecheck` - TypeScript checks
- `bun run db:generate` - Generate Drizzle SQL migration files
- `bun run db:migrate` - Apply migrations to PostgreSQL
- `bun run db:push` - Push schema directly to DB
- `bun run db:studio` - Open Drizzle Studio
