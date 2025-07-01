#!/bin/bash

# LOGOS ECOSYSTEM - Master Systems Engineer Solution
# Complete deployment fix with all configurations

set -e

echo "🚀 MASTER DEPLOYMENT SOLUTION FOR LOGOS ECOSYSTEM"
echo "================================================"
echo "Executing complete deployment fix..."
echo ""

# Navigate to frontend
cd frontend

# Step 1: Remove ALL Vercel configurations
echo "1️⃣ Cleaning all Vercel configurations..."
rm -rf .vercel
rm -f vercel.json

# Step 2: Create NEW vercel.json with all required settings
echo "2️⃣ Creating optimized vercel.json..."
cat > vercel.json << 'EOF'
{
  "version": 2,
  "framework": "nextjs",
  "public": true,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
EOF

# Step 3: Create .vercelignore
echo "3️⃣ Creating .vercelignore..."
cat > .vercelignore << 'EOF'
.git
.next
node_modules
*.log
.env.local
.env.development
README.md
.vscode
.idea
EOF

# Step 4: Ensure package.json has correct scripts
echo "4️⃣ Verifying package.json scripts..."
if ! grep -q '"build":' package.json; then
    echo "ERROR: Build script missing in package.json"
    exit 1
fi

# Step 5: Install dependencies
echo "5️⃣ Installing dependencies..."
npm install --legacy-peer-deps --silent

# Step 6: Build locally first to ensure it works
echo "6️⃣ Testing build locally..."
npm run build

# Step 7: Deploy with explicit configuration
echo "7️⃣ Deploying to Vercel..."
echo ""

# Deploy with all flags to avoid prompts
vercel deploy --prod \
  --yes \
  --public \
  --no-clipboard \
  --env NODE_ENV=production \
  --build-env NODE_ENV=production \
  --meta GIT_COMMIT_SHA=$(git rev-parse HEAD) \
  --meta GIT_COMMIT_MESSAGE="$(git log -1 --pretty=%B)" \
  --regions iad1 \
  --confirm \
  2>&1 | tee deployment.log

# Extract deployment URL
DEPLOYMENT_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' deployment.log | tail -1)

echo ""
echo "8️⃣ Setting up domain aliases..."

# Force set aliases
if [ -n "$DEPLOYMENT_URL" ]; then
    vercel alias set $DEPLOYMENT_URL logos-ecosystem.com --yes 2>/dev/null || true
    vercel alias set $DEPLOYMENT_URL www.logos-ecosystem.com --yes 2>/dev/null || true
fi

# Step 8: Final verification
echo ""
echo "9️⃣ Final verification..."
sleep 10

# Test all endpoints
echo ""
echo "📊 DEPLOYMENT RESULTS:"
echo "====================="
echo ""

test_endpoint() {
    local name=$1
    local url=$2
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "ERROR")
    
    if [ "$status" = "200" ]; then
        echo "✅ $name: $status OK"
    else
        echo "❌ $name: $status"
    fi
}

test_endpoint "Deployment URL" "${DEPLOYMENT_URL:-https://frontend-juan-jaureguis-projects.vercel.app}"
test_endpoint "logos-ecosystem.com" "https://logos-ecosystem.com"
test_endpoint "www.logos-ecosystem.com" "https://www.logos-ecosystem.com"
test_endpoint "API Backend" "https://api.logos-ecosystem.com/health"

echo ""
echo "📝 DEPLOYMENT SUMMARY:"
echo "===================="
echo "Deployment URL: ${DEPLOYMENT_URL:-Check manually}"
echo "Timestamp: $(date)"
echo ""

# Create final status script
cd ..
cat > deployment-status.sh << 'EOF'
#!/bin/bash
echo "🔍 LOGOS ECOSYSTEM Status"
echo "========================"
echo ""
echo "Checking all endpoints..."
echo ""
curl -s -o /dev/null -w "Frontend (Direct): %{http_code} - %{url_effective}\n" https://frontend-juan-jaureguis-projects.vercel.app
curl -s -o /dev/null -w "logos-ecosystem.com: %{http_code}\n" https://logos-ecosystem.com
curl -s -o /dev/null -w "www.logos-ecosystem.com: %{http_code}\n" https://www.logos-ecosystem.com
curl -s -o /dev/null -w "API Backend: %{http_code}\n" https://api.logos-ecosystem.com/health
echo ""
echo "Latest deployments:"
cd frontend && vercel ls | head -5
EOF

chmod +x deployment-status.sh

echo "💡 IMPORTANT NOTES:"
echo "=================="
echo ""
echo "If domains still show 404, you need to:"
echo "1. Go to: https://vercel.com/juan-jaureguis-projects/frontend/settings"
echo "2. Check 'Deployment Protection' settings"
echo "3. Ensure 'Vercel Authentication' is DISABLED"
echo "4. Or add logos-ecosystem.com to 'Allowed Domains'"
echo ""
echo "Run './deployment-status.sh' to check status"
echo ""
echo "✅ Master deployment solution completed!"