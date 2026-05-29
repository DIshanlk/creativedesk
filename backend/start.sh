#!/bin/sh
set -e
cd "$(dirname "$0")"
export NODE_ENV=production
export DATABASE_URL="${DATABASE_URL:-file:./prisma/prod.db}"

echo "==> Syncing database..."
npx prisma db push --skip-generate

if [ -f dist/index.js ]; then
  echo "==> Starting CreativeDesk on port ${PORT:-4002}..."
  exec node dist/index.js
else
  echo "==> Starting CreativeDesk (legacy path) on port ${PORT:-4002}..."
  exec node dist/src/index.js
fi
