# 🚀 MVP Template

> **Production-Ready Full-Stack Template with TypeScript, React, and Cloudflare Workers**

A comprehensive template for building Minimum Viable Products (MVPs) with modern web technologies, complete Cloudflare services integration, and enterprise-grade CI/CD pipelines.

[![CI/CD](https://github.com/ckorhonen/mvp-template/actions/workflows/comprehensive-cicd.yml/badge.svg)](https://github.com/ckorhonen/mvp-template/actions/workflows/comprehensive-cicd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [Cloudflare Services Setup](#️-cloudflare-services-setup)
- [Development](#-development)
- [Database Management](#-database-management)
- [Deployment](#-deployment)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Frontend
- ✅ **React 18** - Latest React with concurrent features
- ✅ **TypeScript 5** - Full type safety with strict mode
- ✅ **Vite 5** - Lightning-fast HMR and optimized builds
- ✅ **Path Aliases** - Clean imports with `@/` prefix

### Backend
- ✅ **Cloudflare Workers** - Edge computing on 300+ locations
- ✅ **AI Gateway Integration** - OpenAI/Anthropic with caching & rate limiting
- ✅ **D1 Database** - SQLite at the edge with migrations
- ✅ **KV Storage** - Key-value caching and sessions
- ✅ **R2 Storage** - S3-compatible object storage
- ✅ **Analytics Engine** - High-scale event logging
- ✅ **Queues** - Background task processing
- ✅ **Durable Objects** - Stateful rate limiting

### Developer Experience
- ✅ **Comprehensive Testing** - Jest with coverage reporting
- ✅ **ESLint + Prettier** - Consistent code quality
- ✅ **Husky Pre-commit Hooks** - Prevent bad commits
- ✅ **Multi-Environment CI/CD** - Automated deployments
- ✅ **Database Migrations** - Version-controlled schema changes
- ✅ **Security Scanning** - Automated vulnerability checks

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library with hooks and suspense
- **TypeScript 5** - Static type checking
- **Vite 5** - Build tool and dev server
- **CSS3** - Modern styling (easily swap with Tailwind)

### Backend
- **Cloudflare Workers** - Serverless edge runtime
- **Wrangler 3** - Cloudflare CLI tool
- **D1** - SQLite database at the edge
- **KV** - Distributed key-value storage
- **R2** - Object storage compatible with S3
- **AI Gateway** - AI provider abstraction with caching
- **Analytics Engine** - Time-series analytics
- **Queues** - Message queue system

### Testing & Quality
- **Jest** - Testing framework
- **React Testing Library** - Component testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

### CI/CD
- **GitHub Actions** - Automated workflows
- **Multi-Environment** - Dev, Staging, Production
- **Database Migrations** - Automated schema updates

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or 20.x
- **npm** 9.x or higher
- **Git** 2.x or higher
- **Cloudflare Account** (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ckorhonen/mvp-template.git my-mvp
   cd my-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize Git hooks**
   ```bash
   npm run prepare
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Frontend (http://localhost:3000)
   npm run dev
   
   # Terminal 2: Worker (http://localhost:8787)
   npm run worker:dev
   ```

## ☁️ Cloudflare Services Setup

### 1. Account Setup

1. Create a Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **Workers & Pages** to find your **Account ID**
3. Create an API Token:
   - Profile → API Tokens → Create Token
   - Use "Edit Cloudflare Workers" template
   - Copy and save the token

### 2. AI Gateway Setup

**Purpose:** Route AI requests through Cloudflare for caching, rate limiting, and cost optimization.

```bash
# 1. Go to AI > AI Gateway in Cloudflare Dashboard
# 2. Create a new gateway
# 3. Name it (e.g., "mvp-ai-gateway")
# 4. Copy the Gateway ID
# 5. Add to .env:
AI_GATEWAY_ID=your-gateway-id
OPENAI_API_KEY=sk-your-openai-key
```

**Usage Example:**
```typescript
import { createAIService } from './services/ai';

const ai = createAIService(
  env.CLOUDFLARE_ACCOUNT_ID,
  env.AI_GATEWAY_ID,
  env.OPENAI_API_KEY,
  env.CACHE
);

const response = await ai.chatCompletion({
  messages: [{ role: 'user', content: 'Hello!' }],
  model: 'gpt-3.5-turbo'
});
```

### 3. D1 Database Setup

**Purpose:** SQLite database running at the edge with global replication.

```bash
# Create database
wrangler d1 create mvp-database

# Copy the output IDs to wrangler.toml
# database_id = "..."

# Run initial migration
wrangler d1 migrations apply DB --local

# For production
wrangler d1 migrations apply DB --remote
```

**Create a new migration:**
```bash
wrangler d1 migrations create DB add_users_table
```

### 4. KV Namespace Setup

**Purpose:** Fast key-value storage for caching and session management.

```bash
# Create namespaces
wrangler kv:namespace create CACHE
wrangler kv:namespace create SESSIONS

# Preview namespaces for development
wrangler kv:namespace create CACHE --preview
wrangler kv:namespace create SESSIONS --preview

# Add IDs to wrangler.toml
```

**Usage Example:**
```typescript
// Cache data
await env.CACHE.put('key', 'value', { expirationTtl: 3600 });

// Get data
const value = await env.CACHE.get('key');

// Store session
await env.SESSIONS.put(
  `session:${userId}`,
  JSON.stringify(sessionData),
  { expirationTtl: 86400 }
);
```

### 5. R2 Bucket Setup

**Purpose:** Object storage for files, images, and large data.

```bash
# Create buckets
wrangler r2 bucket create mvp-assets
wrangler r2 bucket create mvp-uploads

# Preview buckets for development
wrangler r2 bucket create mvp-assets-preview
wrangler r2 bucket create mvp-uploads-preview

# Add to wrangler.toml
```

**Usage Example:**
```typescript
// Upload file
await env.UPLOADS.put('file.pdf', fileData, {
  httpMetadata: {
    contentType: 'application/pdf',
  },
  customMetadata: {
    uploadedBy: userId,
  },
});

// Get file
const file = await env.UPLOADS.get('file.pdf');
if (file) {
  const data = await file.arrayBuffer();
}
```

### 6. Analytics Engine Setup

**Purpose:** Track events and metrics with high-scale analytics.

```bash
# Analytics Engine is automatically available
# No setup required, just add to wrangler.toml
```

**Usage Example:**
```typescript
// Track event
env.ANALYTICS.writeDataPoint({
  blobs: [userId, 'page_view'],
  doubles: [Date.now()],
  indexes: ['analytics'],
});
```

### 7. Queues Setup

**Purpose:** Background task processing and async workflows.

```bash
# Create queue
wrangler queues create mvp-tasks

# Create dead letter queue
wrangler queues create mvp-tasks-dlq

# Add to wrangler.toml
```

**Usage Example:**
```typescript
// Send message to queue
await env.TASK_QUEUE.send({
  type: 'send_email',
  payload: { to: 'user@example.com', subject: 'Welcome!' },
});
```

## 💻 Development

### Available Scripts

```bash
# Frontend Development
npm run dev              # Start Vite dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Worker Development
npm run worker:dev      # Start local worker
npm run build:worker    # Build worker
npm run worker:deploy   # Deploy worker

# Testing
npm test                # Run tests once
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
npm run test:smoke      # Smoke tests

# Code Quality
npm run lint            # Check for issues
npm run lint:fix        # Fix issues
npm run format          # Format code
npm run format:check    # Check formatting
npm run type-check      # TypeScript check

# Database
npm run db:migrate      # Run migrations locally
npm run db:seed         # Seed database
```

### Project Structure

```
mvp-template/
├── .github/
│   └── workflows/              # GitHub Actions
│       ├── ci-cd.yml
│       └── comprehensive-cicd.yml
├── src/
│   ├── App.tsx                # React app
│   ├── main.tsx               # Entry point
│   └── worker/                # Cloudflare Worker
│       ├── index.ts           # Worker entry
│       ├── types.ts           # TypeScript types
│       ├── routes/            # API routes
│       │   └── ai.ts
│       ├── services/          # Business logic
│       │   └── ai.ts
│       ├── db/                # Database
│       │   ├── schema.sql
│       │   ├── utils.ts
│       │   └── migrations/
│       └── utils/             # Utilities
│           ├── responses.ts
│           ├── logger.ts
│           ├── validation.ts
│           └── crypto.ts
├── wrangler.toml              # Cloudflare config
├── .env.example               # Environment template
└── package.json
```

## 🗄️ Database Management

### Creating Migrations

```bash
# Create a new migration
wrangler d1 migrations create DB migration_name

# Edit the generated file in src/worker/db/migrations/
```

### Running Migrations

```bash
# Local development
wrangler d1 migrations apply DB --local

# Development environment
wrangler d1 migrations apply DB --env dev --remote

# Staging
wrangler d1 migrations apply DB --env staging --remote

# Production
wrangler d1 migrations apply DB --env production --remote
```

### Database Utilities

```typescript
import { Database, QueryBuilder } from './db/utils';

// Create database instance
const db = new Database(env.DB);

// Simple query
const users = await db.query('SELECT * FROM users WHERE active = ?', 1);

// Query builder
const qb = new QueryBuilder('users');
const { sql, params } = qb
  .where('active = ?', 1)
  .orderBy('created_at', 'DESC')
  .limit(10)
  .buildSelect();

const results = await db.query(sql, ...params);

// Batch operations
await db.batch([
  { sql: 'INSERT INTO users ...', params: [...] },
  { sql: 'UPDATE sessions ...', params: [...] },
]);
```

## 🚀 Deployment

### GitHub Actions Setup

1. **Add secrets to your repository:**
   - Go to Settings → Secrets and variables → Actions
   - Add:
     - `CLOUDFLARE_API_TOKEN`
     - `CLOUDFLARE_ACCOUNT_ID`
     - `OPENAI_API_KEY` (if using AI)
     - `SNYK_TOKEN` (optional, for security scanning)

2. **Configure environments:**
   - Settings → Environments → New environment
   - Create: `development`, `staging`, `production`
   - Add protection rules for production

### Manual Deployment

```bash
# Deploy to specific environment
wrangler deploy --env dev
wrangler deploy --env staging
wrangler deploy --env production

# With migrations
npm run db:migrate
wrangler deploy --env production
```

### Deployment Workflow

1. **Development:** Automatic deployment on push to `develop` branch
2. **Staging:** Automatic deployment on push to `staging` branch
3. **Production:** Automatic deployment on push to `main` branch

Each deployment includes:
- ✅ Linting and type checking
- ✅ Unit tests with coverage
- ✅ Security scanning
- ✅ Database migrations
- ✅ Worker deployment
- ✅ Smoke tests
- ✅ Health checks
- ✅ Automatic rollback on failure

## 🏗️ Architecture

### Request Flow

```
Client → Cloudflare Workers (Edge)
  ↓
  ├─→ AI Gateway → OpenAI/Anthropic
  ├─→ D1 Database (SQLite)
  ├─→ KV Storage (Cache/Sessions)
  ├─→ R2 Storage (Files)
  ├─→ Analytics Engine (Events)
  └─→ Queues (Background Tasks)
```

### Key Patterns

- **Middleware Architecture:** Composable request handling
- **Service Layer:** Business logic separation
- **Repository Pattern:** Database abstraction
- **Error Boundaries:** Graceful error handling
- **Rate Limiting:** Durable Objects for distributed rate limits
- **Caching Strategy:** Multi-layer caching (KV + AI Gateway)

## 📚 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2025 Chris Korhonen

## 🙏 Acknowledgments

- React Team for the amazing library
- Cloudflare for the Workers platform
- Vite for the blazing-fast tooling
- All open source contributors

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/ckorhonen/mvp-template/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ckorhonen/mvp-template/discussions)

---

**Built with ❤️ for rapid MVP development**

**Ready to build your next big idea? Let's go! 🚀**
