# Cloudflare Workers MVP Template

A comprehensive, production-ready template for building MVPs with Cloudflare Workers, featuring AI integration, database support, and modern development practices.

## 🚀 Features

- **⚡ Cloudflare Workers** - Edge-first architecture for global performance
- **🤖 AI Integration** - OpenAI integration through Cloudflare AI Gateway
- **🗄️ D1 Database** - SQLite at the edge with automatic replication
- **💾 KV Storage** - Ultra-fast key-value storage for caching and sessions
- **📦 R2 Storage** - Object storage for files and assets
- **🔒 Built-in Security** - Rate limiting, CORS, error handling
- **📊 Structured Logging** - JSON-based logging with multiple levels
- **🧪 Testing Ready** - Jest configuration with TypeScript support
- **🔄 CI/CD Pipeline** - GitHub Actions for automated deployments
- **📝 TypeScript** - Full type safety across the stack

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- [Cloudflare Account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [OpenAI API Key](https://platform.openai.com/api-keys) (for AI features)

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/ckorhonen/mvp-template.git
cd mvp-template
npm install
```

### 2. Configure Cloudflare Services

#### Create D1 Database

```bash
# Create production database
wrangler d1 create mvp-database

# Create preview database for development
wrangler d1 create mvp-database-preview
```

#### Create KV Namespaces

```bash
# Cache namespace
wrangler kv:namespace create CACHE
wrangler kv:namespace create CACHE --preview

# Sessions namespace
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create SESSIONS --preview
```

#### Create R2 Buckets

```bash
# Assets bucket
wrangler r2 bucket create mvp-assets
wrangler r2 bucket create mvp-assets-preview

# Uploads bucket
wrangler r2 bucket create mvp-uploads
wrangler r2 bucket create mvp-uploads-preview
```

#### Setup AI Gateway

1. Go to [Cloudflare Dashboard > AI > AI Gateway](https://dash.cloudflare.com/ai/ai-gateway)
2. Create a new AI Gateway
3. Note your Account ID and Gateway ID

### 3. Configure Environment

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

Update the following in `.env`:

```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
OPENAI_API_KEY=sk-your-openai-api-key
AI_GATEWAY_ID=your-ai-gateway-id
```

### 4. Update wrangler.toml

Update `wrangler.toml` with the IDs from the services you created:

```toml
# Update account_id
account_id = "your-account-id-here"

# Update KV namespace IDs
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-cache-id"
preview_id = "your-preview-kv-cache-id"

# Update D1 database IDs
[[d1_databases]]
binding = "DB"
database_id = "your-d1-database-id"
preview_database_id = "your-preview-d1-database-id"
```

### 5. Run Database Migrations

```bash
# For local development
./scripts/migrate.sh development

# For production
./scripts/migrate.sh production
```

### 6. Start Development

```bash
# Start local development server
npm run dev

# In another terminal, start the frontend (if applicable)
npm run dev:frontend
```

## 🏗️ Project Structure

```
mvp-template/
├── src/
│   ├── worker/
│   │   ├── db/
│   │   │   ├── migrations/       # Database migrations
│   │   │   └── schema.sql        # Complete database schema
│   │   ├── routes/
│   │   │   ├── ai.ts            # AI endpoint handlers
│   │   │   └── health.ts        # Health check endpoints
│   │   ├── services/
│   │   │   ├── ai.ts            # AI Gateway service
│   │   │   └── database.ts      # D1 database utilities
│   │   ├── utils/
│   │   │   ├── cors.ts          # CORS helpers
│   │   │   ├── errors.ts        # Error handling
│   │   │   ├── logger.ts        # Structured logging
│   │   │   ├── rate-limiter.ts  # Rate limiting
│   │   │   └── response.ts      # Response utilities
│   │   ├── index.ts             # Worker entry point
│   │   └── types.ts             # TypeScript types
│   └── frontend/                # Frontend code (Vite + React/Vue/etc)
├── scripts/
│   └── migrate.sh               # Database migration script
├── .github/
│   └── workflows/
│       └── ci-cd.yml            # CI/CD pipeline
├── wrangler.toml                # Cloudflare Workers config
├── package.json
└── README.md
```

## 🤖 AI Integration

This template includes comprehensive AI integration through Cloudflare AI Gateway:

### Chat Completions

```typescript
// POST /api/ai/chat
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ]
  })
});
```

### Streaming Responses

```typescript
// POST /api/ai/chat/stream
const response = await fetch('/api/ai/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Tell me a story' }]
  })
});
```

### Embeddings

```typescript
// POST /api/ai/embeddings
const response = await fetch('/api/ai/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: 'Your text here',
    model: 'text-embedding-ada-002'
  })
});
```

### Image Generation

```typescript
// POST /api/ai/images/generate
const response = await fetch('/api/ai/images/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A beautiful sunset over mountains',
    size: '1024x1024',
    quality: 'hd'
  })
});
```

## 🗄️ Database Usage

The template includes a fully configured D1 database with migrations:

```typescript
import { DatabaseService } from './services/database';

