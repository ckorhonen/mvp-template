# Database Migrations

This directory contains SQL migration files for the D1 database.

## Migration Naming Convention

Migrations are numbered sequentially:
- `0001_initial.sql` - Initial database setup
- `0002_add_products.sql` - Add products table
- `0003_add_analytics.sql` - Add analytics events table
- etc.

## Running Migrations

### Local Development

```bash
# Create a new local D1 database
wrangler d1 create mvp-database

# Apply migrations locally
wrangler d1 execute mvp-database --local --file=src/worker/db/migrations/0001_initial.sql
```

### Production

```bash
# Apply migrations to production
wrangler d1 execute mvp-database --file=src/worker/db/migrations/0001_initial.sql
```

## Migration Strategy

1. **Never modify existing migrations** - Always create a new migration file
2. **Test locally first** - Always test migrations with `--local` flag
3. **Backup before production** - D1 doesn't support automatic rollbacks
4. **Keep migrations small** - One logical change per migration
5. **Use transactions** - Wrap multiple statements in transactions when possible

## Creating a New Migration

1. Create a new file with the next number: `000X_description.sql`
2. Write your SQL statements
3. Test locally
4. Apply to staging
5. Review and apply to production

## Example: Creating and Running a Migration

```bash
# Create new migration file
touch src/worker/db/migrations/0004_add_user_preferences.sql

# Edit the file with your SQL
cat > src/worker/db/migrations/0004_add_user_preferences.sql << 'EOF'
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_user_preferences ON user_preferences(user_id, key);
EOF

# Test locally
wrangler d1 execute mvp-database --local --file=src/worker/db/migrations/0004_add_user_preferences.sql

# Apply to production
wrangler d1 execute mvp-database --file=src/worker/db/migrations/0004_add_user_preferences.sql
```

## Seeding Data

For seed data, create separate files in a `seeds/` subdirectory:

```bash
mkdir -p src/worker/db/seeds
cat > src/worker/db/seeds/demo_users.sql << 'EOF'
INSERT INTO users (id, email, name) VALUES
  ('user-1', 'demo@example.com', 'Demo User'),
  ('user-2', 'test@example.com', 'Test User');
EOF

# Load seed data
wrangler d1 execute mvp-database --local --file=src/worker/db/seeds/demo_users.sql
```
