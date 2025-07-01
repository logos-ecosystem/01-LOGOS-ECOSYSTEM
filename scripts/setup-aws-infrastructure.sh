#!/bin/bash

# AWS Infrastructure Setup Script for LOGOS Ecosystem
# This script creates all necessary AWS resources

set -e

# Configuration
AWS_PROFILE="logos-production"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="287103448174"
PROJECT_NAME="logos-ecosystem"
ENVIRONMENT="prod"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   LOGOS Ecosystem AWS Infrastructure Setup${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Function to print status
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check AWS credentials
echo -e "${YELLOW}Verifying AWS credentials...${NC}"
ACCOUNT=$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text)
if [ "$ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
    print_error "Wrong AWS account! Expected: $AWS_ACCOUNT_ID, Got: $ACCOUNT"
    exit 1
fi
print_success "AWS credentials verified"
echo ""

# Create S3 buckets
echo -e "${YELLOW}Creating S3 buckets...${NC}"
BUCKETS=(
    "$PROJECT_NAME-storage-$ENVIRONMENT"
    "$PROJECT_NAME-backups-$ENVIRONMENT"
    "$PROJECT_NAME-cloudformation-$ENVIRONMENT"
)

for bucket in "${BUCKETS[@]}"; do
    if aws s3api head-bucket --bucket "$bucket" --profile $AWS_PROFILE 2>/dev/null; then
        print_info "Bucket $bucket already exists"
    else
        aws s3api create-bucket \
            --bucket "$bucket" \
            --region $AWS_REGION \
            --profile $AWS_PROFILE \
            --create-bucket-configuration LocationConstraint=$AWS_REGION 2>/dev/null || true
        
        # Enable versioning on backup bucket
        if [[ "$bucket" == *"backups"* ]]; then
            aws s3api put-bucket-versioning \
                --bucket "$bucket" \
                --versioning-configuration Status=Enabled \
                --profile $AWS_PROFILE
        fi
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$bucket" \
            --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}' \
            --profile $AWS_PROFILE
        
        print_success "Created bucket: $bucket"
    fi
done
echo ""

# Create ECR repository
echo -e "${YELLOW}Creating ECR repository...${NC}"
REPO_NAME="$PROJECT_NAME-backend"
if aws ecr describe-repositories --repository-names $REPO_NAME --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null; then
    print_info "ECR repository $REPO_NAME already exists"
else
    aws ecr create-repository \
        --repository-name $REPO_NAME \
        --profile $AWS_PROFILE \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
    print_success "Created ECR repository: $REPO_NAME"
fi
echo ""

# Create Secrets Manager secrets
echo -e "${YELLOW}Creating Secrets Manager entries...${NC}"
SECRETS=(
    "$PROJECT_NAME/$ENVIRONMENT/database:DATABASE_URL=postgresql://user:pass@localhost:5432/db"
    "$PROJECT_NAME/$ENVIRONMENT/redis:REDIS_URL=redis://localhost:6379"
    "$PROJECT_NAME/$ENVIRONMENT/auth:JWT_SECRET=$(openssl rand -base64 32)"
    "$PROJECT_NAME/$ENVIRONMENT/stripe:STRIPE_SECRET_KEY=sk_live_xxx"
    "$PROJECT_NAME/$ENVIRONMENT/smtp:SMTP_HOST=smtp.sendgrid.net,SMTP_USER=apikey,SMTP_PASS=xxx"
    "$PROJECT_NAME/$ENVIRONMENT/ai:OPENAI_API_KEY=sk-xxx"
    "$PROJECT_NAME/$ENVIRONMENT/monitoring:SENTRY_DSN=https://xxx@sentry.io/xxx"
)

for secret_config in "${SECRETS[@]}"; do
    secret_name="${secret_config%%:*}"
    secret_value="${secret_config#*:}"
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null; then
        print_info "Secret $secret_name already exists"
    else
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "LOGOS Ecosystem $secret_name" \
            --secret-string "{\"$secret_value\"}" \
            --profile $AWS_PROFILE \
            --region $AWS_REGION
        print_success "Created secret: $secret_name"
    fi
done
echo ""

# Upload CloudFormation template
echo -e "${YELLOW}Uploading CloudFormation template...${NC}"
if [ -f "backend/aws-infrastructure.yaml" ]; then
    aws s3 cp backend/aws-infrastructure.yaml \
        s3://$PROJECT_NAME-cloudformation-$ENVIRONMENT/infrastructure.yaml \
        --profile $AWS_PROFILE
    print_success "CloudFormation template uploaded"
else
    print_error "CloudFormation template not found"
fi
echo ""

# Create CloudFormation stack
echo -e "${YELLOW}Creating CloudFormation stack...${NC}"
STACK_NAME="$PROJECT_NAME-$ENVIRONMENT-stack"

if aws cloudformation describe-stacks --stack-name $STACK_NAME --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null; then
    print_info "CloudFormation stack $STACK_NAME already exists"
    echo "To update the stack, run:"
    echo "aws cloudformation update-stack --stack-name $STACK_NAME --template-url https://s3.amazonaws.com/$PROJECT_NAME-cloudformation-$ENVIRONMENT/infrastructure.yaml --capabilities CAPABILITY_IAM --profile $AWS_PROFILE"
else
    echo "Creating CloudFormation stack..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-url https://s3.amazonaws.com/$PROJECT_NAME-cloudformation-$ENVIRONMENT/infrastructure.yaml \
        --parameters \
            ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME \
            ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
            ParameterKey=DatabasePassword,ParameterValue=$(openssl rand -base64 32) \
        --capabilities CAPABILITY_IAM \
        --profile $AWS_PROFILE \
        --region $AWS_REGION
    
    print_success "CloudFormation stack creation initiated"
    echo ""
    echo "Monitor stack creation:"
    echo "aws cloudformation describe-stacks --stack-name $STACK_NAME --profile $AWS_PROFILE"
fi

echo ""
echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}Infrastructure setup completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for CloudFormation stack to complete (~15-20 minutes)"
echo "2. Update secrets in AWS Secrets Manager with real values"
echo "3. Run database migrations"
echo "4. Deploy the application using ./scripts/deploy-backend.sh"
echo ""
echo "Useful commands:"
echo "- Check stack status: aws cloudformation describe-stacks --stack-name $STACK_NAME --profile $AWS_PROFILE"
echo "- View stack outputs: aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs' --profile $AWS_PROFILE"
echo "- Update secrets: aws secretsmanager update-secret --secret-id SECRET_NAME --secret-string 'NEW_VALUE' --profile $AWS_PROFILE"
echo -e "${BLUE}===============================================${NC}"