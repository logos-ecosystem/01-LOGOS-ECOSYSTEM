#!/bin/bash

# 🚀 Environment Setup Script for Railway Deployment
# This script helps you set up all required environment variables

echo "🔐 LOGOS ECOSYSTEM - Environment Setup"
echo "====================================="
echo ""

# Function to validate input
validate_input() {
    if [ -z "$1" ]; then
        return 1
    fi
    return 0
}

# Railway Configuration
echo "📍 Step 1: Railway Configuration"
echo "Get your token from: https://railway.app/account/tokens"
read -p "Enter your Railway Token: " RAILWAY_TOKEN
while ! validate_input "$RAILWAY_TOKEN"; do
    echo "❌ Railway token cannot be empty!"
    read -p "Enter your Railway Token: " RAILWAY_TOKEN
done
export RAILWAY_TOKEN="$RAILWAY_TOKEN"

# Cloudflare Configuration
echo ""
echo "☁️ Step 2: Cloudflare Configuration"
echo "Get your API token from: https://dash.cloudflare.com/profile/api-tokens"
read -p "Enter your Cloudflare API Token: " CLOUDFLARE_API_TOKEN
while ! validate_input "$CLOUDFLARE_API_TOKEN"; do
    echo "❌ Cloudflare API token cannot be empty!"
    read -p "Enter your Cloudflare API Token: " CLOUDFLARE_API_TOKEN
done
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN"

echo "Get your Zone ID from your Cloudflare dashboard"
read -p "Enter your Cloudflare Zone ID: " CLOUDFLARE_ZONE_ID
while ! validate_input "$CLOUDFLARE_ZONE_ID"; do
    echo "❌ Cloudflare Zone ID cannot be empty!"
    read -p "Enter your Cloudflare Zone ID: " CLOUDFLARE_ZONE_ID
done
export CLOUDFLARE_ZONE_ID="$CLOUDFLARE_ZONE_ID"

# GitHub Configuration
echo ""
echo "🔗 Step 3: GitHub Configuration"
echo "Get your token from: https://github.com/settings/tokens"
read -p "Enter your GitHub Token: " GITHUB_TOKEN
while ! validate_input "$GITHUB_TOKEN"; do
    echo "❌ GitHub token cannot be empty!"
    read -p "Enter your GitHub Token: " GITHUB_TOKEN
done
export GITHUB_TOKEN="$GITHUB_TOKEN"

read -p "Enter your GitHub Username: " GITHUB_USERNAME
while ! validate_input "$GITHUB_USERNAME"; do
    echo "❌ GitHub username cannot be empty!"
    read -p "Enter your GitHub Username: " GITHUB_USERNAME
done
export GITHUB_USERNAME="$GITHUB_USERNAME"

# Optional API Keys
echo ""
echo "🔑 Step 4: API Keys (Optional - press Enter to skip)"
read -p "Enter your Anthropic API Key (optional): " ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

read -p "Enter your Stripe Secret Key (optional): " STRIPE_SECRET_KEY
export STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"

read -p "Enter your Stripe Public Key (optional): " STRIPE_PUBLIC_KEY
export STRIPE_PUBLIC_KEY="$STRIPE_PUBLIC_KEY"

# Save to .env file
echo ""
echo "💾 Saving configuration..."
cat > .env << EOF
# Railway Configuration
RAILWAY_TOKEN=$RAILWAY_TOKEN

# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN
CLOUDFLARE_ZONE_ID=$CLOUDFLARE_ZONE_ID

# GitHub Configuration
GITHUB_TOKEN=$GITHUB_TOKEN
GITHUB_USERNAME=$GITHUB_USERNAME

# API Keys
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLIC_KEY=$STRIPE_PUBLIC_KEY

# Application URLs
NEXT_PUBLIC_API_URL=https://api.logos-ecosystem.com
NEXT_PUBLIC_WS_URL=wss://api.logos-ecosystem.com
EOF

# Create .gitignore if it doesn't exist
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
fi

echo ""
echo "✅ Environment variables saved to .env file"
echo ""
echo "🚀 Ready to deploy! Run:"
echo "   ./railway-deploy.sh"
echo ""
echo "Or source the environment variables and run deployment:"
echo "   source .env"
echo "   ./railway-deploy.sh"