# Setup Guide

This guide will walk you through setting up the Cloudflare Workers MVP Template from scratch.

## Prerequisites

- Node.js 18+ and npm installed
- Cloudflare account (free tier works)
- OpenAI API key (for AI Gateway features)
- Git installed

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/ckorhonen/mvp-template.git
cd mvp-template

# Install dependencies
npm install
```

## Step 2: Cloudflare Setup

### 2.1 Install Wrangler CLI

```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 2.2 Get Your Account ID

1. Go to https://dash.cloudflare.com
2. Copy your Account ID from the right sidebar
3. Update `wrangler.toml` with your account ID

### 2.3 Create D1 Database

```bash
# Create the database
wrangler d1 create mvp-database

# Copy the database ID from output
# Update wrangler.toml with the database ID

# Run initial schema
wrangler d1 execute mvp-database --file=database/schema.sql

# Optionally seed with sample data
wrangler d1 execute mvp-database --file=database/seeds/sample_data.sql
```

### 2.4 Create KV Namespaces

```bash
# Create KV namespaces
wrangler kv:namespace create CACHE
wrangler kv:namespace create CACHE --preview
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create SESSIONS --preview
wrangler kv:namespace create CONFIG
wrangler kv:namespace create CONFIG --preview

# Update wrangler.toml with the namespace IDs from output
```

### 2.5 Create R2 Buckets

```bash
# Create R2 buckets
wrangler r2 bucket create mvp-assets
wrangler r2 bucket create mvp-assets-preview
wrangler r2 bucket create mvp-uploads
wrangler r2 bucket create mvp-uploads-preview
wrangler r2 bucket create mvp-backups
wrangler r2 bucket create mvp-backups-preview

# Bucket names are already configured in wrangler.toml
```

### 2.6 Create AI Gateway

1. Go to https://dash.cloudflare.com/ai/ai-gateway
2. Click "Create Gateway"
3. Name it (e.g., "mvp-ai-gateway")
4. Copy the Gateway ID
5. Update `wrangler.toml` and `.env` with the Gateway ID

## Step 3: Environment Configuration

### 3.1 Local Development

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and fill in your values:
# - CLOUDFLARE_ACCOUNT_ID
# - AI_GATEWAY_ID
# - OPENAI_API_KEY
# - Database IDs
# - KV Namespace IDs
# - etc.
```

### 3.2 Wrangler Secrets

Store sensitive keys as Wrangler secrets:

```bash
# Set secrets for development
wrangler secret put OPENAI_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put SESSION_SECRET

# Set secrets for staging
wrangler secret put OPENAI_API_KEY --env staging
wrangler secret put JWT_SECRET --env staging
wrangler secret put SESSION_SECRET --env staging

# Set secrets for production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put SESSION_SECRET --env production
```

## Step 4: Build and Test Locally

```bash
# Build the worker
npm run build:worker

# Start local development server
npm run dev

# In another terminal, test the endpoints
curl http://localhost:8787/health
```

## Step 5: Deploy

### Development Deploy

```bash
# Deploy to development
npm run deploy

# Or directly with wrangler
wrangler deploy
```

### Staging Deploy

```bash
# Deploy to staging
wrangler deploy --env staging
```

### Production Deploy

```bash
# Deploy to production
wrangler deploy --env production
```

## Step 6: Verify Deployment

```bash
# Test health endpoint
curl https://your-worker.workers.dev/health

# Test AI endpoint
curl -X POST https://your-worker.workers.dev/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

## Troubleshooting

### Database Connection Issues

```bash
# Verify database exists
wrangler d1 list

# Test database connection
wrangler d1 execute mvp-database --command="SELECT 1"
```

### KV Access Issues

```bash
# List KV namespaces
wrangler kv:namespace list

# Test KV write/read
wrangler kv:key put --binding=CACHE "test" "value"
wrangler kv:key get --binding=CACHE "test"
```

### R2 Access Issues

```bash
# List R2 buckets
wrangler r2 bucket list

# Test R2 upload
echo "test" > test.txt
wrangler r2 object put mvp-uploads/test.txt --file=test.txt
```

## Next Steps

- Read the [API Documentation](./API.md)
- Review [Best Practices](./BEST_PRACTICES.md)
- Check out [Examples](./EXAMPLES.md)
- Set up [Monitoring](./MONITORING.md)
