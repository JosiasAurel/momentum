#!/usr/bin/env sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "RUN_MIGRATIONS=true detected: applying migrations before start"
  bun run db:migrate
fi

exec "$@"
