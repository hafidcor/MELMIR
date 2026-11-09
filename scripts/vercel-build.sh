#!/bin/sh
set -e
npx prisma generate
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL present, syncing schema and seeding..."
  npx prisma db push --accept-data-loss || echo "db push failed, continuing build"
  npx tsx prisma/seed.ts || echo "seed failed, continuing build"
else
  echo "No DATABASE_URL, skipping DB setup"
fi
npx next build
