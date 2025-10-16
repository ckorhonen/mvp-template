# Cloudflare Workers MVP Template

> **The definitive, production-ready Cloudflare Workers template** with AI Gateway, D1, KV, R2, and best practices built-in.

## 🚀 Features

### **AI & Machine Learning**
- ✅ Cloudflare AI Gateway integration with OpenAI
- ✅ Chat completions and text generation
- ✅ Rate limiting and caching for AI requests
- ✅ Usage tracking and analytics

### **Database & Storage**
- ✅ D1 SQLite database with comprehensive schema
- ✅ KV key-value storage for caching and sessions
- ✅ R2 object storage for files and backups
- ✅ Database migrations and seed data

### **API & Routing**
- ✅ RESTful API with type-safe routing
- ✅ CRUD operations for all services
- ✅ Request validation and sanitization
- ✅ Comprehensive error handling

### **Security & Performance**
- ✅ CORS middleware with configurable origins
- ✅ Rate limiting using KV
- ✅ Request logging and monitoring
- ✅ Environment-based configuration

### **Developer Experience**
- ✅ Full TypeScript support with strict types
- ✅ ESLint and Prettier configuration
- ✅ GitHub Actions CI/CD workflow
- ✅ Comprehensive documentation
- ✅ Local development with hot reload

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Cloudflare Account** (free tier works)
- **OpenAI API Key** (for AI features)
- **Wrangler CLI** (install via `npm install -g wrangler`)

## 🏃 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/ckorhonen/mvp-template.git
cd mvp-template
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Cloudflare account details
# - CLOUDFLARE_ACCOUNT_ID
# - AI_GATEWAY_ID
# - OPENAI_API_KEY
```

### 3. Setup Cloudflare Resources

```bash
# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create mvp-database
wrangler d1 execute mvp-database --file=database/schema.sql

# Create KV namespaces
wrangler kv:namespace create CACHE
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CONFIG

# Create R2 buckets
wrangler r2 bucket create mvp-uploads
wrangler r2 bucket create mvp-assets
wrangler r2 bucket create mvp-backups

# Update wrangler.toml with the IDs from above commands
```

### 4. Run Locally

```bash
# Build and start development server
npm run dev

# Worker will be available at http://localhost:8787
```

### 5. Deploy

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Or deploy to specific environment
wrangler deploy --env staging
wrangler deploy --env production
```

## 📚 API Endpoints

### Health Check
```bash
GET /health
```

### AI Gateway
```bash
# Chat completion
POST /api/ai/chat
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello!"}
  ]
}

# Text completion
POST /api/ai/completion
{
  "prompt": "Once upon a time"
}
```

### D1 Database
```bash
# Query records
GET /api/database/users?limit=10&offset=0

# Create record
POST /api/database/users
{"email": "user@example.com", "username": "user123"}

# Update record
PUT /api/database/users/1
{"display_name": "New Name"}

# Delete record
DELETE /api/database/users/1
```

### KV Storage
```bash
# Get value
GET /api/kv/mykey

# Set value
POST /api/kv/mykey
{"value": "myvalue", "ttl": 3600}

# Delete value
DELETE /api/kv/mykey

# List keys
GET /api/kv?prefix=user&limit=100
```

### R2 Object Storage
```bash
# Upload file
POST /api/r2/upload
Content-Type: multipart/form-data
[file data]

# Download file
GET /api/r2/download/filename.txt

# List objects
GET /api/r2/list?prefix=uploads&limit=100

# Delete object
DELETE /api/r2/filename.txt
```

### Combined Example
```bash
# Uses AI, D1, KV, and R2 together
POST /api/example/combined
{
  "text": "Your text to process"
}
```

## 🏗️ Project Structure

