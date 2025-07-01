#!/bin/bash

# 🚀 Deploy to Railway - Immediate Start
# This script uses Railway CLI login for immediate deployment

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 LOGOS ECOSYSTEM - Railway Deployment${NC}"
echo "========================================"
echo ""

# Step 1: Railway Login
echo -e "${YELLOW}Step 1: Railway Authentication${NC}"
echo "This will open your browser to log in to Railway."
echo "Press Enter to continue..."
read

railway login

echo -e "${GREEN}✅ Railway authenticated!${NC}"
echo ""

# Step 2: Create/Link Project
echo -e "${BLUE}Step 2: Setting up Railway project...${NC}"
railway init -n "logos-ecosystem" || echo "Project may already exist, continuing..."

# Step 3: Deploy Services
echo -e "${BLUE}Step 3: Deploying services...${NC}"
echo ""

# Deploy Backend
echo "Deploying backend..."
cd backend
railway up --detach
cd ..

# Deploy Frontend  
echo "Deploying frontend..."
cd frontend
railway up --detach
cd ..

echo ""
echo -e "${GREEN}✅ Services deployed!${NC}"
echo ""

# Step 4: Get URLs
echo -e "${BLUE}Step 4: Getting service URLs...${NC}"
railway status

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Go to Railway dashboard: https://railway.app"
echo "2. Add custom domains:"
echo "   - Frontend: logos-ecosystem.com"
echo "   - Backend: api.logos-ecosystem.com"
echo "3. Configure environment variables in Railway dashboard"
echo "4. Run DNS configuration script"
echo ""
echo -e "${GREEN}Your deployment is in progress!${NC}"