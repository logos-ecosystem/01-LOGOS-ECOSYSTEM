#!/bin/bash

# Create AWS Secrets Manager secrets for LOGOS Backend

echo "Creating secrets in AWS Secrets Manager..."

# Database URL (example - replace with actual)
aws secretsmanager create-secret \
  --name "logos-ecosystem/database-url" \
  --description "PostgreSQL database connection string" \
  --secret-string "postgresql://logos_user:your_password@your-rds-endpoint.amazonaws.com:5432/logos_db" \
  --region us-east-1 2>/dev/null || echo "Secret database-url already exists"

# JWT Secret
aws secretsmanager create-secret \
  --name "logos-ecosystem/jwt-secret" \
  --description "JWT signing secret" \
  --secret-string "$(openssl rand -base64 32)" \
  --region us-east-1 2>/dev/null || echo "Secret jwt-secret already exists"

# Stripe Secret Key
aws secretsmanager create-secret \
  --name "logos-ecosystem/stripe-secret-key" \
  --description "Stripe API secret key" \
  --secret-string "sk_test_your_stripe_secret_key" \
  --region us-east-1 2>/dev/null || echo "Secret stripe-secret-key already exists"

# Stripe Webhook Secret
aws secretsmanager create-secret \
  --name "logos-ecosystem/stripe-webhook-secret" \
  --description "Stripe webhook endpoint secret" \
  --secret-string "whsec_your_stripe_webhook_secret" \
  --region us-east-1 2>/dev/null || echo "Secret stripe-webhook-secret already exists"

# AWS Access Key ID
aws secretsmanager create-secret \
  --name "logos-ecosystem/aws-access-key-id" \
  --description "AWS access key for S3 and SES" \
  --secret-string "your_aws_access_key_id" \
  --region us-east-1 2>/dev/null || echo "Secret aws-access-key-id already exists"

# AWS Secret Access Key
aws secretsmanager create-secret \
  --name "logos-ecosystem/aws-secret-access-key" \
  --description "AWS secret access key for S3 and SES" \
  --secret-string "your_aws_secret_access_key" \
  --region us-east-1 2>/dev/null || echo "Secret aws-secret-access-key already exists"

# Anthropic API Key
aws secretsmanager create-secret \
  --name "logos-ecosystem/anthropic-api-key" \
  --description "Anthropic Claude API key" \
  --secret-string "sk-ant-your_anthropic_api_key" \
  --region us-east-1 2>/dev/null || echo "Secret anthropic-api-key already exists"

echo "Secrets creation completed!"
echo ""
echo "IMPORTANT: Update the secret values with actual credentials using:"
echo "aws secretsmanager update-secret --secret-id logos-ecosystem/[secret-name] --secret-string 'actual-value' --region us-east-1"