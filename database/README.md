# D1 Database Setup

This directory contains the database schema, migrations, and seed data for the Cloudflare D1 database.

## Quick Start

### 1. Create a D1 Database

```bash
# Create production database
wrangler d1 create mvp-database

# Create preview/development database
wrangler d1 create mvp-database-preview
```

Update your `wrangler.toml` with the database IDs returned from these commands.

### 2. Run Migrations

```bash
# Apply migrations to local database (for development)
npm run db:migrate:local

# Apply migrations to remote database (production)
npm run db:migrate:remote
```

Or manually:

```bash
# Local
wrangler d1 execute mvp-database --local --file=./database/schema.sql

# Remote
wrangler d1 execute mvp-database --remote --file=./database/schema.sql
```

### 3. Seed Database (Development Only)

```bash
# Seed local database
wrangler d1 execute mvp-database --local --file=./database/seed.sql
```

## Database Schema

### Tables

#### `users`
Stores user information.

- `id` (INTEGER, PRIMARY KEY)
- `email` (TEXT, UNIQUE)
- `name` (TEXT)
- `created_at` (TEXT)
- `updated_at` (TEXT)

#### `api_keys`
API keys for authentication.

- `id` (INTEGER, PRIMARY KEY)
- `user_id` (INTEGER, FOREIGN KEY)
- `key_hash` (TEXT, UNIQUE)
- `name` (TEXT)
- `last_used_at` (TEXT, NULLABLE)
- `expires_at` (TEXT, NULLABLE)
- `created_at` (TEXT)

#### `sessions`
User session data.

- `id` (TEXT, PRIMARY KEY)
- `user_id` (INTEGER, FOREIGN KEY)
- `data` (TEXT)
- `expires_at` (TEXT)
- `created_at` (TEXT)

#### `ai_requests`
Logs AI Gateway requests for tracking and analytics.

- `id` (INTEGER, PRIMARY KEY)
- `user_id` (INTEGER, FOREIGN KEY, NULLABLE)
- `model` (TEXT)
- `prompt_tokens` (INTEGER)
- `completion_tokens` (INTEGER)
- `total_tokens` (INTEGER)
- `request_duration_ms` (INTEGER, NULLABLE)
- `created_at` (TEXT)

#### `files`
Metadata for files stored in R2.

- `id` (INTEGER, PRIMARY KEY)
- `user_id` (INTEGER, FOREIGN KEY)
- `key` (TEXT, UNIQUE)
- `filename` (TEXT)
- `content_type` (TEXT)
- `size` (INTEGER)
- `bucket` (TEXT)
- `created_at` (TEXT)

## Migrations

Migrations are located in `database/migrations/` and should be run in order:

1. `0001_initial.sql` - Initial users table
2. `0002_api_keys.sql` - API keys table
3. `0003_sessions_and_logs.sql` - Sessions and AI request logging
4. `0004_files.sql` - File metadata table

## Querying the Database

### Via Wrangler CLI

```bash
# Query local database
wrangler d1 execute mvp-database --local --command="SELECT * FROM users"

# Query remote database
wrangler d1 execute mvp-database --remote --command="SELECT * FROM users"
```

### In Your Worker Code

See `src/worker/utils/db.ts` for the D1Manager utility class and examples.

## Best Practices

1. **Always use prepared statements** to prevent SQL injection
2. **Create indexes** for frequently queried columns
3. **Use transactions** for multiple related operations
4. **Keep migrations idempotent** using `IF NOT EXISTS`
5. **Test migrations locally** before applying to production
6. **Back up your database** before running migrations in production

## Useful Commands

```bash
# List all databases
wrangler d1 list

# Get database info
wrangler d1 info mvp-database

# Export database
wrangler d1 export mvp-database --output=backup.sql

# Delete database (careful!)
wrangler d1 delete mvp-database
```
