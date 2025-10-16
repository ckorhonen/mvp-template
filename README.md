# 🚀 MVP Template

> Rapid MVP Development Template with TypeScript, React, Cloudflare Workers, and Full Cloudflare Stack Integration

A production-ready, feature-rich template for building Minimum Viable Products (MVPs) quickly with modern web technologies, comprehensive Cloudflare services integration, AI capabilities, and automated CI/CD pipelines.

## 📋 Project Description

This template provides a complete, enterprise-grade development environment for building full-stack web applications with:

- **Frontend**: React 18 with TypeScript, bundled with Vite for lightning-fast development
- **Backend**: Cloudflare Workers for serverless API endpoints with global edge deployment
- **Database**: D1 SQL database with migrations and query builder
- **Storage**: R2 for object storage (assets, uploads, backups)
- **Caching**: KV for key-value storage and caching
- **AI**: OpenAI integration via Cloudflare AI Gateway
- **Queues**: Background job processing with Cloudflare Queues
- **Analytics**: Built-in analytics engine for tracking
- **Testing**: Jest and React Testing Library for comprehensive test coverage
- **CI/CD**: GitHub Actions workflows for automated testing, security scanning, and multi-environment deployment
- **Code Quality**: ESLint, Prettier, and Husky pre-commit hooks ensure consistent code quality

## ✨ Features

### Core Features
- ✅ **TypeScript** - Full type safety with strict mode enabled
- ✅ **React 18** - Latest React features with Vite for instant HMR
- ✅ **Cloudflare Workers** - Serverless backend deployed to 300+ edge locations

### Cloudflare Services Integration
- ✅ **D1 Database** - Serverless SQL database with migrations
- ✅ **KV Storage** - Key-value storage for cache and sessions
- ✅ **R2 Storage** - Object storage for assets and uploads
- ✅ **AI Gateway** - OpenAI integration with caching and cost tracking
- ✅ **Queues** - Background job processing
- ✅ **Analytics Engine** - Real-time analytics and metrics
- ✅ **Durable Objects** - Stateful objects for rate limiting

### Development Tools
- ✅ **ESLint + Prettier** - Automatic code formatting and linting
- ✅ **Jest Testing** - Unit and integration tests with coverage reporting
- ✅ **GitHub Actions** - Automated CI/CD pipeline for testing and deployment
- ✅ **Pre-commit Hooks** - Prevent bad commits with Husky and lint-staged
- ✅ **Path Aliases** - Clean imports with `@/` prefix
- ✅ **Security Scanning** - Automated dependency vulnerability checks with Snyk

### Utilities & Helpers
- ✅ **CORS Helpers** - Complete CORS configuration
- ✅ **Structured Logging** - JSON logging with levels
- ✅ **Response Utilities** - Standardized API responses
- ✅ **Error Handling** - Comprehensive error handling
- ✅ **Rate Limiting** - Built-in rate limiting with Durable Objects

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Vite 5** - Fast build tool and dev server
- **CSS3** - Custom styling (easily swap with Tailwind/Styled Components)

### Backend
- **Cloudflare Workers** - Edge computing platform
- **Wrangler** - CLI for Cloudflare Workers development
- **D1 Database** - Serverless SQLite database
- **KV Storage** - Key-value storage
- **R2 Storage** - Object storage
- **Queues** - Message queuing system

### AI & Machine Learning
- **OpenAI API** - GPT models for AI features
- **Cloudflare AI Gateway** - Caching, rate limiting, and cost tracking

### Testing
- **Jest** - Testing framework
- **React Testing Library** - React component testing
- **@testing-library/jest-dom** - Custom Jest matchers

### Code Quality
- **ESLint** - Linting for TypeScript and React
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Run linters on staged files

