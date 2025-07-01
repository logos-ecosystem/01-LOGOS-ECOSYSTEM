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
