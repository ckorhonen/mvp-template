#!/bin/bash
# Cloudflare Services Setup Script
# This script helps you set up all required Cloudflare services

set -e

echo "🚀 Cloudflare Workers MVP Setup"
echo "================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

echo "✅ Wrangler CLI found"
echo ""

# Authenticate with Cloudflare
echo "🔐 Authenticating with Cloudflare..."
echo "This will open your browser for authentication."
read -p "Press Enter to continue..."
wrangler login
echo ""

# Create KV Namespaces
echo "📦 Creating KV Namespaces..."
echo "Creating CACHE namespace..."
wrangler kv:namespace create CACHE
wrangler kv:namespace create CACHE --preview

echo "Creating SESSIONS namespace..."
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create SESSIONS --preview
echo ""

# Create R2 Buckets
echo "🪣 Creating R2 Buckets..."
wrangler r2 bucket create mvp-assets
wrangler r2 bucket create mvp-assets-preview
wrangler r2 bucket create mvp-uploads
wrangler r2 bucket create mvp-uploads-preview
echo ""

# Create D1 Database
echo "🗄️ Creating D1 Database..."
wrangler d1 create mvp-database
wrangler d1 create mvp-database-preview
echo ""

# Create Queue
echo "📬 Creating Queue..."
wrangler queues create mvp-tasks
wrangler queues create mvp-tasks-dlq
echo ""

echo "✅ Basic setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the IDs from above into your wrangler.toml file"
echo "2. Run the database migrations:"
echo "   wrangler d1 execute DB --file=./migrations/0001_initial.sql"
echo "3. Set up your secrets:"
echo "   wrangler secret put CLOUDFLARE_ACCOUNT_ID"
echo "   wrangler secret put AI_GATEWAY_ID"
echo "   wrangler secret put OPENAI_API_KEY"
echo "   wrangler secret put API_KEY"
echo "4. Copy .dev.vars.example to .dev.vars and fill in your values"
echo "5. Start development: npm run worker:dev"
echo ""
echo "For AI Gateway setup, visit:"
echo "https://dash.cloudflare.com/ > AI > AI Gateway"
echo ""
echo "Happy coding! 🎉"
