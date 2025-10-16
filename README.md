# 🚀 Cloudflare Workers MVP Template

> The definitive, production-ready template for building MVPs with Cloudflare Workers, featuring comprehensive AI Gateway integration, D1 database, R2 storage, KV cache, and more.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

### 🤖 AI Gateway Integration
- **OpenAI Integration** - Full ChatGPT and GPT-4 support with streaming
- **Multi-Provider Support** - Anthropic, HuggingFace, Replicate
- **Embeddings** - Text-to-vector conversion for semantic search
- **Caching & Analytics** - Built-in request caching and usage analytics
- **Cost Optimization** - Automatic retry logic and rate limiting

### 🗄️ Database & Storage
- **D1 SQLite** - Serverless SQL database at the edge
- **R2 Storage** - S3-compatible object storage with zero egress fees
- **KV Cache** - Low-latency key-value storage for caching and sessions
- **Type-Safe ORM** - Fully typed database operations

### 🔐 Authentication & Security
- **JWT Authentication** - Secure token-based auth
- **API Key Support** - Service-to-service authentication
- **Password Hashing** - Secure bcrypt-style password storage
- **CORS Middleware** - Configurable cross-origin resource sharing

### 🛠️ Developer Experience
- **TypeScript First** - Full type safety across the stack
- **Hot Reload** - Instant feedback during development
- **Comprehensive Tests** - Jest test suite with high coverage
- **ESLint & Prettier** - Consistent code formatting
- **Git Hooks** - Pre-commit linting and formatting

### 📊 Observability
- **Request Logging** - Structured logging with request IDs
- **Analytics Engine** - Track custom metrics and events
- **Error Tracking** - Comprehensive error handling
- **Performance Monitoring** - Request duration tracking

### 🚦 Production-Ready
- **Environment Management** - Dev, staging, and production configs
- **CI/CD Pipeline** - GitHub Actions deployment workflow
- **Database Migrations** - Version-controlled schema changes
- **Rate Limiting** - Durable Objects-based rate limiter
- **Queue Processing** - Background job processing

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Cloudflare Account** with Workers paid plan (for D1, R2, AI Gateway)
- **Wrangler CLI** - Install with `npm install -g wrangler`

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/ckorhonen/mvp-template.git
cd mvp-template
npm install
```

### 2. Configure Cloudflare Services

#### Create D1 Database
```bash
wrangler d1 create mvp-database
wrangler d1 create mvp-database-preview
```

#### Create KV Namespaces
```bash
wrangler kv:namespace create CACHE
wrangler kv:namespace create CACHE --preview
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create SESSIONS --preview
```

#### Create R2 Buckets
```bash
wrangler r2 bucket create mvp-assets
wrangler r2 bucket create mvp-assets-preview
wrangler r2 bucket create mvp-uploads
wrangler r2 bucket create mvp-uploads-preview
```

#### Create Queue
```bash
wrangler queues create mvp-tasks
wrangler queues create mvp-tasks-dlq
```

#### Create AI Gateway
1. Go to https://dash.cloudflare.com/
2. Navigate to AI → AI Gateway
3. Create a new gateway named "mvp-gateway"
4. Note your gateway ID

### 3. Update Configuration

Update `wrangler.toml` with your resource IDs:

```toml
account_id = "your-account-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-cache-id"
preview_id = "your-preview-cache-id"

# ... update other IDs
```

### 4. Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your values
# Get OpenAI API key from: https://platform.openai.com/api-keys
```

### 5. Set Production Secrets

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put ANTHROPIC_API_KEY  # optional
```

### 6. Run Database Migrations

```bash
wrangler d1 migrations apply mvp-database --local
wrangler d1 migrations apply mvp-database
```

### 7. Start Development Server

```bash
npm run worker:dev
```

Your worker will be available at `http://localhost:8787`

## 📚 API Reference

### Health Check
```bash
GET /health
```

### AI Gateway

#### Chat Completion
```bash
POST /api/ai/chat
Authorization: Bearer <jwt-token>

{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

#### Generate Embeddings
```bash
POST /api/ai/embeddings
Authorization: Bearer <jwt-token>

{
  "input": "Text to embed",
  "model": "text-embedding-ada-002"
}
```

#### Stream Chat Completion
```bash
POST /api/ai/stream
Authorization: Bearer <jwt-token>

{
  "messages": [
    { "role": "user", "content": "Tell me a story" }
  ]
}
```

### User Management

#### Create User
```bash
POST /api/users

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePassword123!"
}
```

#### Get User
```bash
GET /api/users/:id
Authorization: Bearer <jwt-token>
```

#### Update User
```bash
PATCH /api/users/:id
Authorization: Bearer <jwt-token>

{
  "name": "Jane Doe"
}
```

#### Delete User
```bash
DELETE /api/users/:id
Authorization: Bearer <jwt-token>
```

### File Storage

#### Upload File
```bash
POST /api/storage/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

