#!/bin/bash

# 🔐 Setup Railway Secrets for GitHub Actions
# This script helps you configure all necessary secrets

set -euo pipefail

echo "🔐 LOGOS ECOSYSTEM - Railway Secrets Setup"
echo "=========================================="
echo ""
echo "This script will help you set up GitHub secrets for Railway deployment."
echo "You'll need the following information ready:"
echo ""
echo "1. Railway API Token"
echo "2. Railway Project ID"
echo "3. Cloudflare API Token"
echo "4. Cloudflare Zone ID"
echo "5. GitHub Personal Access Token"
echo "6. API Keys (Stripe, Anthropic, etc.)"
echo ""
echo "Press Enter to continue..."
read

# Function to set GitHub secret
set_github_secret() {
    local name=$1
    local value=$2
    echo "Setting secret: $name"
    gh secret set "$name" -b "$value"
}

# Get GitHub repository info
GITHUB_REPO=$(git remote get-url origin | sed 's/.*github.com[:\/]\(.*\)\.git/\1/')

echo ""
echo "📌 Setting secrets for repository: $GITHUB_REPO"
echo ""

# Railway Configuration
echo "🚂 Railway Configuration"
echo "========================"
echo ""
echo "1. Get your Railway API token from: https://railway.app/account/tokens"
read -p "Enter Railway API Token: " RAILWAY_TOKEN
set_github_secret "RAILWAY_TOKEN" "$RAILWAY_TOKEN"

echo ""
echo "2. Get your Project ID from Railway dashboard"
read -p "Enter Railway Project ID: " RAILWAY_PROJECT_ID
set_github_secret "RAILWAY_PROJECT_ID" "$RAILWAY_PROJECT_ID"

# Cloudflare Configuration
echo ""
echo "☁️ Cloudflare Configuration"
echo "=========================="
echo ""
echo "3. Create an API token at: https://dash.cloudflare.com/profile/api-tokens"
echo "   Required permissions: Zone:DNS:Edit, Zone:Zone:Read"
read -p "Enter Cloudflare API Token: " CLOUDFLARE_API_TOKEN
set_github_secret "CLOUDFLARE_API_TOKEN" "$CLOUDFLARE_API_TOKEN"

echo ""
echo "4. Get your Zone ID from Cloudflare dashboard"
read -p "Enter Cloudflare Zone ID: " CLOUDFLARE_ZONE_ID
set_github_secret "CLOUDFLARE_ZONE_ID" "$CLOUDFLARE_ZONE_ID"

# API Configuration
echo ""
echo "🔑 API Keys Configuration"
echo "========================"
echo ""

read -p "Enter Anthropic API Key (optional): " ANTHROPIC_API_KEY
if [ -n "$ANTHROPIC_API_KEY" ]; then
    set_github_secret "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"
fi

read -p "Enter Stripe Secret Key (optional): " STRIPE_SECRET_KEY
if [ -n "$STRIPE_SECRET_KEY" ]; then
    set_github_secret "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
fi

read -p "Enter Stripe Public Key (optional): " STRIPE_PUBLIC_KEY
if [ -n "$STRIPE_PUBLIC_KEY" ]; then
    set_github_secret "STRIPE_PUBLIC_KEY" "$STRIPE_PUBLIC_KEY"
fi

read -p "Enter Stripe Webhook Secret (optional): " STRIPE_WEBHOOK_SECRET
if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    set_github_secret "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
fi

# Application URLs
echo ""
echo "🌐 Application URLs"
echo "==================="
echo ""
set_github_secret "NEXT_PUBLIC_API_URL" "https://api.logos-ecosystem.com"
set_github_secret "NEXT_PUBLIC_WS_URL" "wss://api.logos-ecosystem.com"

# Optional: Slack webhook for notifications
echo ""
read -p "Enter Slack Webhook URL for notifications (optional): " SLACK_WEBHOOK
if [ -n "$SLACK_WEBHOOK" ]; then
    set_github_secret "SLACK_WEBHOOK" "$SLACK_WEBHOOK"
fi

echo ""
echo "✅ All secrets have been configured!"
echo ""
echo "Next steps:"
echo "1. Run: ./railway-deploy.sh"
echo "2. Or push to main branch to trigger automatic deployment"
echo ""
echo "Your application will be available at:"
echo "🌐 https://logos-ecosystem.com"
echo "🔌 https://api.logos-ecosystem.com"
echo ""