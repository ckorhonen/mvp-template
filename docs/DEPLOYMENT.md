# Deployment Guide

Complete guide for deploying your MVP template to Cloudflare Workers with all services.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Service Configuration](#service-configuration)
- [GitHub Actions Setup](#github-actions-setup)
- [Manual Deployment](#manual-deployment)
- [Post-Deployment](#post-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Cloudflare account with Workers enabled
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Logged in to Cloudflare (`wrangler login`)
- [ ] Account ID from Cloudflare dashboard
- [ ] All required services created (D1, KV, R2, etc.)
- [ ] Environment variables configured
- [ ] Database migrations tested locally
- [ ] All tests passing
- [ ] Code reviewed and approved

## Environment Setup

### 1. Get Cloudflare Account ID

```bash
npx wrangler whoami
```

Copy your Account ID and update `wrangler.toml`:

```toml
account_id = "your-account-id-here"
```

### 2. Create API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Add permissions:
   - Workers Scripts: Edit
   - Workers KV Storage: Edit
   - Workers R2 Storage: Edit
   - D1: Edit
   - Account Settings: Read
5. Click "Continue to summary" and "Create Token"
6. Save the token securely

### 3. Set Environment Variables

Update `.env` file:

```bash
cp .env.example .env
# Edit .env with your actual values
```

## Database Setup

### 1. Create D1 Databases

```bash
# Production
npx wrangler d1 create mvp-database-production

# Staging
npx wrangler d1 create mvp-database-staging

# Development
npx wrangler d1 create mvp-database
```

### 2. Update wrangler.toml

Add the database IDs to `wrangler.toml` for each environment.

### 3. Run Migrations

```bash
# Development
npx wrangler d1 execute mvp-database --local --file=./migrations/0001_initial_schema.sql

# Staging
npx wrangler d1 execute mvp-database-staging --file=./migrations/0001_initial_schema.sql

# Production (be careful!)
npx wrangler d1 execute mvp-database-production --file=./migrations/0001_initial_schema.sql
```

### 4. Verify Database

```bash
# List tables
npx wrangler d1 execute mvp-database --command "SELECT name FROM sqlite_master WHERE type='table';"

# Check a table
npx wrangler d1 execute mvp-database --command "SELECT * FROM users LIMIT 5;"
```

## Service Configuration

### KV Namespaces

```bash
# Create production namespaces
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create SESSIONS
npx wrangler kv:namespace create CONFIG

# Create staging namespaces
npx wrangler kv:namespace create CACHE --env staging
npx wrangler kv:namespace create SESSIONS --env staging
npx wrangler kv:namespace create CONFIG --env staging

# Create preview namespaces
npx wrangler kv:namespace create CACHE --preview
npx wrangler kv:namespace create SESSIONS --preview
npx wrangler kv:namespace create CONFIG --preview
```

Update `wrangler.toml` with the namespace IDs.

### R2 Buckets

```bash
# Production buckets
npx wrangler r2 bucket create mvp-assets-production
npx wrangler r2 bucket create mvp-uploads-production
npx wrangler r2 bucket create mvp-backups-production

# Staging buckets
npx wrangler r2 bucket create mvp-assets-staging
npx wrangler r2 bucket create mvp-uploads-staging
npx wrangler r2 bucket create mvp-backups-staging

# Development/Preview buckets
npx wrangler r2 bucket create mvp-assets-preview
npx wrangler r2 bucket create mvp-uploads-preview
npx wrangler r2 bucket create mvp-backups-preview
```

Update `wrangler.toml` with bucket names.

### Queues

```bash
# Create queues
npx wrangler queues create mvp-tasks
npx wrangler queues create mvp-emails
npx wrangler queues create mvp-notifications

# Create dead letter queues
npx wrangler queues create mvp-tasks-dlq
npx wrangler queues create mvp-emails-dlq
```

### AI Gateway

1. Go to [AI Gateway Dashboard](https://dash.cloudflare.com/ai/ai-gateway)
2. Create a new gateway:
   - Name: `mvp-gateway`
   - Provider: OpenAI
3. Copy the Gateway ID
4. Set as secret:

```bash
npx wrangler secret put AI_GATEWAY_ID
```

### Set Secrets

```bash
# OpenAI API Key
npx wrangler secret put OPENAI_API_KEY

# Session Secret
npx wrangler secret put SESSION_SECRET

# JWT Secret
npx wrangler secret put JWT_SECRET

# For staging
npx wrangler secret put OPENAI_API_KEY --env staging
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put JWT_SECRET --env staging

# For production
npx wrangler secret put OPENAI_API_KEY --env production
npx wrangler secret put SESSION_SECRET --env production
npx wrangler secret put JWT_SECRET --env production
```

## GitHub Actions Setup

### 1. Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CODECOV_TOKEN` - (Optional) Codecov token
- `SNYK_TOKEN` - (Optional) Snyk token

### 2. Configure Environments

Create GitHub environments:

1. Go to Settings → Environments
2. Create `staging` environment:
   - Add protection rules if needed
   - Set environment secrets/variables
3. Create `production` environment:
   - ✅ Required reviewers (recommended)
   - ✅ Wait timer (optional)
   - Add production-specific secrets

### 3. Update Workflow

Edit `.github/workflows/ci-cd.yml` if needed:

```yaml
environment:
  name: production
  url: https://your-domain.com
```

## Manual Deployment

### Development/Testing

```bash
# Build
npm run build:worker

# Test locally
npx wrangler dev --local

# Deploy to dev
npx wrangler deploy
```

### Staging

```bash
# Build
npm run build:worker

# Deploy to staging
npx wrangler deploy --env staging

# Verify
curl https://staging.your-domain.com/api/health
```

### Production

```bash
# Build
npm run build:worker

# Deploy to production
npx wrangler deploy --env production

# Verify
curl https://your-domain.com/api/health
```

## Post-Deployment

### 1. Health Check

```bash
# Check worker health
curl https://your-domain.com/api/health

# Should return:
# {
#   "success": true,
#   "data": {
#     "status": "healthy",
#     "services": { ... }
#   }
# }
```

### 2. Database Verification

```bash
# Check database connectivity
npx wrangler d1 execute mvp-database-production --command "SELECT COUNT(*) FROM users;"
```

### 3. Monitor Logs

```bash
# Tail production logs
npx wrangler tail --env production

# Filter for errors
npx wrangler tail --env production --format json | grep '"level":"error"'
```

### 4. Test Critical Paths

- [ ] User registration works
- [ ] Authentication works
- [ ] AI endpoints respond
- [ ] File uploads work
- [ ] Cache is working
- [ ] Analytics tracking works

### 5. Update DNS (if needed)

If deploying to a custom domain:

1. Go to your domain in Cloudflare Dashboard
2. Add/update DNS records:
   ```
   Type: CNAME
   Name: @ (or subdomain)
   Target: your-worker.workers.dev
   ```
3. Update route in `wrangler.toml`:
   ```toml
   route = { pattern = "your-domain.com/*", zone_name = "your-domain.com" }
   ```

## Rollback Procedures

### Quick Rollback

If something goes wrong, rollback to previous version:

```bash
# List deployments
npx wrangler deployments list

# Rollback to specific deployment
npx wrangler rollback [DEPLOYMENT_ID]
```

### Full Rollback

1. Revert code changes:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. GitHub Actions will automatically deploy the reverted code

3. If database migrations were applied, create reverse migration:
   ```sql
   -- migrations/0002_rollback.sql
   -- Reverse changes from previous migration
   ```

### Emergency Rollback

If you need to rollback immediately:

```bash
# Switch to previous commit
git checkout [PREVIOUS_COMMIT_SHA]

# Force deploy
npx wrangler deploy --env production
```

## Monitoring

### Cloudflare Dashboard

Monitor in real-time:
- Workers Analytics
- D1 Analytics
- R2 Analytics
- AI Gateway Analytics

### Logs

```bash
# Real-time logs
npx wrangler tail --env production

# Search logs
npx wrangler tail --env production --search "error"

# Filter by status
npx wrangler tail --env production --status error
```

### Metrics

Key metrics to monitor:

1. **Request Rate**
   - Total requests/second
   - Success rate
   - Error rate

2. **Response Time**
   - P50, P95, P99 latency
   - Cache hit rate

3. **Database**
   - Query performance
   - Connection errors
   - Row counts

4. **AI Usage**
   - API calls/day
   - Token usage
   - Cost tracking

5. **Storage**
   - KV operations
   - R2 bandwidth
   - D1 queries

### Alerts

Set up alerts in Cloudflare Dashboard:
1. Go to Notifications
2. Create alerts for:
   - High error rates
   - Unusual traffic patterns
   - Service degradation
   - Budget thresholds

## Troubleshooting

### Common Issues

**Worker not updating:**
```bash
# Clear cache and redeploy
npx wrangler deploy --env production --compatibility-date $(date +%Y-%m-%d)
```

**Database connection failed:**
```bash
# Verify binding
npx wrangler deployments list
npx wrangler d1 execute mvp-database-production --command "SELECT 1;"
```

**KV not found:**
```bash
# Check namespace binding
npx wrangler kv:namespace list
```

**Secrets not working:**
```bash
# Re-set secret
npx wrangler secret put SECRET_NAME --env production
```

### Getting Help

- [Cloudflare Workers Discord](https://discord.gg/cloudflaredev)
- [Community Forums](https://community.cloudflare.com)
- [Support Portal](https://dash.cloudflare.com/support)

## Best Practices

1. **Always test in staging first**
2. **Run migrations during low-traffic periods**
3. **Keep secrets updated and rotated**
4. **Monitor logs after deployment**
5. **Have a rollback plan ready**
6. **Use feature flags for risky changes**
7. **Document all deployment changes**
8. **Maintain separate environments**
9. **Back up critical data before major changes**
10. **Test rollback procedures regularly**

## Maintenance

### Regular Tasks

**Weekly:**
- Review error logs
- Check resource usage
- Update dependencies

**Monthly:**
- Rotate secrets
- Review and clean up KV storage
- Analyze AI usage and costs
- Check database performance

**Quarterly:**
- Security audit
- Performance optimization
- Cost analysis
- Update documentation

---

**Questions?** Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/) or open an issue on GitHub.
