# 🚀 Cloudflare Workers MVP Template

> **The definitive Cloudflare Workers template for rapid MVP development**

A production-ready, feature-complete template for building modern web applications with Cloudflare Workers, React, TypeScript, and comprehensive integrations with all major Cloudflare services.

[![CI/CD](https://github.com/ckorhonen/mvp-template/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/ckorhonen/mvp-template/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

### 🎯 Core Features
- **TypeScript** - Full type safety across frontend and backend
- **React 18** - Modern React with hooks and concurrent features
- **Vite** - Lightning-fast development and optimized production builds
- **Cloudflare Workers** - Edge computing with global deployment

### ☁️ Cloudflare Integrations
- **✅ AI Gateway** - OpenAI integration with built-in caching and rate limiting
- **✅ D1 Database** - Serverless SQL database with migrations
- **✅ KV Storage** - High-performance key-value store
- **✅ R2 Storage** - Object storage for files and assets
- **✅ Analytics Engine** - Real-time analytics and monitoring

### 🛠️ Developer Experience
- **Router** - Elegant URL pattern matching and routing
- **Middleware** - Composable request/response pipeline
- **Error Handling** - Comprehensive error handling with proper status codes
- **Validation** - Request validation utilities
- **Logging** - Structured logging with request tracking
- **Rate Limiting** - Built-in rate limiting middleware
- **CORS** - Automatic CORS handling

### 🔒 Security & Quality
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Consistent code formatting
- **Husky** - Pre-commit hooks for quality gates
- **Jest** - Unit and integration testing
- **GitHub Actions** - Automated CI/CD pipeline
- **Security Scanning** - Automated vulnerability scanning

## 📦 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Cloudflare account ([sign up free](https://dash.cloudflare.com/sign-up))
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
# Clone the repository
git clone https://github.com/ckorhonen/mvp-template.git
cd mvp-template

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Authenticate with Cloudflare
wrangler login
```

### Configuration

1. **Update `.env.local`** with your credentials:
   ```env
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   OPENAI_API_KEY=your-openai-key
   AI_GATEWAY_ID=your-ai-gateway-id
   ```

2. **Update `wrangler.toml`** with your account ID and bindings

3. **Create Cloudflare resources** (see [Setup Guide](#-setup-guide))

### Development

```bash
# Start development server (React frontend)
npm run dev

# Start Cloudflare Workers development server
npm run worker:dev

# Run tests
npm test

# Run linter
npm run lint
```

### Deployment

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

## 📚 Documentation

### Table of Contents

- [Setup Guide](#-setup-guide)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Database Migrations](#-database-migrations)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Best Practices](#-best-practices)

## 🔧 Setup Guide

### 1. Cloudflare Account Setup

```bash
# Login to Cloudflare
wrangler login

# Get your account ID
wrangler whoami
```

### 2. Create D1 Database

```bash
# Create database
wrangler d1 create mvp-template-db

# Run initial migration
wrangler d1 execute mvp-template-db --file=./src/worker/migrations/001_initial_schema.sql

# Update wrangler.toml with database_id
```

### 3. Create KV Namespace

```bash
# Create KV namespace
wrangler kv:namespace create "MY_KV"

# Create preview namespace for development
wrangler kv:namespace create "MY_KV" --preview

# Update wrangler.toml with namespace IDs
```

### 4. Create R2 Bucket

```bash
# Create R2 bucket
wrangler r2 bucket create my-bucket

# Update wrangler.toml with bucket name
```

### 5. Setup AI Gateway

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **AI** → **AI Gateway**
3. Create a new gateway
4. Copy the **Gateway ID**
5. Add to secrets:

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put AI_GATEWAY_ID
wrangler secret put CLOUDFLARE_ACCOUNT_ID
```

### 6. Configure GitHub Actions

Add these secrets to your GitHub repository:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `OPENAI_API_KEY`
- `AI_GATEWAY_ID`

## 🏗️ Architecture

### Project Structure

```
mvp-template/
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # CI/CD pipeline
├── src/
│   ├── worker/                 # Cloudflare Worker code
│   │   ├── index.ts           # Main worker entry point
│   │   ├── types.ts           # TypeScript types
│   │   ├── middleware/        # Request middleware
│   │   │   ├── auth.ts
│   │   │   ├── logging.ts
│   │   │   └── ratelimit.ts
│   │   ├── routes/            # API route handlers
│   │   │   ├── ai.ts          # AI Gateway routes
│   │   │   ├── database.ts    # D1 routes
│   │   │   ├── storage.ts     # R2 routes
│   │   │   └── cache.ts       # KV routes
│   │   ├── utils/             # Utility functions
│   │   │   ├── router.ts      # Request router
│   │   │   ├── response.ts    # Response builder
│   │   │   ├── validation.ts  # Request validation
│   │   │   ├── cache.ts       # Cache utilities
│   │   │   ├── database.ts    # D1 utilities
│   │   │   ├── storage.ts     # R2 utilities
│   │   │   └── ai-gateway.ts  # AI Gateway client
│   │   └── migrations/        # Database migrations
│   └── [React frontend code]   # React application
├── wrangler.toml              # Cloudflare Workers config
├── package.json
└── tsconfig.json
```

### Request Flow

```
Request → Logging Middleware → Rate Limit → Auth → Router → Handler → Response
```

## 🌐 API Reference

### Base URL

- **Development**: `http://localhost:8787`
- **Staging**: `https://staging.example.com`
- **Production**: `https://api.example.com`

### Endpoints

#### Health Check
```http
GET /health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

#### AI Gateway

**Chat Completion**
```http
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "systemPrompt": "You are a helpful assistant.",
  "temperature": 0.7
}
```

**Generate Embeddings**
```http
POST /api/ai/embeddings
Content-Type: application/json

{
  "text": "Text to generate embeddings for"
}
```

#### Database (D1)

**List Users**
```http
GET /api/users
```

**Get User**
```http
GET /api/users/:id
```

**Create User**
```http
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Update User**
```http
PUT /api/users/:id
Content-Type: application/json

{
  "name": "Jane Doe"
}
```

**Delete User**
```http
DELETE /api/users/:id
```

#### Storage (R2)

**Upload File**
```http
POST /api/storage/upload
Content-Type: multipart/form-data

[file data]
```

**Download File**
```http
GET /api/storage/:key
```

**List Files**
```http
GET /api/storage?prefix=uploads/&limit=100
```

**Delete File**
```http
DELETE /api/storage/:key
```

#### Cache (KV)

**Get Cached Value**
```http
GET /api/cache/:key
```

**Set Cached Value**
```http
POST /api/cache
Content-Type: application/json

{
  "key": "my-key",
  "value": { "data": "value" },
  "ttl": 3600
}
```

**Delete Cached Value**
```http
DELETE /api/cache/:key
```

## ⚙️ Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Wrangler Configuration

The `wrangler.toml` file contains all Cloudflare Workers configuration. Key sections:

- **Bindings**: KV, D1, R2, Analytics
- **Variables**: Environment-specific settings
- **Environments**: Development, staging, production
- **Routes**: Custom routing rules

## 🗄️ Database Migrations

### Creating Migrations

Create a new migration file in `src/worker/migrations/`:

```sql
-- 002_add_posts_table.sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Running Migrations

```bash
# Run migration
wrangler d1 execute DB --file=./src/worker/migrations/002_add_posts_table.sql

# Run on specific environment
wrangler d1 execute DB --env production --file=./path/to/migration.sql
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

Example test for a route handler:

```typescript
import { chatHandler } from './routes/ai';

describe('AI Chat Handler', () => {
  it('should return chat completion', async () => {
    const request = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });

    const response = await chatHandler(request, env, ctx);
    expect(response.status).toBe(200);
  });
});
```

## 🚀 Deployment

### Automated Deployment (Recommended)

Push to branches to trigger automatic deployments:

- `develop` or `staging` → Staging environment
- `main` → Production environment

### Manual Deployment

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production

# Dry run
wrangler deploy --dry-run
```

### Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [deployment-id]
```

## 📖 Best Practices

### Error Handling

Always use `WorkerError` for consistent error responses:

```typescript
import { WorkerError } from './types';

throw new WorkerError(
  'Resource not found',
  404,
  'RESOURCE_NOT_FOUND',
  { resourceId: id }
);
```

### Request Validation

Validate all inputs:

```typescript
import { RequestValidator } from './utils/validation';

const body = await RequestValidator.parseJSON(request);
RequestValidator.validateRequired(body, ['email', 'name']);
```

### Caching Strategy

Use appropriate TTLs for different data types:

```typescript
// Static data: 1 day
await CacheManager.setInKV(kv, key, data, { ttl: 86400 });

// User session: 1 hour
await CacheManager.setInKV(kv, sessionKey, session, { ttl: 3600 });

// Rate limit: 1 minute
await CacheManager.setInKV(kv, rateLimitKey, count, { ttl: 60 });
```

### Security

1. **Always use secrets for sensitive data**
2. **Implement rate limiting on public endpoints**
3. **Validate and sanitize all user inputs**
4. **Use HTTPS in production**
5. **Rotate API keys regularly**

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- Cloudflare Workers team for the amazing platform
- React and Vite teams for excellent developer tools
- The open source community

## 📞 Support

- **Documentation**: [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- **Issues**: [GitHub Issues](https://github.com/ckorhonen/mvp-template/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ckorhonen/mvp-template/discussions)

---

**Built with ❤️ by [Chris Korhonen](https://github.com/ckorhonen)**