// Initialize service
const db = new DatabaseService(env.DB);

// Query data
const users = await db.all('SELECT * FROM users WHERE email = ?', [email]);

// Single result
const user = await db.queryFirst('SELECT * FROM users WHERE id = ?', [userId]);

// Execute mutations
await db.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, email]);

// Batch operations
await db.batch([
  { sql: 'INSERT INTO users (id, email) VALUES (?, ?)', params: [id1, email1] },
  { sql: 'INSERT INTO users (id, email) VALUES (?, ?)', params: [id2, email2] }
]);
```

## 🔒 Security Features

### Rate Limiting

Built-in rate limiting using KV storage:

```typescript
import { KVRateLimiter } from './utils/rate-limiter';

const rateLimiter = new KVRateLimiter(env.CACHE, {
  requestsPerWindow: 100,
  windowMs: 60000, // 1 minute
});

const rateLimitInfo = await rateLimiter.checkLimit(clientId);
```

### CORS

Flexible CORS configuration:

```typescript
import { addCorsHeaders, isCorsPreflightRequest } from './utils/cors';

// Handle preflight
if (isCorsPreflightRequest(request)) {
  return createCorsPreflightResponse(request, {
    allowedOrigins: ['https://example.com'],
    allowedMethods: ['GET', 'POST'],
  });
}

// Add CORS headers to response
return addCorsHeaders(response, request);
```

### Error Handling

Standardized error handling:

```typescript
import { ValidationError, createErrorResponse } from './utils/errors';

// Throw typed errors
throw new ValidationError('Invalid input', { field: 'email' });

// Handle errors
try {
  // ... your code
} catch (error) {
  return createErrorResponse(error);
}
```

## 📊 Logging

Structured JSON logging:

```typescript
import { createLogger } from './utils/logger';

const logger = createLogger('info', { service: 'api' });

logger.info('Request received', { method: 'POST', path: '/api/users' });
logger.error('Request failed', error, { userId: '123' });
```

## 🚀 Deployment

### Deploy to Production

```bash
# Deploy to production environment
npm run deploy

# Or with wrangler directly
wrangler deploy --env production
```

### Deploy to Staging

```bash
wrangler deploy --env staging
```

### Environment Variables

Set secrets using Wrangler:

```bash
# Set OpenAI API key
wrangler secret put OPENAI_API_KEY --env production

# Set session secret
wrangler secret put SESSION_SECRET --env production
```

## 🔄 CI/CD

The template includes a comprehensive GitHub Actions workflow:

- **Continuous Integration**: Runs on every push and PR
  - Linting
  - Type checking
  - Unit tests
  - Build verification

- **Continuous Deployment**: Deploys on main branch
  - Staging deployment on push to `develop`
  - Production deployment on push to `main`
  - Database migrations
  - Environment-specific configurations

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Available Scripts

```bash
npm run dev              # Start local development
npm run build            # Build for production
npm run deploy           # Deploy to production
npm run test             # Run tests
npm run lint             # Lint code
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
```

## 🌍 Environment Configuration

The template supports multiple environments:

- **Development**: Local development with `wrangler dev`
- **Staging**: Pre-production testing environment
- **Production**: Production environment

Each environment can have separate:
- Database instances
- KV namespaces
- R2 buckets
- Environment variables
- Custom routes/domains

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [KV Storage Docs](https://developers.cloudflare.com/kv/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [OpenAI](https://openai.com/)

---

**Ready to build your MVP?** Star this repo and start shipping! ⭐
