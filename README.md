# 🚀 Cloudflare Workers MVP Template

A comprehensive, production-ready template for building MVPs with Cloudflare Workers, featuring AI Gateway, D1 Database, KV, R2, and more.

## ✨ Features

### Cloudflare Services Integration
- 🤖 **AI Gateway** - OpenAI integration with caching and rate limiting
- 🗄️ **D1 Database** - SQLite database with migrations and type-safe queries
- 📦 **KV Storage** - Key-value storage for caching and sessions
- 🪣 **R2 Storage** - Object storage for files and assets
- 📊 **Analytics Engine** - Real-time analytics and metrics
- 🔄 **Queues** - Background job processing
- 🎯 **Durable Objects** - Stateful coordination (rate limiting, sessions)

### Developer Experience
- ⚡ **TypeScript** - Full type safety throughout
- 🧪 **Jest** - Comprehensive test suite
- 🔍 **ESLint & Prettier** - Code quality and formatting
- 🚦 **GitHub Actions** - CI/CD pipelines
- 📝 **Comprehensive Documentation** - Get started quickly

### Production Ready
- 🔒 **Rate Limiting** - Protect your APIs
- 🌐 **CORS Support** - Cross-origin requests
- ✅ **Input Validation** - Sanitize and validate inputs
- 📈 **Error Handling** - Robust error management
- 🎨 **Standardized Responses** - Consistent API responses

## 🏗️ Architecture

