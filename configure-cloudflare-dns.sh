#!/bin/bash

# 🌐 Cloudflare DNS Configuration Script
# Configures DNS records for logos-ecosystem.com

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
CLOUDFLARE_API_TOKEN="Uq6Wfm05mJVMsF452lWcl-jyEtyDefsj-lzAnAKJ"
CLOUDFLARE_ZONE_ID="4bc1271bd6a132931dcf2b7cdc7ccce7"
DOMAIN="logos-ecosystem.com"

echo -e "${GREEN}🌐 Configuring Cloudflare DNS for ${DOMAIN}${NC}"
echo "================================================"
echo ""

# Function to create/update DNS record
update_dns_record() {
    local name=$1
    local content=$2
    local type=${3:-CNAME}
    local proxied=${4:-true}
    
    echo -e "${BLUE}Configuring DNS record: ${name}${NC}"
    
    # Check if record exists
    local record_id=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${name}.${DOMAIN}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" | jq -r '.result[0].id // empty')
    
    if [[ -n "$record_id" ]]; then
        # Update existing record
        response=$(curl -s -X PUT \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record_id}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data '{
                "type": "'${type}'",
                "name": "'${name}'",
                "content": "'${content}'",
                "ttl": 1,
                "proxied": '${proxied}'
            }')
        echo -e "${GREEN}✅ Updated DNS record: ${name}${NC}"
    else
        # Create new record
        response=$(curl -s -X POST \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data '{
                "type": "'${type}'",
                "name": "'${name}'",
                "content": "'${content}'",
                "ttl": 1,
                "proxied": '${proxied}'
            }')
        echo -e "${GREEN}✅ Created DNS record: ${name}${NC}"
    fi
}

# Get Railway domains (you'll need to update these with actual Railway domains)
echo -e "${YELLOW}⚠️  Please provide your Railway domains:${NC}"
echo ""
echo "1. Go to https://railway.app"
echo "2. Find your project"
echo "3. Get the domain for each service"
echo ""
read -p "Enter your Frontend Railway domain (e.g., xxx.railway.app): " FRONTEND_RAILWAY_DOMAIN
read -p "Enter your Backend Railway domain (e.g., yyy.railway.app): " BACKEND_RAILWAY_DOMAIN

# Configure DNS records
echo ""
echo -e "${BLUE}Configuring DNS records...${NC}"

# Root domain
update_dns_record "@" "${FRONTEND_RAILWAY_DOMAIN}" "CNAME" true

# www subdomain
update_dns_record "www" "${DOMAIN}" "CNAME" true

# API subdomain
update_dns_record "api" "${BACKEND_RAILWAY_DOMAIN}" "CNAME" true

# Configure SSL/TLS settings
echo ""
echo -e "${BLUE}Configuring SSL/TLS settings...${NC}"

# Set SSL mode to Full
curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/ssl" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"value":"full"}' > /dev/null
echo -e "${GREEN}✅ SSL mode set to Full${NC}"

# Enable Always Use HTTPS
curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/always_use_https" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}' > /dev/null
echo -e "${GREEN}✅ Always Use HTTPS enabled${NC}"

# Enable Automatic HTTPS Rewrites
curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/automatic_https_rewrites" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}' > /dev/null
echo -e "${GREEN}✅ Automatic HTTPS Rewrites enabled${NC}"

echo ""
echo -e "${GREEN}🎉 DNS Configuration Complete!${NC}"
echo ""
echo "Your domains will be accessible at:"
echo "  🌐 https://logos-ecosystem.com"
echo "  🌐 https://www.logos-ecosystem.com"
echo "  🔌 https://api.logos-ecosystem.com"
echo ""
echo -e "${YELLOW}Note: DNS propagation may take 5-10 minutes${NC}"
echo ""
echo "Next steps:"
echo "1. Add custom domains in Railway dashboard"
echo "2. Wait for SSL certificates to provision"
echo "3. Run: ./test-railway-deployment.sh"