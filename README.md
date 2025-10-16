# 🚀 Cloudflare Workers MVP Template

A comprehensive, production-ready template for building MVPs with **Cloudflare Workers**, featuring AI Gateway integration, D1 database, KV storage, R2 file storage, and more. Built with TypeScript, React, and modern best practices.

## ✨ Features

### Cloudflare Services Integration

- 🤖 **AI Gateway with OpenAI** - Chat completions, embeddings, and more
- 🗄️ **D1 Database** - Serverless SQL database with migrations
- 💾 **KV Storage** - Fast key-value cache and session storage
- 📁 **R2 Storage** - S3-compatible object storage for files
- 🔒 **Workers Runtime** - Edge computing with global deployment

### Developer Experience

- ⚡ **TypeScript** - Full type safety with strict mode
- 🎨 **React 18** - Modern React with hooks
- 🛠️ **Vite** - Lightning-fast build tool
- ✅ **Jest Testing** - Comprehensive test suite
- 📝 **ESLint + Prettier** - Code quality and formatting
- 🎣 **Husky** - Git hooks for pre-commit checks
- 🚦 **GitHub Actions** - Automated CI/CD pipelines

### Production Ready

- 🏗️ **Modular Architecture** - Clean separation of concerns
- 🔐 **Error Handling** - Comprehensive error classes and handlers
- 📊 **Structured Logging** - JSON logging with request IDs
- 🌐 **CORS Support** - Configurable CORS headers
- 📖 **API Documentation** - Built-in endpoint documentation
- 🔄 **Request Validation** - Input validation and sanitization

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Cloudflare Account** ([sign up free](https://dash.cloudflare.com/sign-up))
- **Wrangler CLI** (installed via npm)
- **OpenAI API Key** (optional, for AI features)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/ckorhonen/mvp-template.git
cd mvp-template

# Install dependencies
npm install

# Install Wrangler globally (if not already installed)
npm install -g wrangler
```

### 2. Configure Cloudflare

```bash
# Login to Cloudflare
wrangler login

# Get your account ID
wrangler whoami
```

### 3. Set Up Environment

```bash
# Copy environment files
cp .env.example .env
cp .dev.vars.example .dev.vars

# Edit .env and .dev.vars with your configuration
```

See [SETUP.md](./SETUP.md) for detailed configuration instructions.

### 4. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create mvp-template-db

# Create KV namespaces
wrangler kv:namespace create CACHE
wrangler kv:namespace create SESSIONS

# Create R2 buckets
wrangler r2 bucket create mvp-template-files
wrangler r2 bucket create mvp-template-assets

# Update wrangler.toml with the IDs from above commands
```

### 5. Initialize Database

```bash
# Run database migrations locally
wrangler d1 execute mvp-template-db --file=./src/worker/db/schema.sql --local

# For production (after updating wrangler.toml with your database ID)
wrangler d1 execute mvp-template-db --file=./src/worker/db/schema.sql
```

### 6. Set Secrets

```bash
# Set OpenAI API key (if using AI features)
wrangler secret put OPENAI_API_KEY

# Set AI Gateway configuration (optional)
wrangler secret put AI_GATEWAY_ID
wrangler secret put AI_GATEWAY_URL
```

### 7. Run Locally

```bash
# Start frontend development server
npm run dev

# In another terminal, start Workers local server
npm run worker:dev
```

Visit:
- Frontend: http://localhost:5173
- Worker API: http://localhost:8787
- API Docs: http://localhost:8787/api

## 📚 API Documentation

### AI Gateway Endpoints

#### Chat Completion
```bash
POST /api/ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.7
}
```

#### Embeddings
```bash
POST /api/ai/embeddings
Content-Type: application/json

{
  "input": "Text to embed",
  "model": "text-embedding-ada-002"
}
```

### User Management (D1 Database)

#### List Users
```bash
GET /api/users?page=1&limit=10
```

#### Create User
```bash
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

#### Get User
```bash
GET /api/users/:id
```

#### Update User
```bash
PUT /api/users/:id
Content-Type: application/json

{
  "name": "Jane Doe"
}
```

#### Delete User
```bash
DELETE /api/users/:id
```

### Cache (KV Storage)

#### Set Cache Value
```bash
POST /api/cache
Content-Type: application/json

{
  "key": "mykey",
  "value": { "data": "value" },
  "ttl": 3600
}
```

#### Get Cache Value
```bash
GET /api/cache/:key
```

#### Delete Cache Value
```bash
DELETE /api/cache/:key
```

#### List Cache Keys
```bash
GET /api/cache?prefix=my&limit=10
```

### Files (R2 Storage)

#### Upload File
```bash
POST /api/files
Content-Type: multipart/form-data

# Form data:
# - file: <binary>
# - filename: "document.pdf"
```

#### Get File
```bash
GET /api/files/:key
```

#### Get File Metadata
```bash
GET /api/files/:key/metadata
```

#### Delete File
```bash
DELETE /api/files/:key
```

#### List Files
```bash
GET /api/files?prefix=2024&limit=10
```

## 🏗️ Project Structure

```
├── .github/
│   └── workflows/          # CI/CD workflows
├── src/
│   ├── worker/             # Cloudflare Worker code
│   │   ├── db/            # Database schemas and migrations
│   │   ├── routes/        # API route handlers
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Worker entry point
│   ├── App.tsx            # React app (frontend)
│   └── main.tsx           # React entry point
├── wrangler.toml          # Cloudflare Workers configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── README.md              # This file
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

## 🔍 Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npm run type-check
```

## 🚀 Deployment

### Deploy to Staging

```bash
npm run worker:deploy -- --env staging
```

### Deploy to Production

```bash
npm run worker:deploy -- --env production
```

### Automated Deployment

The template includes GitHub Actions workflows for automated deployment:

- **PR Checks** - Runs on pull requests
- **Staging Deploy** - Deploys to staging on push to `staging` branch
- **Production Deploy** - Deploys to production on push to `main` branch

See [.github/workflows/](./.github/workflows/) for workflow details.

## 🔧 Configuration

### Environment Variables

See [.env.example](./.env.example) for all available configuration options.

### Wrangler Configuration

Edit [wrangler.toml](./wrangler.toml) to configure:

- Account ID
- D1 database bindings
- KV namespace bindings
- R2 bucket bindings
- Environment-specific settings

### GitHub Secrets

For CI/CD, add these secrets to your GitHub repository:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers edit permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `STAGING_D1_DATABASE_NAME` - Staging database name
- `PRODUCTION_D1_DATABASE_NAME` - Production database name

## 📖 Additional Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [API Documentation](./docs/API.md) - Complete API reference
- [Database Schema](./src/worker/db/README.md) - Database documentation
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute

## 🛠️ Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- CSS Modules

### Backend (Cloudflare Workers)
- TypeScript
- Cloudflare Workers Runtime
- D1 Database (SQLite)
- KV Storage
- R2 Storage
- AI Gateway

### Development Tools
- Wrangler (Cloudflare CLI)
- Jest (Testing)
- ESLint (Linting)
- Prettier (Formatting)
- Husky (Git Hooks)

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Inspired by best practices from the Cloudflare community
- Template maintained by [Chris Korhonen](https://github.com/ckorhonen)

## 📞 Support

- 📧 Email: chris@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/ckorhonen/mvp-template/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/ckorhonen/mvp-template/discussions)

---

**Happy building! 🚀**