```
mvp-template/
├── src/
│   ├── worker/
│   │   ├── index.ts              # Main worker entry point
│   │   ├── routes/               # API route handlers
│   │   │   ├── ai.ts            # AI Gateway routes
│   │   │   ├── database.ts      # D1 database routes
│   │   │   ├── kv.ts            # KV storage routes
│   │   │   ├── r2.ts            # R2 storage routes
│   │   │   ├── health.ts        # Health check
│   │   │   └── combined.ts      # Combined example
│   │   ├── middleware/          # Request middleware
│   │   │   ├── cors.ts          # CORS handling
│   │   │   ├── rateLimit.ts     # Rate limiting
│   │   │   ├── errorHandler.ts  # Error handling
│   │   │   └── logger.ts        # Request logging
│   │   ├── utils/               # Utility functions
│   │   │   ├── response.ts      # Response helpers
│   │   │   ├── validation.ts    # Input validation
│   │   │   ├── router.ts        # Routing utility
│   │   │   └── logger.ts        # Structured logging
│   │   └── types/               # TypeScript types
│   │       ├── env.ts           # Environment types
│   │       └── api.ts           # API types
│   └── App.tsx                  # React app (optional)
├── database/
│   ├── schema.sql               # D1 database schema
│   ├── migrations/              # Database migrations
│   └── seeds/                   # Seed data
├── .github/
│   └── workflows/
│       ├── deploy.yml           # Main CI/CD workflow
│       └── test.yml             # Test workflow
├── docs/
│   ├── SETUP.md                 # Detailed setup guide
│   ├── API.md                   # API documentation
│   ├── EXAMPLES.md              # Usage examples
│   └── BEST_PRACTICES.md        # Best practices
├── wrangler.toml                # Cloudflare Workers config
├── .env.example                 # Environment template
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies & scripts
```

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env`:

```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# AI Gateway
AI_GATEWAY_ID=your-gateway-id
OPENAI_API_KEY=sk-your-openai-key
AI_DEFAULT_MODEL=gpt-4o-mini

# Database
D1_DATABASE_ID=your-database-id

# KV Namespaces
KV_CACHE_ID=your-kv-cache-id
KV_SESSIONS_ID=your-kv-sessions-id

# R2 Buckets
R2_UPLOADS_BUCKET=mvp-uploads
R2_ASSETS_BUCKET=mvp-assets

# Feature Flags
FEATURE_AI_ENABLED=true
FEATURE_RATE_LIMITING_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
```

### Wrangler Configuration

The `wrangler.toml` includes configurations for:
- Multiple environments (dev, staging, production)
- Service bindings (D1, KV, R2, AI Gateway)
- Route patterns
- Compatibility settings

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Type check
npm run type-check

# Format code
npm run format
```

## 🚀 Deployment

### GitHub Actions

The template includes comprehensive GitHub Actions workflows:

1. **On Pull Request**: Lint, test, and build
2. **On Push to `staging`**: Deploy to staging environment
3. **On Push to `main`**: Deploy to production environment

### Manual Deployment

```bash
# Deploy to development
wrangler deploy

# Deploy to staging
wrangler deploy --env staging

# Deploy to production  
wrangler deploy --env production
```

### Database Migrations

```bash
# Run migrations
wrangler d1 migrations apply mvp-database
wrangler d1 migrations apply mvp-database --env staging
wrangler d1 migrations apply mvp-database --env production
```

## 📖 Documentation

- **[Setup Guide](./docs/SETUP.md)** - Comprehensive setup instructions
- **[API Documentation](./docs/API.md)** - Detailed API reference
- **[Examples](./docs/EXAMPLES.md)** - Code examples and patterns
- **[Best Practices](./docs/BEST_PRACTICES.md)** - Development best practices

## 🔐 Security

- **Rate Limiting**: Built-in rate limiting using KV
- **CORS**: Configurable CORS middleware
- **Input Validation**: Comprehensive validation utilities
- **Error Handling**: Global error handler with logging
- **Secrets Management**: Use Wrangler secrets for sensitive data

## 🎯 Use Cases

This template is perfect for:

- 🤖 **AI-powered applications** with OpenAI integration
- 📱 **API backends** for mobile and web apps
- 🔄 **Serverless microservices** with database and storage
- 🚀 **MVPs and prototypes** that need to scale
- 🏗️ **Production-ready projects** with best practices

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare KV](https://developers.cloudflare.com/kv/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [OpenAI API](https://platform.openai.com/)

## 📞 Support

- 📧 Email: support@example.com
- 💬 Discord: [Join our community](https://discord.gg/example)
- 🐛 Issues: [GitHub Issues](https://github.com/ckorhonen/mvp-template/issues)

---

**Made with ❤️ for the Cloudflare Workers community**