file: <binary-data>
```

#### Download File
```bash
GET /api/storage/:key
```

#### Delete File
```bash
DELETE /api/storage/:key
Authorization: Bearer <jwt-token>
```

#### List Files
```bash
GET /api/storage?prefix=folder/&limit=100
Authorization: Bearer <jwt-token>
```

### Cache Operations

#### Get Cache Value
```bash
GET /api/cache/:key
X-API-Key: <api-key>
```

#### Set Cache Value
```bash
POST /api/cache
X-API-Key: <api-key>

{
  "key": "my-key",
  "value": { "data": "anything" },
  "ttl": 3600
}
```

#### Delete Cache Value
```bash
DELETE /api/cache/:key
X-API-Key: <api-key>
```

## 🏗️ Architecture

```
src/worker/
├── index.ts              # Main entry point
├── router.ts             # Request router
├── types.ts              # TypeScript definitions
├── middleware/           # Request middleware
│   ├── auth.ts          # Authentication
│   ├── cors.ts          # CORS handling
│   └── logger.ts        # Request logging
├── routes/              # API route handlers
│   ├── ai.ts           # AI Gateway routes
│   ├── database.ts     # D1 database routes
│   ├── storage.ts      # R2 storage routes
│   └── cache.ts        # KV cache routes
├── services/           # Business logic
│   ├── ai-gateway.ts  # AI Gateway service
│   ├── database.ts    # D1 database service
│   └── storage.ts     # R2 storage service
└── utils/             # Utility functions
    ├── response.ts    # Response helpers
    ├── crypto.ts      # Cryptography utils
    ├── cache.ts       # Cache helpers
    └── validation.ts  # Input validation
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run worker:dev          # Start local dev server
npm run dev                 # Start Vite frontend dev server

# Building
npm run build              # Build frontend
npm run build:worker       # Build worker (if needed)

# Testing
npm test                   # Run tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report

# Linting & Formatting
npm run lint               # Lint code
npm run lint:fix           # Fix linting issues
npm run format             # Format code
npm run format:check       # Check formatting

# Type Checking
npm run type-check         # Check TypeScript types

# Deployment
npm run worker:deploy      # Deploy to production
```

### Adding a New Route

1. **Create route handler** in `src/worker/routes/`:

```typescript
import type { Context } from '../types';
import { successResponse } from '../utils/response';

export async function myNewRoute(ctx: Context): Promise<Response> {
  return successResponse({ message: 'Hello World' });
}
```

2. **Register route** in `src/worker/index.ts`:

```typescript
import { myNewRoute } from './routes/my-route';

router.get('/api/my-route', myNewRoute, [requireAuth()]);
```

### Adding Middleware

Create middleware in `src/worker/middleware/`:

```typescript
import type { Middleware } from '../types';

export function myMiddleware(): Middleware {
  return async (ctx, next) => {
    // Before request
    console.log('Before:', ctx.request.url);
    
    const response = await next();
    
    // After request
    console.log('After:', response.status);
    
    return response;
  };
}
```

## 🌍 Environment Management

### Local Development
Uses `.env.local` and preview bindings

### Staging
```bash
wrangler deploy --env staging
```

### Production
```bash
wrangler deploy --env production
```

## 📊 Monitoring & Debugging

### View Logs
```bash
wrangler tail
wrangler tail --env production
```

### View D1 Database
```bash
wrangler d1 execute mvp-database --command "SELECT * FROM users"
```

### View KV Data
```bash
wrangler kv:key get --binding CACHE "my-key"
```

### View R2 Objects
```bash
wrangler r2 object get mvp-uploads/file.txt
```

## 🚢 Deployment

### GitHub Actions

The template includes a comprehensive CI/CD pipeline:

1. Push to `main` triggers deployment to production
2. Push to `staging` triggers deployment to staging
3. Pull requests run tests and linting

Configure secrets in GitHub:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Manual Deployment

```bash
# Deploy to production
npm run worker:deploy

# Deploy to specific environment
wrangler deploy --env staging
wrangler deploy --env production
```

## 🔒 Security Best Practices

1. **Never commit secrets** - Use `wrangler secret put`
2. **Rotate JWT secrets** regularly
3. **Use HTTPS** for all API calls
4. **Implement rate limiting** for public endpoints
5. **Validate all inputs** before processing
6. **Use prepared statements** for database queries
7. **Set appropriate CORS** headers
8. **Enable Cloudflare security** features (WAF, DDoS protection)

## 📖 Additional Documentation

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [KV Storage Docs](https://developers.cloudflare.com/kv/)
- [AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Chris Korhonen**

## 🙏 Acknowledgments

- Cloudflare Workers team for the amazing platform
- OpenAI for AI capabilities
- The open source community

---

**Built with ❤️ using Cloudflare Workers**
