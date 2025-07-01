#!/bin/bash

# Interactive AWS Secrets Manager Setup for LOGOS
# This script helps you set up secrets after rotation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔐 LOGOS - AWS Secrets Manager Setup${NC}"
echo -e "${BLUE}=====================================
${NC}"

# Check AWS CLI
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

AWS_REGION=${AWS_REGION:-us-east-1}
ENVIRONMENT=${1:-production}

echo -e "${GREEN}✓ AWS CLI configured${NC}"
echo -e "📍 Region: ${YELLOW}${AWS_REGION}${NC}"
echo -e "🌍 Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo ""

# Function to create/update secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo -n "Creating ${secret_name}... "
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" &>/dev/null; then
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" &>/dev/null
        echo -e "${GREEN}✓ Updated${NC}"
    else
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$secret_value" \
            --description "$description" \
            --region "$AWS_REGION" &>/dev/null
        echo -e "${GREEN}✓ Created${NC}"
    fi
}

echo -e "${YELLOW}Please enter your rotated credentials:${NC}"
echo ""

# Database
echo -e "${BLUE}Database Configuration${NC}"
read -p "Database host [logos-production-db.ckb0s0mgunv0.us-east-1.rds.amazonaws.com]: " DB_HOST
DB_HOST=${DB_HOST:-"logos-production-db.ckb0s0mgunv0.us-east-1.rds.amazonaws.com"}
read -p "Database name [logos_production]: " DB_NAME
DB_NAME=${DB_NAME:-"logos_production"}
read -p "Database user [logos_admin]: " DB_USER
DB_USER=${DB_USER:-"logos_admin"}
read -sp "Database password: " DB_PASSWORD
echo ""
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?schema=public&sslmode=require"

# Redis
echo ""
echo -e "${BLUE}Redis Configuration${NC}"
read -p "Redis URL [redis://logos-production-redis.zc7t27.0001.use1.cache.amazonaws.com:6379]: " REDIS_URL
REDIS_URL=${REDIS_URL:-"redis://logos-production-redis.zc7t27.0001.use1.cache.amazonaws.com:6379"}

# JWT Secrets
echo ""
echo -e "${BLUE}Security Secrets${NC}"
echo "Generating secure random secrets..."
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)
echo -e "${GREEN}✓ Generated${NC}"

# API Keys
echo ""
echo -e "${BLUE}API Keys${NC}"
read -sp "Anthropic API Key: " ANTHROPIC_API_KEY
echo ""
read -sp "Stripe Secret Key: " STRIPE_SECRET_KEY
echo ""
read -sp "Stripe Webhook Secret: " STRIPE_WEBHOOK_SECRET
echo ""
read -sp "PayPal Secret: " PAYPAL_SECRET
echo ""

# Email
echo ""
echo -e "${BLUE}Email Configuration (AWS SES)${NC}"
read -p "SMTP User: " SMTP_USER
read -sp "SMTP Password: " SMTP_PASS
echo ""

# Optional: Sentry
echo ""
read -p "Sentry DSN (optional, press Enter to skip): " SENTRY_DSN

echo ""
echo -e "${YELLOW}Creating secrets in AWS Secrets Manager...${NC}"
echo ""

# Create all secrets
create_secret "logos/${ENVIRONMENT}/database-url" "$DATABASE_URL" "PostgreSQL connection string"
create_secret "logos/${ENVIRONMENT}/redis-url" "$REDIS_URL" "Redis connection string"
create_secret "logos/${ENVIRONMENT}/jwt-secret" "$JWT_SECRET" "JWT signing secret"
create_secret "logos/${ENVIRONMENT}/jwt-refresh-secret" "$JWT_REFRESH_SECRET" "JWT refresh token secret"
create_secret "logos/${ENVIRONMENT}/session-secret" "$SESSION_SECRET" "Session secret"
create_secret "logos/${ENVIRONMENT}/encryption-key" "$ENCRYPTION_KEY" "Data encryption key"
create_secret "logos/${ENVIRONMENT}/anthropic-api-key" "$ANTHROPIC_API_KEY" "Anthropic API key"
create_secret "logos/${ENVIRONMENT}/stripe-secret-key" "$STRIPE_SECRET_KEY" "Stripe secret key"
create_secret "logos/${ENVIRONMENT}/stripe-webhook-secret" "$STRIPE_WEBHOOK_SECRET" "Stripe webhook secret"
create_secret "logos/${ENVIRONMENT}/paypal-secret" "$PAYPAL_SECRET" "PayPal secret"
create_secret "logos/${ENVIRONMENT}/smtp-user" "$SMTP_USER" "SMTP username"
create_secret "logos/${ENVIRONMENT}/smtp-pass" "$SMTP_PASS" "SMTP password"

if [ ! -z "$SENTRY_DSN" ]; then
    create_secret "logos/${ENVIRONMENT}/sentry-dsn" "$SENTRY_DSN" "Sentry DSN"
fi

echo ""
echo -e "${GREEN}✅ All secrets created successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update your ECS task definition to use these secrets"
echo "2. Ensure your ECS task role has secretsmanager:GetSecretValue permission"
echo "3. Deploy your application"
echo ""
echo -e "${BLUE}Secrets created:${NC}"
aws secretsmanager list-secrets --region "$AWS_REGION" | jq -r '.SecretList[] | select(.Name | startswith("logos/'${ENVIRONMENT}'/")) | .Name' | sort