#!/bin/bash

# Setup AWS Secrets Manager for LOGOS Backend
# This script creates all necessary secrets in AWS Secrets Manager

set -e

echo "🔐 Setting up AWS Secrets Manager for LOGOS Backend"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

AWS_REGION=${AWS_REGION:-us-east-1}
ENVIRONMENT=${1:-production}

echo "📍 Region: ${AWS_REGION}"
echo "🌍 Environment: ${ENVIRONMENT}"

# Function to create or update secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" > /dev/null 2>&1; then
        echo "🔄 Updating secret: $secret_name"
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --description "$description" \
            --region "$AWS_REGION"
    else
        echo "✨ Creating secret: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$secret_value" \
            --description "$description" \
            --region "$AWS_REGION"
    fi
}

# Read values from .env.production or prompt user
if [ -f ".env.${ENVIRONMENT}" ]; then
    echo "📄 Loading values from .env.${ENVIRONMENT}"
    source ".env.${ENVIRONMENT}"
else
    echo "⚠️  No .env.${ENVIRONMENT} file found. Please enter values manually:"
fi

# Database URL
if [ -z "$DATABASE_URL" ]; then
    read -p "Enter DATABASE_URL: " DATABASE_URL
fi
create_secret "logos/${ENVIRONMENT}/database-url" "$DATABASE_URL" "PostgreSQL connection string"

# Redis URL
if [ -z "$REDIS_URL" ]; then
    read -p "Enter REDIS_URL: " REDIS_URL
fi
create_secret "logos/${ENVIRONMENT}/redis-url" "$REDIS_URL" "Redis connection string"

# JWT Secrets
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "🔑 Generated JWT_SECRET: $JWT_SECRET"
fi
create_secret "logos/${ENVIRONMENT}/jwt-secret" "$JWT_SECRET" "JWT signing secret"

if [ -z "$JWT_REFRESH_SECRET" ]; then
    JWT_REFRESH_SECRET=$(openssl rand -hex 32)
    echo "🔑 Generated JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
fi
create_secret "logos/${ENVIRONMENT}/jwt-refresh-secret" "$JWT_REFRESH_SECRET" "JWT refresh token secret"

# Stripe Keys
if [ -z "$STRIPE_SECRET_KEY" ]; then
    read -p "Enter STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
fi
create_secret "logos/${ENVIRONMENT}/stripe-secret-key" "$STRIPE_SECRET_KEY" "Stripe secret key"

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    read -p "Enter STRIPE_WEBHOOK_SECRET: " STRIPE_WEBHOOK_SECRET
fi
create_secret "logos/${ENVIRONMENT}/stripe-webhook-secret" "$STRIPE_WEBHOOK_SECRET" "Stripe webhook signing secret"

# Sentry DSN
if [ -z "$SENTRY_DSN" ]; then
    read -p "Enter SENTRY_DSN (optional, press enter to skip): " SENTRY_DSN
fi
if [ ! -z "$SENTRY_DSN" ]; then
    create_secret "logos/${ENVIRONMENT}/sentry-dsn" "$SENTRY_DSN" "Sentry error tracking DSN"
fi

# Encryption Key
if [ -z "$ENCRYPTION_KEY" ]; then
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo "🔑 Generated ENCRYPTION_KEY: $ENCRYPTION_KEY"
fi
create_secret "logos/${ENVIRONMENT}/encryption-key" "$ENCRYPTION_KEY" "Data encryption key"

# Email Configuration (optional)
read -p "Configure email settings? (y/n): " configure_email
if [ "$configure_email" = "y" ]; then
    read -p "Enter SMTP_HOST: " SMTP_HOST
    read -p "Enter SMTP_PORT: " SMTP_PORT
    read -p "Enter SMTP_USER: " SMTP_USER
    read -s -p "Enter SMTP_PASS: " SMTP_PASS
    echo
    
    create_secret "logos/${ENVIRONMENT}/smtp-host" "$SMTP_HOST" "SMTP server host"
    create_secret "logos/${ENVIRONMENT}/smtp-port" "$SMTP_PORT" "SMTP server port"
    create_secret "logos/${ENVIRONMENT}/smtp-user" "$SMTP_USER" "SMTP username"
    create_secret "logos/${ENVIRONMENT}/smtp-pass" "$SMTP_PASS" "SMTP password"
fi

echo ""
echo "✅ AWS Secrets Manager setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your task-definition.json with your AWS Account ID"
echo "2. Create ECR repository: aws ecr create-repository --repository-name logos-backend"
echo "3. Run deployment script: ./aws-deployment.sh ${ENVIRONMENT}"
echo ""
echo "🔒 Created secrets:"
aws secretsmanager list-secrets --region "$AWS_REGION" | jq '.SecretList[] | select(.Name | startswith("logos/")) | .Name'