# Database Documentation

## Overview

This directory contains database schema and migration files for Cloudflare D1.

## Files

- `schema.sql` - Complete database schema (for reference and initial setup)
- `migrations/` - Individual migration files in chronological order

## Setup

### 1. Create a D1 Database

```bash
# Create a new D1 database
wrangler d1 create mvp-template-db

# Note the database ID from the output and add it to wrangler.toml
```

### 2. Run Migrations

```bash
# Execute the complete schema
wrangler d1 execute mvp-template-db --file=./src/worker/db/schema.sql --local

# Or run individual migrations in order
wrangler d1 execute mvp-template-db --file=./src/worker/db/migrations/0001_initial.sql --local
wrangler d1 execute mvp-template-db --file=./src/worker/db/migrations/0002_sessions.sql --local
```

### 3. For Production

Remove the `--local` flag to run against production:

```bash
wrangler d1 execute mvp-template-db --file=./src/worker/db/schema.sql
```

## Creating New Migrations

1. Create a new file in `migrations/` with format: `XXXX_description.sql`
2. Write your SQL changes
3. Run the migration using wrangler
4. Update this README with migration notes

## Database Schema

### Users Table

Stores user account information.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Sessions Table

Stores user session tokens for authentication.

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### API Keys Table

Stores API keys for programmatic access.

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Audit Logs Table

Stores audit trail of user actions.

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Useful Commands

```bash
# List all tables
wrangler d1 execute mvp-template-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# Query users
wrangler d1 execute mvp-template-db --command="SELECT * FROM users LIMIT 10"

# Backup database (local)
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite .dump > backup.sql
```

## Best Practices

1. **Always use migrations** - Don't modify the schema.sql directly in production
2. **Test locally first** - Use `--local` flag to test migrations
3. **Backup before migrations** - Create backups before running migrations on production
4. **Use transactions** - Wrap multiple changes in BEGIN/COMMIT
5. **Add indexes** - Create indexes for frequently queried columns
6. **Use TEXT for dates** - D1 doesn't have native date types, use ISO 8601 format
