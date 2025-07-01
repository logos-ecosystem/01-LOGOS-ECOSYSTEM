#!/bin/bash

# Pre-deployment check script for LOGOS Ecosystem
# This script verifies all services are accessible before deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
AWS_PROFILE="logos-production"
AWS_ACCOUNT_ID="287103448174"
GIT_EMAIL="logos-ecosystem@gmail.com"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   LOGOS Ecosystem Pre-Deployment Check${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Function to print results
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check required tools
echo -e "${YELLOW}Checking required tools...${NC}"
TOOLS=("aws" "vercel" "git" "docker" "npm" "node")
for tool in "${TOOLS[@]}"; do
    if command -v $tool &> /dev/null; then
        version=$($tool --version 2>&1 | head -n 1)
        print_success "$tool installed: $version"
    else
        print_error "$tool not installed"
        exit 1
    fi
done
echo ""

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
AWS_IDENTITY=$(aws sts get-caller-identity --profile $AWS_PROFILE 2>&1)
if [ $? -eq 0 ]; then
    ACCOUNT=$(echo $AWS_IDENTITY | jq -r '.Account')
    USER=$(echo $AWS_IDENTITY | jq -r '.Arn' | cut -d'/' -f2)
    if [ "$ACCOUNT" == "$AWS_ACCOUNT_ID" ]; then
        print_success "AWS Profile: $AWS_PROFILE"
        print_success "AWS Account: $ACCOUNT ✓"
        print_success "AWS User: $USER"
    else
        print_error "Wrong AWS account! Expected: $AWS_ACCOUNT_ID, Got: $ACCOUNT"
        print_info "Switch to correct profile: export AWS_PROFILE=logos-production"
        exit 1
    fi
else
    print_error "AWS credentials not configured"
    print_info "Configure with: aws configure --profile logos-production"
    exit 1
fi
echo ""

# Check Git configuration
echo -e "${YELLOW}Checking Git configuration...${NC}"
GIT_USER=$(git config --global user.name)
GIT_EMAIL_CURRENT=$(git config --global user.email)
if [ -n "$GIT_USER" ] && [ -n "$GIT_EMAIL_CURRENT" ]; then
    print_success "Git User: $GIT_USER"
    if [ "$GIT_EMAIL_CURRENT" == "$GIT_EMAIL" ]; then
        print_success "Git Email: $GIT_EMAIL_CURRENT ✓"
    else
        print_warning "Git Email: $GIT_EMAIL_CURRENT (Expected: $GIT_EMAIL)"
        print_info "Update with: git config --global user.email '$GIT_EMAIL'"
    fi
else
    print_error "Git not configured"
    print_info "Configure with:"
    print_info "  git config --global user.name 'LOGOS Ecosystem'"
    print_info "  git config --global user.email '$GIT_EMAIL'"
fi

# Check Git repository
if [ -d .git ]; then
    REMOTE=$(git remote get-url origin 2>/dev/null || echo "Not set")
    print_success "Git repository initialized"
    print_info "Remote: $REMOTE"
else
    print_warning "Git repository not initialized"
fi
echo ""

# Check Vercel login
echo -e "${YELLOW}Checking Vercel authentication...${NC}"
VERCEL_USER=$(vercel whoami 2>&1)
if [ $? -eq 0 ]; then
    print_success "Vercel authenticated as: $VERCEL_USER"
else
    print_warning "Vercel not authenticated"
    print_info "Login with: vercel login"
fi
echo ""

# Check Docker
echo -e "${YELLOW}Checking Docker...${NC}"
if docker info &> /dev/null; then
    print_success "Docker daemon running"
else
    print_error "Docker daemon not running"
    print_info "Start Docker Desktop or run: sudo systemctl start docker"
fi
echo ""

# Check environment files
echo -e "${YELLOW}Checking environment files...${NC}"
ENV_FILES=(
    "backend/.env"
    "frontend/.env.local"
)
for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        print_success "$env_file exists"
    else
        print_warning "$env_file missing"
        if [ -f "${env_file}.example" ]; then
            print_info "Copy from: cp ${env_file}.example $env_file"
        fi
    fi
done
echo ""

# Check AWS services availability
echo -e "${YELLOW}Checking AWS services...${NC}"
# Check ECR
aws ecr describe-repositories --profile $AWS_PROFILE --region us-east-1 &> /dev/null
if [ $? -eq 0 ]; then
    print_success "ECR accessible"
else
    print_warning "ECR not accessible or not configured"
fi

# Check ECS
aws ecs list-clusters --profile $AWS_PROFILE --region us-east-1 &> /dev/null
if [ $? -eq 0 ]; then
    print_success "ECS accessible"
else
    print_warning "ECS not accessible or not configured"
fi
echo ""

# Summary
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}Summary:${NC}"
echo ""

# Create checklist
READY=true
echo "Pre-deployment checklist:"
echo ""

# AWS
if [ "$ACCOUNT" == "$AWS_ACCOUNT_ID" ]; then
    echo "  ✓ AWS configured with correct account"
else
    echo "  ✗ AWS account mismatch"
    READY=false
fi

# Git
if [ "$GIT_EMAIL_CURRENT" == "$GIT_EMAIL" ]; then
    echo "  ✓ Git configured with correct email"
else
    echo "  ⚠ Git email should be updated"
fi

# Vercel
if [ $? -eq 0 ]; then
    echo "  ✓ Vercel authenticated"
else
    echo "  ⚠ Vercel authentication needed"
fi

# Docker
if docker info &> /dev/null; then
    echo "  ✓ Docker running"
else
    echo "  ✗ Docker not running"
    READY=false
fi

echo ""

if [ "$READY" = true ]; then
    echo -e "${GREEN}✅ System ready for deployment!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review and update environment variables"
    echo "2. Run database migrations: cd backend && npm run migrate:deploy"
    echo "3. Deploy backend: ./scripts/deploy-backend.sh"
    echo "4. Deploy frontend: cd frontend && vercel --prod"
else
    echo -e "${RED}❌ System not ready. Please fix the issues above.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}===============================================${NC}"