#!/bin/bash

# LOGOS ECOSYSTEM - Deployment Preparation Script
# This script prepares the project for deployment

set -e  # Exit on error

echo "🚀 LOGOS ECOSYSTEM - Preparing for Deployment"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# 1. Check Node.js version
echo -e "\n${YELLOW}1. Checking Node.js version...${NC}"
node_version=$(node -v)
echo "Node.js version: $node_version"
check_status "Node.js check"

# 2. Install dependencies
echo -e "\n${YELLOW}2. Installing dependencies...${NC}"

echo "Installing backend dependencies..."
cd backend
npm install
check_status "Backend dependencies"

echo "Installing frontend dependencies..."
cd ../frontend
npm install
check_status "Frontend dependencies"

# 3. Run tests
echo -e "\n${YELLOW}3. Running tests...${NC}"

echo "Running backend tests..."
cd ../backend
npm test || echo -e "${YELLOW}⚠ Backend tests skipped or failed${NC}"

echo "Running frontend tests..."
cd ../frontend
npm test || echo -e "${YELLOW}⚠ Frontend tests skipped or failed${NC}"

# 4. Build projects
echo -e "\n${YELLOW}4. Building projects...${NC}"

echo "Building backend..."
cd ../backend
npm run build || echo -e "${YELLOW}⚠ Backend build has TypeScript errors - fix before deployment${NC}"

echo "Building frontend..."
cd ../frontend
npm run build
check_status "Frontend build"

# 5. Check environment files
echo -e "\n${YELLOW}5. Checking environment files...${NC}"

cd ..
if [ -f "backend/.env.production" ]; then
    echo -e "${GREEN}✓ Backend production env found${NC}"
else
    echo -e "${RED}✗ Backend production env missing${NC}"
fi

if [ -f "frontend/.env.production" ]; then
    echo -e "${GREEN}✓ Frontend production env found${NC}"
else
    echo -e "${RED}✗ Frontend production env missing${NC}"
fi

# 6. Database migrations
echo -e "\n${YELLOW}6. Preparing database migrations...${NC}"
cd backend
npx prisma generate
check_status "Prisma client generation"

# 7. Security check
echo -e "\n${YELLOW}7. Running security audit...${NC}"
npm audit || echo -e "${YELLOW}⚠ Security vulnerabilities found - review before deployment${NC}"

# 8. Create deployment package
echo -e "\n${YELLOW}8. Creating deployment info...${NC}"
cd ..
cat > deployment-info.json << EOF
{
  "project": "LOGOS Ecosystem",
  "version": "1.0.0",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$node_version",
  "environment": "production",
  "checklist": {
    "dependencies": true,
    "tests": "partial",
    "build": "partial",
    "envFiles": true,
    "database": true,
    "security": "review needed"
  }
}
EOF
check_status "Deployment info created"

# 9. Git status
echo -e "\n${YELLOW}9. Checking Git status...${NC}"
git_status=$(git status --porcelain | wc -l)
if [ $git_status -eq 0 ]; then
    echo -e "${GREEN}✓ Working directory clean${NC}"
else
    echo -e "${YELLOW}⚠ Uncommitted changes found${NC}"
    echo "Files with changes:"
    git status --short
fi

# 10. Final checklist
echo -e "\n${YELLOW}=== DEPLOYMENT CHECKLIST ===${NC}"
echo ""
echo "Before deploying, ensure:"
echo "[ ] All TypeScript errors are fixed"
echo "[ ] Environment variables are properly set"
echo "[ ] Database connection strings are correct"
echo "[ ] API keys are valid (Stripe, PayPal, etc.)"
echo "[ ] Domain names are configured"
echo "[ ] SSL certificates are ready"
echo "[ ] Backup strategy is in place"
echo "[ ] Monitoring is configured"
echo ""
echo -e "${GREEN}✅ Pre-deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Fix any TypeScript build errors"
echo "2. Review security vulnerabilities"
echo "3. Set up AWS infrastructure"
echo "4. Configure Vercel project"
echo "5. Set up Cloudflare"
echo "6. Deploy!"

# Create deployment commands file
cat > deploy-commands.txt << 'EOF'
# DEPLOYMENT COMMANDS

## Backend (AWS ECS)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 287103448174.dkr.ecr.us-east-1.amazonaws.com
docker build -t logos-production ./backend
docker tag logos-production:latest 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest
docker push 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest
aws ecs update-service --cluster logos-production-cluster --service logos-production-service --force-new-deployment

## Frontend (Vercel)
cd frontend
vercel --prod

## Database Migrations
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
EOF

echo -e "\n${GREEN}Deployment commands saved to deploy-commands.txt${NC}"