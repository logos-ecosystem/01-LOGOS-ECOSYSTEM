#!/bin/bash

echo "🔧 Fixing LOGOS ECOSYSTEM Domain Deployment"
echo "=========================================="
echo ""

cd frontend

# Remove old .vercel config
rm -rf .vercel

# Create proper vercel.json
cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install --legacy-peer-deps",
  "public": false,
  "regions": ["iad1"]
}
EOF

# Deploy to production
echo "Deploying to production..."
vercel --prod --yes --no-clipboard

echo ""
echo "Deployment complete. Checking status..."
sleep 5

# Test URLs
echo ""
echo "Testing URLs:"
curl -s -o /dev/null -w "Direct deployment: HTTP %{http_code}\n" $(vercel ls --json 2>/dev/null | grep -o '"url":"[^"]*' | head -1 | cut -d'"' -f4) 2>/dev/null || echo "Direct URL check skipped"
curl -s -o /dev/null -w "logos-ecosystem.com: HTTP %{http_code}\n" https://logos-ecosystem.com
curl -s -o /dev/null -w "www.logos-ecosystem.com: HTTP %{http_code}\n" https://www.logos-ecosystem.com

echo ""
echo "✅ Deployment complete!"