#!/usr/bin/env bash
# ============================================================
# VaultGuard — Cloud SQL Database Migration & Seeding Helper
# ============================================================

set -e

DB_URL=${1:-$DATABASE_URL}

if [ -z "$DB_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable or argument is required."
  echo "Usage: ./deploy/seed-cloud.sh <DATABASE_URL>"
  exit 1
fi

echo "🚀 Applying Prisma database schema to Cloud SQL..."
DATABASE_URL="$DB_URL" npx prisma db push

echo "🌱 Seeding demo users, accounts, payees, and active loans..."
DATABASE_URL="$DB_URL" npm run db:seed

echo "✓ Cloud SQL database migration and seeding successfully completed!"
