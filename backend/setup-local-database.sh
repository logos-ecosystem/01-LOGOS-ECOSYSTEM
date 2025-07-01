#!/bin/bash

# Local database setup script for LOGOS ECOSYSTEM development
# This script sets up PostgreSQL and Redis locally for development

set -e

echo "🚀 Setting up LOGOS ECOSYSTEM Local Development Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed!${NC}"
    echo "Please install PostgreSQL first:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "  macOS: brew install postgresql"
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}Redis is not installed. Installing...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y redis-server
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install redis
    fi
fi

# Start PostgreSQL service
echo -e "${YELLOW}Starting PostgreSQL service...${NC}"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start postgresql
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql
fi

# Start Redis service
echo -e "${YELLOW}Starting Redis service...${NC}"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start redis
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start redis
fi

# Create database
echo -e "${YELLOW}Creating PostgreSQL database...${NC}"
sudo -u postgres psql <<EOF
-- Create user if not exists
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_user
      WHERE  usename = 'postgres') THEN
      CREATE USER postgres WITH PASSWORD 'postgres';
   END IF;
END
\$do\$;

-- Grant privileges
ALTER USER postgres CREATEDB;

-- Create database
DROP DATABASE IF EXISTS logos_dev;
CREATE DATABASE logos_dev;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE logos_dev TO postgres;
EOF

echo -e "${GREEN}✅ PostgreSQL database created${NC}"

# Use local environment variables
cp .env.local .env

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npx prisma migrate dev --name init

# Seed database with initial data
echo -e "${YELLOW}Seeding database...${NC}"
npx tsx src/utils/seed.ts

# Create database indexes for performance
echo -e "${YELLOW}Creating additional indexes...${NC}"
npx tsx scripts/create-indexes.ts

echo -e "${GREEN}✅ Local database setup completed successfully!${NC}"
echo ""
echo "Database connection: postgresql://postgres:postgres@localhost:5432/logos_dev"
echo "Redis connection: redis://localhost:6379"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. The API will be available at http://localhost:8080"
echo "3. Check http://localhost:8080/health for health status"