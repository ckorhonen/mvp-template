#!/bin/bash

# D1 Database Migration Script
# Usage: ./scripts/migrate.sh [environment]
# Example: ./scripts/migrate.sh production

set -e

ENVIRONMENT=${1:-"development"}
MIGRATIONS_DIR="src/worker/db/migrations"
DATABASE_NAME="mvp-database"

echo "🔄 Running migrations for environment: $ENVIRONMENT"
echo "📁 Migrations directory: $MIGRATIONS_DIR"
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

# Count migration files
MIGRATION_COUNT=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)

if [ "$MIGRATION_COUNT" -eq 0 ]; then
  echo "⚠️  No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

echo "📝 Found $MIGRATION_COUNT migration file(s)"
echo ""

# Execute each migration in order
for migration in "$MIGRATIONS_DIR"/*.sql; do
  MIGRATION_FILE=$(basename "$migration")
  echo "⏳ Applying migration: $MIGRATION_FILE"
  
  if [ "$ENVIRONMENT" = "production" ]; then
    wrangler d1 execute "$DATABASE_NAME" --remote --file="$migration"
  else
    wrangler d1 execute "$DATABASE_NAME" --local --file="$migration"
  fi
  
  if [ $? -eq 0 ]; then
    echo "✅ Successfully applied: $MIGRATION_FILE"
  else
    echo "❌ Failed to apply: $MIGRATION_FILE"
    exit 1
  fi
  echo ""
done

echo "🎉 All migrations completed successfully!"
