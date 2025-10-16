# Database Migrations

This directory contains D1 database migrations for the MVP template.

## Migration Files

- `0001_initial_schema.sql` - Initial database schema with core tables
- `0002_sample_data.sql` - Sample data for development and testing

## Running Migrations

### Development/Preview

```bash
# Create the database (first time only)
wrangler d1 create mvp-database

# Run initial schema
wrangler d1 execute DB --file=migrations/0001_initial_schema.sql

# Add sample data (optional)
wrangler d1 execute DB --file=migrations/0002_sample_data.sql
```

### Staging

```bash
wrangler d1 execute DB --env=staging --file=migrations/0001_initial_schema.sql
```

### Production

```bash
wrangler d1 execute DB --env=production --file=migrations/0001_initial_schema.sql
```

## Database Schema

### Tables

#### users
Stores user accounts and profiles.

- `id` - Primary key
- `email` - User email (unique)
- `name` - User's display name
- `avatar_url` - Profile picture URL
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp
- `deleted_at` - Soft delete timestamp

#### sessions
Manages user sessions.

- `id` - Session ID (primary key)
- `user_id` - Foreign key to users
- `expires_at` - Session expiration timestamp
- `data` - JSON session data
- `created_at` - Session creation timestamp

#### api_keys
API key management for programmatic access.

- `id` - Primary key
- `user_id` - Foreign key to users
- `key_hash` - Hashed API key (unique)
- `name` - Descriptive name for the key
- `scopes` - JSON array of permission scopes
- `last_used_at` - Last usage timestamp
- `created_at` - Key creation timestamp
- `expires_at` - Key expiration timestamp
- `revoked_at` - Key revocation timestamp

#### posts
Example content/posts table.

- `id` - Primary key
- `user_id` - Foreign key to users
- `title` - Post title
- `content` - Post content
- `slug` - URL-friendly identifier (unique)
- `published` - Publication status
- `published_at` - Publication timestamp
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

#### audit_logs
Tracks important actions for security and compliance.

- `id` - Primary key
- `user_id` - Foreign key to users (nullable)
- `action` - Action performed
- `resource_type` - Type of resource affected
- `resource_id` - ID of the resource
- `details` - JSON object with additional details
- `ip_address` - Client IP address
- `user_agent` - Client user agent
- `created_at` - Action timestamp

#### settings
Application configuration and settings.

- `id` - Primary key
- `key` - Setting key (unique)
- `value` - Setting value
- `description` - Setting description
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Best Practices

1. **Version Control**: Always commit migration files to version control
2. **Naming**: Use sequential numbering: `0001_`, `0002_`, etc.
3. **Testing**: Test migrations on development/staging before production
4. **Backups**: Always backup production data before running migrations
5. **Rollback Plan**: Have a rollback strategy for each migration
6. **Documentation**: Document any complex migrations or data transformations

## Creating New Migrations

1. Create a new file with the next sequential number
2. Write your SQL statements
3. Test locally with `wrangler d1 execute`
4. Commit to version control
5. Deploy to environments in order: dev → staging → production

## Useful Commands

```bash
# List all databases
wrangler d1 list

# Query the database
wrangler d1 execute DB --command="SELECT * FROM users"

# Export data
wrangler d1 execute DB --command="SELECT * FROM users" --json > users_backup.json

# Get database info
wrangler d1 info DB
```
