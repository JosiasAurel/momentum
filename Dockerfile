FROM oven/bun:1.3.11 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.11 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/task_tracker \
  BETTER_AUTH_SECRET=0123456789abcdef0123456789abcdef \
  BETTER_AUTH_URL=http://localhost:3000 \
  NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  bun run build

FROM oven/bun:1.3.11 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["bun", "run", "start"]
