#!/bin/bash

# LOGOS ECOSYSTEM - Quick Deployment Test

echo "🧪 LOGOS ECOSYSTEM - DEPLOYMENT VERIFICATION"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get latest deployment URLs
echo "📋 Finding deployment URLs..."
echo ""

# Frontend URLs
FRONTEND_URL="https://frontend-ckhxcllxt-juan-jaureguis-projects.vercel.app"
LOGOS_URL="https://logos-ecosystem.com"
WWW_URL="https://www.logos-ecosystem.com"

echo "=== FRONTEND TESTS ==="
echo ""

# Test main deployment
echo -n "Testing main deployment... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - HTTP $STATUS"
else
    echo -e "${RED}❌ FAIL${NC} - HTTP $STATUS"
fi

# Test custom domain
echo -n "Testing logos-ecosystem.com... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$LOGOS_URL" || echo "000")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - HTTP $STATUS"
else
    echo -e "${RED}❌ FAIL${NC} - HTTP $STATUS"
fi

# Test www domain
echo -n "Testing www.logos-ecosystem.com... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WWW_URL" || echo "000")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - HTTP $STATUS"
else
    echo -e "${RED}❌ FAIL${NC} - HTTP $STATUS"
fi

echo ""
echo "=== ENVIRONMENT VARIABLES ==="
echo ""

cd frontend 2>/dev/null
echo "Configured variables:"
vercel env ls 2>/dev/null | grep NEXT_PUBLIC_ || echo "No variables found"
cd .. 2>/dev/null

echo ""
echo "=== DNS STATUS ==="
echo ""

echo "DNS Resolution:"
echo -n "  logos-ecosystem.com -> "
dig +short logos-ecosystem.com | head -1 || echo "Not resolving"
echo -n "  www.logos-ecosystem.com -> "
dig +short www.logos-ecosystem.com | head -1 || echo "Not resolving"

echo ""
echo "=== API STATUS ==="
echo ""

# Test API endpoints
API_URL="https://api.logos-ecosystem.com"
echo -n "Testing API health... "
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - HTTP $API_STATUS"
else
    echo -e "${YELLOW}⚠️  NOT AVAILABLE${NC} - HTTP $API_STATUS (Backend may not be deployed)"
fi

echo ""
echo "=== DEPLOYMENT ALIASES ==="
echo ""
cd frontend 2>/dev/null && vercel alias ls | grep -E "logos-ecosystem|frontend" | head -5
cd .. 2>/dev/null

echo ""
echo "=== SUMMARY ==="
echo ""
echo -e "${BLUE}Frontend Deployment:${NC} $FRONTEND_URL"
echo -e "${BLUE}Custom Domain:${NC} $LOGOS_URL"
echo -e "${BLUE}Latest Update:${NC} $(date)"
echo ""
echo -e "${YELLOW}💡 To update deployment: cd frontend && vercel --prod${NC}"
echo -e "${YELLOW}💡 To check logs: cd frontend && vercel logs${NC}"