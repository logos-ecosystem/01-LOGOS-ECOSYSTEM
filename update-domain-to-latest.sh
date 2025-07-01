#!/bin/bash

# Script to update logos-ecosystem.com to the latest deployment

echo "🔄 Updating logos-ecosystem.com to latest deployment..."
echo ""

cd frontend

# Get the latest production deployment URL
LATEST_DEPLOYMENT=$(vercel ls | grep "Production" | head -1 | awk '{print $2}')
echo "Latest deployment: $LATEST_DEPLOYMENT"

# Since the domain is owned by the 'frontend' project, we need to:
# 1. Deploy our code to the frontend project
# 2. Or transfer the domain to logos-ecosystem project

echo ""
echo "The domain logos-ecosystem.com is currently assigned to the 'frontend' project."
echo ""
echo "Options:"
echo "1. Deploy your code to the 'frontend' project (recommended)"
echo "2. Transfer the domain from 'frontend' to 'logos-ecosystem' project"
echo ""
echo "To deploy to frontend project:"
echo "  rm -rf .vercel"
echo "  vercel --name frontend --prod"
echo ""
echo "Current status:"
echo "- Latest logos-ecosystem deployment: $LATEST_DEPLOYMENT"
echo "- Domain owner: frontend project"
echo "- Domain points to: frontend-ckhxcllxt-juan-jaureguis-projects.vercel.app"

# Check domain status
echo ""
echo "Domain Configuration:"
vercel domains inspect logos-ecosystem.com 2>/dev/null || echo "Domain is in another project"