```
├── src/
│   ├── worker/
│   │   ├── index.ts           # Main worker entry point
│   │   ├── types.ts           # TypeScript type definitions
│   │   ├── routes/            # API route handlers
│   │   │   ├── ai.ts          # AI Gateway routes
│   │   │   ├── database.ts    # D1 database routes
│   │   │   └── storage.ts     # KV/R2 storage routes
│   │   ├── services/          # Business logic services
│   │   │   ├── ai-gateway.ts  # AI Gateway service
│   │   │   └── d1-database.ts # D1 database service
│   │   └── utils/             # Utility functions
│   │       ├── cache.ts       # Cache management
│   │       ├── rate-limit.ts  # Rate limiting
│   │       ├── response.ts    # Response helpers
│   │       └── validation.ts  # Input validation
│   └── (React app files)       # Frontend application
├── migrations/                 # D1 database migrations
├── .github/workflows/          # CI/CD workflows
└── wrangler.toml              # Cloudflare Workers config
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Cloudflare account ([sign up](https://dash.cloudflare.com/sign-up))
- Wrangler CLI (`npm install -g wrangler`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ckorhonen/mvp-template.git
   cd mvp-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

4. **Create required resources**
   ```bash
   # Create D1 database
   wrangler d1 create mvp-database

   # Create KV namespaces
   wrangler kv:namespace create CACHE
   wrangler kv:namespace create SESSIONS
   wrangler kv:namespace create CONFIG

   # Create R2 buckets
   wrangler r2 bucket create mvp-assets
   wrangler r2 bucket create mvp-uploads
   wrangler r2 bucket create mvp-backups
   ```

5. **Update configuration**
   
   Copy `.env.example` to `.env` and update with your values:
   ```bash
   cp .env.example .env
   ```

   Update `wrangler.toml` with the IDs from step 4.

6. **Run database migrations**
   ```bash
   wrangler d1 execute DB --file=migrations/0001_initial_schema.sql
   wrangler d1 execute DB --file=migrations/0002_sample_data.sql
   ```

7. **Start development server**
   ```bash
   # Start the worker
   npm run worker:dev

   # In another terminal, start the frontend
   npm run dev
   ```

## 📚 Documentation

### Configuration

#### Environment Variables

See [`.env.example`](.env.example) for all available environment variables.

Key variables:
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `OPENAI_API_KEY` - OpenAI API key for AI Gateway
- `AI_GATEWAY_ID` - Your Cloudflare AI Gateway ID

#### Wrangler Configuration

See [`wrangler.toml`](wrangler.toml) for Cloudflare Workers configuration.

Key sections:
- `[vars]` - Environment-specific variables
- `[[kv_namespaces]]` - KV namespace bindings
- `[[r2_buckets]]` - R2 bucket bindings
- `[[d1_databases]]` - D1 database bindings

### API Routes

#### AI Gateway Routes

**POST /api/ai/chat**
```json
{
  "message": "What is Cloudflare?",
  "systemPrompt": "You are a helpful assistant.",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**POST /api/ai/stream**
```json
{
  "messages": [
    { "role": "user", "content": "Tell me a story" }
  ],
  "model": "gpt-4o-mini"
}
```

**GET /api/ai/models**

Returns available AI models.

#### Database Routes

**POST /api/users**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**GET /api/users/:id**

Get a user by ID.

**GET /api/users?page=1&per_page=10**

List users with pagination.

**PUT /api/users/:id**
```json
{
  "name": "Jane Doe"
}
```

**DELETE /api/users/:id**

Delete a user.

#### Storage Routes

**GET /api/cache/:key**

Get a cached value.

**PUT /api/cache/:key**
```json
{
  "value": "any json value",
  "ttl": 3600
}
```

**DELETE /api/cache/:key**

Delete a cached value.

**POST /api/uploads**

Upload a file (multipart/form-data).

**GET /api/uploads/:key**

Download a file.

**DELETE /api/uploads/:key**

Delete a file.

**GET /api/uploads?prefix=uploads/&limit=100**

List uploaded files.

### Services

#### AI Gateway Service

```typescript
import { createAIGateway } from './services/ai-gateway';

const ai = createAIGateway(env);

// Simple completion
const response = await ai.complete('What is Cloudflare?');

// Chat with system prompt
const chat = await ai.complete('Explain Cloudflare Workers', {
  systemPrompt: 'You are a technical expert.',
  temperature: 0.8,
  maxTokens: 500,
});

// Full chat completion
const completion = await ai.createChatCompletion({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Hello!' },
  ],
});
```

#### D1 Database Service

```typescript
import { createD1Service } from './services/d1-database';

const db = createD1Service(env);

// Query
const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);

// Insert
const userId = await db.insert('users', {
  email: 'user@example.com',
  name: 'John Doe',
});

// Update
const updated = await db.update('users', { name: 'Jane Doe' }, {
  column: 'id',
  value: userId,
});

// Delete
const deleted = await db.delete('users', { column: 'id', value: userId });
```

#### Cache Manager

```typescript
import { createCacheManager } from './utils/cache';

const cache = createCacheManager(env);

// Get or set pattern
const data = await cache.getOrSet('expensive-data', async () => {
  // Compute expensive data
  return await fetchExpensiveData();
}, { ttl: 3600 });
```

#### Rate Limiter

```typescript
import { createRateLimiter, getClientIdentifier } from './utils/rate-limit';

const rateLimiter = createRateLimiter(env, {
  limit: 100,
  window: 60, // 1 minute
});

const identifier = getClientIdentifier(request);
const result = await rateLimiter.check(identifier);

if (!result.allowed) {
  return rateLimitResponse(result.reset - Math.floor(Date.now() / 1000));
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚢 Deployment

### Development
```bash
npm run worker:deploy
```

### Staging
```bash
wrangler deploy --env staging
```

### Production
```bash
wrangler deploy --env production
```

### GitHub Actions

The repository includes comprehensive CI/CD workflows:

- **CI/CD Pipeline** - Runs on every push and PR
  - Linting and formatting checks
  - Unit tests with coverage
  - Security audits
  - Automated deployments to dev/staging/production

- **Database Migrations** - Manual workflow for running migrations

See [`.github/workflows/`](.github/workflows/) for details.

## 📖 Additional Documentation

- [Database Migrations](migrations/README.md)
- [Environment Configuration](.env.example)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## 🔧 Development

### Project Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run worker:dev       # Start worker dev server

# Build
npm run build            # Build frontend
npm run build:worker     # Build worker

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # TypeScript type checking

# Deployment
npm run worker:deploy    # Deploy worker
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Update with your Cloudflare credentials
3. Create required resources (see Quick Start)
4. Run migrations

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Powered by [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- Styled with best practices from the Cloudflare community

## 📞 Support

For issues and questions:
- [GitHub Issues](https://github.com/ckorhonen/mvp-template/issues)
- [Cloudflare Workers Discord](https://discord.gg/cloudflaredev)
- [Cloudflare Community](https://community.cloudflare.com/)

---

Built with ❤️ by [Chris Korhonen](https://github.com/ckorhonen)
