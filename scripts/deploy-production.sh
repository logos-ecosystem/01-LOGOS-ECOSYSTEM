#!/bin/bash

# LOGOS Ecosystem - Production Deployment Script
# ✅ Con todas las credenciales configuradas

set -e

echo "🚀 LOGOS Ecosystem - Production Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the LOGOS-ECOSYSTEM root directory"
    exit 1
fi

# Step 1: Copy production environment files
echo ""
echo "📋 Step 1: Setting up environment files..."
cp backend/.env.production.ready backend/.env
print_success "Backend .env configured"

cp frontend/.env.production.ready frontend/.env.local
print_success "Frontend .env configured"

# Step 2: Test database connection
echo ""
echo "🗄️  Step 2: Testing database connection..."
PGPASSWORD=Logossolar_admin_777 psql \
  -h logos-production-db.ckb0s0mgunv0.us-east-1.rds.amazonaws.com \
  -U logos_admin \
  -d logos_production \
  -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_success "Database connection successful"
else
    print_error "Database connection failed"
    exit 1
fi

# Step 3: Run database migrations
echo ""
echo "📊 Step 3: Running database migrations..."
cd backend
npm install --quiet
DATABASE_URL="postgresql://logos_admin:Logossolar_admin_777@logos-production-db.ckb0s0mgunv0.us-east-1.rds.amazonaws.com:5432/logos_production?schema=public&sslmode=require" \
  npx prisma migrate deploy

print_success "Database migrations completed"

# Optional: Seed database (only on first deployment)
read -p "Do you want to seed the database? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    DATABASE_URL="postgresql://logos_admin:Logossolar_admin_777@logos-production-db.ckb0s0mgunv0.us-east-1.rds.amazonaws.com:5432/logos_production?schema=public&sslmode=require" \
      npm run prisma:seed
    print_success "Database seeded"
fi

# Step 4: Build and deploy backend
echo ""
echo "🐳 Step 4: Building and deploying backend..."
cd ..

# Build Docker image
docker build -t logos-production:latest ./backend
print_success "Docker image built"

# Login to ECR
aws ecr get-login-password --region us-east-1 --profile logos-production | \
  docker login --username AWS --password-stdin 287103448174.dkr.ecr.us-east-1.amazonaws.com
print_success "ECR login successful"

# Tag and push
docker tag logos-production:latest 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest
docker push 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest
print_success "Docker image pushed to ECR"

# Update ECS service
echo "Updating ECS service..."
aws ecs update-service \
  --cluster logos-production-cluster \
  --service logos-production-service \
  --force-new-deployment \
  --profile logos-production \
  --region us-east-1

print_success "ECS service update initiated"

# Step 5: Get Load Balancer URL
echo ""
echo "🔍 Step 5: Getting Load Balancer URL..."
ALB_URL=$(aws elbv2 describe-load-balancers \
  --profile logos-production \
  --region us-east-1 \
  --query "LoadBalancers[?contains(LoadBalancerName, 'logos')].DNSName" \
  --output text)

if [ -n "$ALB_URL" ]; then
    print_success "Backend URL: https://$ALB_URL"
else
    print_warning "Could not find Load Balancer URL"
fi

# Step 6: Deploy frontend to Vercel
echo ""
echo "🌐 Step 6: Deploying frontend to Vercel..."
cd frontend

# Install dependencies
npm install --quiet

# Set Vercel environment variables
print_warning "Setting Vercel environment variables..."
vercel env add NEXT_PUBLIC_API_URL production --force <<< "https://$ALB_URL"
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production --force <<< "pk_test_51RaDNFR452PkkFcmR6MA3fj3iRLq93pxyUPKZphkcAxEhxgemrNCQxz88rh2RIQT5eGnPr8hEWtsl8a96iGGgUhJ00iGXmKqxb"
vercel env add NEXT_PUBLIC_PAYPAL_CLIENT_ID production --force <<< "ATBj6N9mVxmnb_K_kD22oruRwdRbNCEumxeqEkcjBWnKs6F1USSLYgNOWqxMjABUh_9RwOFGkpCck73U"

# Deploy to Vercel
vercel --prod --yes
print_success "Frontend deployed to Vercel"

# Step 7: Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Deployment Completed Successfully!${NC}"
echo "=========================================="
echo ""
echo "📌 Important URLs:"
echo "   Frontend: https://logos-ecosystem.vercel.app"
echo "   Backend API: https://$ALB_URL"
echo ""
echo "📋 Next Steps:"
echo "1. Configure custom domain in Vercel"
echo "2. Update DNS records:"
echo "   - A record: @ → Vercel IP"
echo "   - CNAME: www → cname.vercel-dns.com"
echo "   - CNAME: api → $ALB_URL"
echo "3. Configure Stripe webhook endpoint"
echo "4. Test all functionality"
echo ""
echo "🔒 Security Reminders:"
echo "- Remove .env files with credentials"
echo "- Rotate AWS access keys regularly"
echo "- Enable 2FA on all accounts"
echo "- Monitor costs and usage"
echo ""
print_success "Happy launching! 🎉"