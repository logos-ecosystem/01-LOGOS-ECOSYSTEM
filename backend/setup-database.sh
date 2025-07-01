#!/bin/bash

# Database setup script for LOGOS ECOSYSTEM
# This script sets up PostgreSQL database with proper configurations

set -e

echo "🚀 Setting up LOGOS ECOSYSTEM Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file with DATABASE_URL"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env file!${NC}"
    echo "Example: DATABASE_URL=postgresql://user:password@localhost:5432/logos_ecosystem"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npx prisma migrate deploy

# Seed database with initial data
echo -e "${YELLOW}Seeding database...${NC}"
npx tsx src/utils/seed.ts

# Create database indexes for performance
echo -e "${YELLOW}Creating additional indexes...${NC}"
npx tsx scripts/create-indexes.ts

echo -e "${GREEN}✅ Database setup completed successfully!${NC}"
echo ""
echo "Database is ready at: $DATABASE_URL"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Run 'npm run build' to build for production"
echo "3. Run 'npm start' to start the production server"