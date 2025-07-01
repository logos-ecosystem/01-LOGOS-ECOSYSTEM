#!/bin/bash

# Test Railway Token
echo "Testing Railway token..."

export RAILWAY_TOKEN="8157f7ec-3fdd-4430-8bd4-70742dd5cd10"

# Test with curl directly to Railway API
echo "Testing Railway API v2..."
curl -H "Authorization: Bearer ${RAILWAY_TOKEN}" \
     -H "Content-Type: application/json" \
     https://backboard.railway.app/graphql/v2 \
     -d '{"query":"query { me { email } }"}' 2>/dev/null | jq .

echo ""
echo "Testing with Railway CLI..."
railway whoami