# Database Migrations

This directory contains SQL migration files for the D1 database.

## Running Migrations

### Local Development

```bash
# Apply migrations to local D1 database
wrangler d1 execute mvp-database --local --file=./migrations/0001_initial_schema.sql
```

### Production

```bash
# Apply migrations to production D1 database
wrangler d1 execute mvp-database --file=./migrations/0001_initial_schema.sql
```

### Preview/Staging

```bash
# Apply migrations to preview D1 database
wrangler d1 execute mvp-database --file=./migrations/0001_initial_schema.sql --preview
```

## Migration Naming Convention

Migrations should be named with a sequential number prefix:

- `0001_initial_schema.sql`
- `0002_add_user_profiles.sql`
- `0003_add_posts_table.sql`

## Creating a New Migration

1. Create a new SQL file with the next sequential number
2. Add your SQL statements (CREATE TABLE, ALTER TABLE, etc.)
3. Test locally first
4. Apply to staging/preview
5. Apply to production

## Best Practices

1. **Always test migrations locally first**
2. **Use transactions when possible**
3. **Create indexes for frequently queried columns**
4. **Include rollback statements in comments**
5. **Document schema changes in commit messages**

## Example Migration

```sql
-- Add user profile fields
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;

-- Create index for better query performance
CREATE INDEX idx_users_avatar ON users(avatar_url);

-- Rollback (manual):
-- ALTER TABLE users DROP COLUMN avatar_url;
-- ALTER TABLE users DROP COLUMN bio;
-- DROP INDEX idx_users_avatar;
```

## Checking Migration Status

```bash
# List all tables in your D1 database
wrangler d1 execute mvp-database --command "SELECT name FROM sqlite_master WHERE type='table';"

# Check a specific table structure
wrangler d1 execute mvp-database --command "PRAGMA table_info(users);"
```

## Troubleshooting

### Migration Failed

If a migration fails:

1. Check the error message
2. Verify SQL syntax
3. Check for constraint violations
4. Test on a local database first

### Rolling Back

D1 doesn't support automatic rollback. To rollback:

1. Create a new migration with reverse operations
2. Test thoroughly in local/staging
3. Apply to production

## Resources

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
