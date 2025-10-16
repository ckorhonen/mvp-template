#!/bin/bash
# Deployment script for Cloudflare Workers

set -e

ENV=${1:-production}

echo "🚀 Deploying to $ENV environment..."
echo ""

# Run tests
echo "🧪 Running tests..."
npm test
echo ""

# Type check
echo "📝 Type checking..."
npm run type-check
echo ""

# Lint
echo "🔍 Linting..."
npm run lint
echo ""

# Build
echo "🏗️ Building..."
npm run build
echo ""

# Deploy
if [ "$ENV" = "production" ]; then
    echo "🌍 Deploying to production..."
    wrangler deploy --env production
elif [ "$ENV" = "staging" ]; then
    echo "🎭 Deploying to staging..."
    wrangler deploy --env staging
else
    echo "🧪 Deploying to development..."
    wrangler deploy
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Test your deployment:"
if [ "$ENV" = "production" ]; then
    echo "https://api.example.com/health"
else
    echo "https://mvp-template.$ENV.workers.dev/health"
fi
