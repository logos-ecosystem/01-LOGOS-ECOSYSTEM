#!/bin/bash

# LOGOS Ecosystem Backend Deployment Script
# AWS Account: 287103448174
# Profile: logos-production

set -e

echo "🚀 Starting LOGOS Ecosystem Backend Deployment"

# Configuration
AWS_PROFILE="logos-production"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="287103448174"
ECR_REPOSITORY="logos-production"
ECS_CLUSTER="logos-production-cluster"
ECS_SERVICE="logos-production-service"
TASK_DEFINITION="logos-production-task"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
AWS_IDENTITY=$(aws sts get-caller-identity --profile $AWS_PROFILE 2>&1)
if [ $? -eq 0 ]; then
    print_status "AWS credentials valid"
    echo "   Account: $(echo $AWS_IDENTITY | jq -r '.Account')"
    echo "   User: $(echo $AWS_IDENTITY | jq -r '.Arn')"
else
    print_error "AWS credentials invalid. Please configure profile: $AWS_PROFILE"
    exit 1
fi

# Verify correct account
CURRENT_ACCOUNT=$(echo $AWS_IDENTITY | jq -r '.Account')
if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
    print_error "Wrong AWS account. Expected: $AWS_ACCOUNT_ID, Got: $CURRENT_ACCOUNT"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/../backend"

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $ECR_REPOSITORY:latest .
print_status "Docker image built"

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION --profile $AWS_PROFILE | \
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
print_status "ECR login successful"

# Create ECR repository if it doesn't exist
echo "📦 Checking ECR repository..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION --profile $AWS_PROFILE 2>/dev/null || \
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION --profile $AWS_PROFILE
print_status "ECR repository ready"

# Tag and push image
echo "📤 Pushing Docker image to ECR..."
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
print_status "Docker image pushed to ECR"

# Update ECS service
echo "🚀 Updating ECS service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION \
    --profile $AWS_PROFILE

print_status "ECS service update initiated"

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION \
    --profile $AWS_PROFILE

print_status "Deployment completed successfully!"

# Get service info
echo "📊 Service Information:"
aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,TaskDefinition:taskDefinition}' \
    --output table

echo "✅ Backend deployment completed!"