### CI/CD
- **GitHub Actions** - Automated workflows
- **Codecov** - Code coverage reporting
- **Snyk** - Security vulnerability scanning
- **Multi-environment deployment** - Staging and Production

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or 20.x
- **npm** 9.x or higher
- **Git** 2.x or higher
- **Cloudflare Account** (free tier available at [dash.cloudflare.com](https://dash.cloudflare.com))

### Installation

1. **Use this template or clone the repository**
   ```bash
   # Using GitHub CLI
   gh repo create my-mvp --template ckorhonen/mvp-template
   
   # Or clone directly
   git clone https://github.com/ckorhonen/mvp-template.git my-mvp
   cd my-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Git hooks**
   ```bash
   npm run prepare
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Log in to Cloudflare**
   ```bash
   npx wrangler login
   ```

### Initial Cloudflare Setup

#### 1. Get Your Account ID
```bash
npx wrangler whoami
# Copy your Account ID from the output
```

Update `wrangler.toml`:
```toml
account_id = "your-account-id-here"
```

#### 2. Create D1 Database
```bash
# Create production database
npx wrangler d1 create mvp-database

# Create staging database
npx wrangler d1 create mvp-database-staging

# Update wrangler.toml with the database IDs from the output
```

#### 3. Run Database Migrations
```bash
# Apply migrations locally
npx wrangler d1 execute mvp-database --local --file=./migrations/0001_initial_schema.sql

# Apply to remote database
npx wrangler d1 execute mvp-database --file=./migrations/0001_initial_schema.sql
```

#### 4. Create KV Namespaces
```bash
# Create KV namespaces
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview
npx wrangler kv:namespace create SESSIONS
npx wrangler kv:namespace create SESSIONS --preview

# Update wrangler.toml with the namespace IDs from the output
```

#### 5. Create R2 Buckets
```bash
# Create R2 buckets
npx wrangler r2 bucket create mvp-assets
npx wrangler r2 bucket create mvp-assets-preview
npx wrangler r2 bucket create mvp-uploads
npx wrangler r2 bucket create mvp-uploads-preview
```

#### 6. Set Up AI Gateway
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **AI → AI Gateway**
3. Create a new gateway named `mvp-gateway`
4. Copy the Gateway ID and update `.env`:
   ```
   AI_GATEWAY_ID=your-gateway-id
   ```

#### 7. Add Secrets
```bash
# Add OpenAI API key
npx wrangler secret put OPENAI_API_KEY

# Add other secrets as needed
npx wrangler secret put SESSION_SECRET
npx wrangler secret put JWT_SECRET
```

## 💻 Development

### Start Development Servers

**Frontend (React + Vite):**
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

**Backend (Cloudflare Worker):**
```bash
npm run worker:dev
```
Worker will be available at [http://localhost:8787](http://localhost:8787)

**Both simultaneously:**
```bash
npm run dev & npm run worker:dev
```

### Testing

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Check for issues
npm run lint

# Fix issues automatically
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Type Checking

```bash
npm run type-check
```

## 📦 Build & Deploy

### Build for Production

```bash
# Build frontend
npm run build

# Build worker
npm run build:worker

# Preview production build
npm run preview
```

### Deployment

#### Automatic Deployment (Recommended)

Push to your repository branches:
- `main` → Deploys to **Production**
- `develop` → Deploys to **Staging**
- Pull Requests → Deploys to **Preview**

GitHub Actions will automatically:
1. Run tests and quality checks
2. Build the application
3. Run database migrations
4. Deploy to Cloudflare Workers
5. Run health checks

#### Manual Deployment

```bash
# Deploy to production
npm run worker:deploy

# Deploy to staging
npx wrangler deploy --env staging

# Deploy to development
npx wrangler deploy --env development
```

### GitHub Secrets Setup

Add these secrets to your GitHub repository:
1. Go to **Settings → Secrets and variables → Actions**
2. Add the following secrets:
   - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
   - `CODECOV_TOKEN` - (Optional) Codecov token for coverage reports
   - `SNYK_TOKEN` - (Optional) Snyk token for security scanning

## 🗄️ Database Management

### Running Migrations

```bash
# Local development
npx wrangler d1 execute mvp-database --local --file=./migrations/0001_initial_schema.sql

# Staging
npx wrangler d1 execute mvp-database --env staging --file=./migrations/0001_initial_schema.sql

# Production
npx wrangler d1 execute mvp-database --env production --file=./migrations/0001_initial_schema.sql
```

### Creating Migrations

1. Create a new migration file in `migrations/`:
   ```sql
   -- migrations/0002_add_posts_table.sql
   CREATE TABLE posts (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       title TEXT NOT NULL,
       content TEXT,
       user_id INTEGER NOT NULL,
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       FOREIGN KEY (user_id) REFERENCES users(id)
   );
   ```

2. Apply the migration:
   ```bash
   npx wrangler d1 execute mvp-database --file=./migrations/0002_add_posts_table.sql
   ```

### Database Queries

```bash
# List all tables
npx wrangler d1 execute mvp-database --command "SELECT name FROM sqlite_master WHERE type='table';"

# Query data
npx wrangler d1 execute mvp-database --command "SELECT * FROM users LIMIT 10;"
```

## 🤖 AI Integration

### Using the AI Service

```typescript
import { createAIService } from './services/ai';

// In your worker handler
const aiService = createAIService(env);

// Generate text
const response = await aiService.generateText(
  'Write a welcome message',
  'You are a helpful assistant'
);

// Chat completion
const chatResponse = await aiService.createChatCompletion({
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

// Moderate content
const moderation = await aiService.moderateContent('Some user content');
if (moderation.flagged) {
  // Handle flagged content
}
```

## 📊 Monitoring & Analytics

### Built-in Analytics

The template includes Analytics Engine integration for tracking events:

```typescript
// Track an event
await env.ANALYTICS.writeDataPoint({
  blobs: ['user_signup', userId],
  doubles: [1],
  indexes: ['users']
});
```

### Logging

Structured logging is available throughout the application:

```typescript
import { createLogger } from './utils/logger';

const logger = createLogger(env);
logger.info('User logged in', { userId: '123' });
logger.error('Failed to process request', error);
```

## 🔒 Security

### Rate Limiting

Rate limiting is implemented using Durable Objects:

```typescript
// Configured in wrangler.toml
RATE_LIMIT_REQUESTS_PER_MINUTE = "60"
RATE_LIMIT_REQUESTS_PER_HOUR = "1000"
```

### CORS Configuration

CORS is fully configurable:

```typescript
import { withCors } from './utils/cors';

export default withCors(handler, {
  allowedOrigins: ['https://example.com'],
  allowedMethods: ['GET', 'POST'],
  credentials: true
});
```

### Security Headers

Security headers are automatically added to responses.

## 📚 Project Structure

```
mvp-template/
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # CI/CD pipeline
├── migrations/
│   ├── 0001_initial_schema.sql # Database migrations
│   └── README.md
├── src/
│   ├── worker/
│   │   ├── services/
│   │   │   ├── ai.ts           # AI service
│   │   │   └── database.ts     # Database service
│   │   ├── utils/
│   │   │   ├── cors.ts         # CORS utilities
│   │   │   ├── logger.ts       # Logging
│   │   │   └── response.ts     # Response helpers
│   │   ├── index.ts            # Worker entry point
│   │   └── types.ts            # TypeScript types
│   ├── App.tsx                 # React app
│   └── main.tsx                # React entry point
├── .env.example                # Environment variables template
├── wrangler.toml               # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper tests
4. Run quality checks: `npm run type-check && npm run lint && npm test`
5. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

Copyright (c) 2024 Chris Korhonen

## 🙏 Acknowledgments

- React Team for the amazing library
- Cloudflare for the Workers platform and comprehensive edge services
- Vite for the blazing-fast build tool
- OpenAI for AI capabilities
- All open source contributors

## 📞 Support & Resources

- **Issues**: [GitHub Issues](https://github.com/ckorhonen/mvp-template/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ckorhonen/mvp-template/discussions)
- **Cloudflare Docs**: [developers.cloudflare.com](https://developers.cloudflare.com)
- **Wrangler Docs**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler/)

## 🎯 Roadmap

- [ ] Add authentication examples (JWT, OAuth)
- [ ] Add payment integration examples (Stripe)
- [ ] Add email sending examples
- [ ] Add WebSocket support
- [ ] Add real-time features with Durable Objects
- [ ] Add more AI examples and use cases
- [ ] Add GraphQL API option
- [ ] Add Tailwind CSS integration example

---

**Built with ❤️ for rapid MVP development**

**Ready to ship? Deploy in minutes! 🚀**
