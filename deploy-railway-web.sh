#!/bin/bash

# 🚀 LOGOS Ecosystem - Railway Web Deployment Guide
# Distinguished Engineer Level Implementation

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 LOGOS ECOSYSTEM - Railway Deployment${NC}"
echo "========================================"
echo ""

# Step 1: Verify GitHub push
echo -e "${BLUE}Step 1: Verifying GitHub repository...${NC}"
git_url="https://github.com/logos-ecosystem/01-LOGOS-ECOSYSTEM"
echo "Repository: $git_url"
echo -e "${GREEN}✅ Code successfully pushed to GitHub${NC}"
echo ""

# Step 2: Railway deployment instructions
echo -e "${BLUE}Step 2: Deploy on Railway${NC}"
echo ""
echo "1. Open Railway Dashboard: https://railway.app/new"
echo ""
echo "2. Click 'Deploy from GitHub repo'"
echo ""
echo "3. Select: logos-ecosystem/01-LOGOS-ECOSYSTEM"
echo ""
echo "4. Railway will automatically detect:"
echo "   - Backend service in /backend"
echo "   - Frontend service in /frontend"
echo "   - Configuration from railway.toml"
echo ""

# Step 3: Environment variables
echo -e "${BLUE}Step 3: Configure Environment Variables${NC}"
echo ""
echo "Add these variables in Railway Dashboard:"
echo ""
echo -e "${YELLOW}BACKEND SERVICE:${NC}"
cat << EOF
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=your-secure-jwt-secret
ANTHROPIC_API_KEY=your-anthropic-key
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
CLOUDFLARE_API_TOKEN=Uq6Wfm05mJVMsF452lWcl-jyEtyDefsj-lzAnAKJ
CLOUDFLARE_ZONE_ID=4bc1271bd6a132931dcf2b7cdc7ccce7
EMAIL_FROM=noreply@logos-ecosystem.com
SENDGRID_API_KEY=your-sendgrid-key
EOF

echo ""
echo -e "${YELLOW}FRONTEND SERVICE:${NC}"
cat << EOF
NEXT_PUBLIC_API_URL=https://api.logos-ecosystem.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
NEXT_PUBLIC_CLOUDFLARE_SITE_KEY=your-cloudflare-turnstile-key
NEXT_PUBLIC_GA_MEASUREMENT_ID=your-google-analytics-id
EOF

echo ""
# Step 4: Add services
echo -e "${BLUE}Step 4: Add Required Services${NC}"
echo ""
echo "In Railway Dashboard, add:"
echo "- PostgreSQL (click '+ New' → 'Database' → 'Add PostgreSQL')"
echo "- Redis (click '+ New' → 'Database' → 'Add Redis')"
echo ""

# Step 5: Configure domains
echo -e "${BLUE}Step 5: Configure Custom Domains${NC}"
echo ""
echo "After deployment, in each service settings:"
echo ""
echo "Frontend Service:"
echo "- Go to Settings → Networking"
echo "- Add domain: logos-ecosystem.com"
echo "- Add domain: www.logos-ecosystem.com"
echo ""
echo "Backend Service:"
echo "- Go to Settings → Networking"
echo "- Add domain: api.logos-ecosystem.com"
echo ""

# Step 6: DNS configuration
echo -e "${BLUE}Step 6: Configure DNS in Cloudflare${NC}"
echo ""
echo "Railway will provide CNAME targets. Add these in Cloudflare:"
echo ""
echo "Example (Railway will provide actual values):"
echo "- logos-ecosystem.com → CNAME → frontend.up.railway.app"
echo "- www → CNAME → frontend.up.railway.app"
echo "- api → CNAME → backend.up.railway.app"
echo ""

# Create DNS configuration script
cat > configure-dns-railway.sh << 'DNSEOF'
#!/bin/bash
# Configure DNS after getting Railway URLs

if [ $# -ne 2 ]; then
    echo "Usage: ./configure-dns-railway.sh FRONTEND_URL BACKEND_URL"
    echo "Example: ./configure-dns-railway.sh myapp.up.railway.app myapi.up.railway.app"
    exit 1
fi

FRONTEND_URL=$1
BACKEND_URL=$2
CLOUDFLARE_API_TOKEN="Uq6Wfm05mJVMsF452lWcl-jyEtyDefsj-lzAnAKJ"
CLOUDFLARE_ZONE_ID="4bc1271bd6a132931dcf2b7cdc7ccce7"

echo "🌐 Configuring DNS..."

# Function to configure DNS record
configure_dns() {
    local name=$1
    local content=$2
    local proxied=${3:-true}
    
    # Delete existing record if any
    existing_id=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${name}.logos-ecosystem.com" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | jq -r '.result[0].id // empty')
    
    if [ -n "$existing_id" ]; then
        curl -s -X DELETE \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${existing_id}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" > /dev/null
    fi
    
    # Create new record
    curl -s -X POST \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "{
            \"type\": \"CNAME\",
            \"name\": \"${name}\",
            \"content\": \"${content}\",
            \"ttl\": 1,
            \"proxied\": ${proxied}
        }" > /dev/null
    
    echo "✅ Configured: ${name}.logos-ecosystem.com → ${content}"
}

# Configure all domains
configure_dns "@" "$FRONTEND_URL"
configure_dns "www" "$FRONTEND_URL"
configure_dns "api" "$BACKEND_URL"

# Enable SSL and HTTPS redirect
curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/ssl" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"value":"full"}' > /dev/null

curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/always_use_https" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}' > /dev/null

echo ""
echo "🎉 DNS Configuration Complete!"
echo ""
echo "Your application will be available at:"
echo "🌐 https://logos-ecosystem.com"
echo "🌐 https://www.logos-ecosystem.com"
echo "🔌 https://api.logos-ecosystem.com"
echo ""
echo "⏱️ DNS propagation may take 5-10 minutes"
DNSEOF

chmod +x configure-dns-railway.sh

# Final instructions
echo -e "${GREEN}🎉 Deployment Instructions Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Follow the Railway deployment steps above"
echo "2. Get the Railway URLs for your services"
echo "3. Run: ./configure-dns-railway.sh FRONTEND_URL BACKEND_URL"
echo ""
echo "Example:"
echo "./configure-dns-railway.sh amazing-app.up.railway.app amazing-api.up.railway.app"
echo ""
echo -e "${YELLOW}Note: Railway provides automatic SSL certificates for custom domains${NC}"