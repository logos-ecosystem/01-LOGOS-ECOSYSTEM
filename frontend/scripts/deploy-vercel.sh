#!/bin/bash

# Vercel deployment script with proper configuration
echo "Starting Vercel deployment..."

# Ensure we're in the frontend directory
cd /home/juan/Claude/LOGOS-ECOSYSTEM/frontend

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf .next
rm -rf .vercel

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build the project
echo "Building project..."
NODE_ENV=production npm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod --yes

echo "Deployment complete!"