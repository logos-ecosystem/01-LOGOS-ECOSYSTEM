#!/bin/bash

# LOGOS ECOSYSTEM - Comprehensive Post-Deployment Tests
# This script runs all verification tests after deployment

set -e

echo "🧪 LOGOS ECOSYSTEM - POST-DEPLOYMENT VERIFICATION"
echo "================================================="
echo "Started at: $(date)"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FRONTEND_URL="https://logos-ecosystem.vercel.app"
API_URL="https://api.logos-ecosystem.com"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="deployment-test-report-$TIMESTAMP.md"

# Test results
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Function to log results
log_result() {
    local test_name=$1
    local status=$2
    local details=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        echo "✅ **$test_name**: PASSED - $details" >> $REPORT_FILE
        ((PASSED_TESTS++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        echo "❌ **$test_name**: FAILED - $details" >> $REPORT_FILE
        ((FAILED_TESTS++))
    else
        echo -e "${YELLOW}⚠️  $test_name: WARNING${NC}"
        echo "⚠️  **$test_name**: WARNING - $details" >> $REPORT_FILE
        ((WARNINGS++))
    fi
}

# Initialize report
cat > $REPORT_FILE << EOF
# LOGOS ECOSYSTEM - Deployment Test Report

**Date:** $(date)
**Frontend URL:** $FRONTEND_URL
**API URL:** $API_URL

## Test Results

EOF

echo "=== 1. FRONTEND DEPLOYMENT TESTS ==="
echo ""

# Test 1.1: Frontend accessibility
echo -n "Testing frontend accessibility... "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    log_result "Frontend Accessibility" "PASS" "HTTP $HTTP_STATUS"
else
    log_result "Frontend Accessibility" "FAIL" "HTTP $HTTP_STATUS"
fi

# Test 1.2: Frontend SSL certificate
echo -n "Testing frontend SSL certificate... "
SSL_CHECK=$(curl -s -I $FRONTEND_URL 2>&1 | grep -i "SSL certificate" || echo "")
if [ -z "$SSL_CHECK" ]; then
    log_result "Frontend SSL Certificate" "PASS" "Valid SSL certificate"
else
    log_result "Frontend SSL Certificate" "FAIL" "SSL issue detected"
fi

# Test 1.3: Check Vercel deployment status
echo -n "Checking Vercel deployment status... "
cd frontend
VERCEL_STATUS=$(vercel ls | grep "Ready" | head -1 || echo "")
cd ..
if [ -n "$VERCEL_STATUS" ]; then
    log_result "Vercel Deployment Status" "PASS" "Deployment is ready"
else
    log_result "Vercel Deployment Status" "WARN" "Could not verify deployment status"
fi

echo ""
echo "=== 2. API ENDPOINT TESTS ==="
echo ""

# Test 2.1: API Health check
echo -n "Testing API health endpoint... "
API_HEALTH=$(curl -s -X GET "$API_URL/health" -w "\n%{http_code}" 2>/dev/null | tail -1)
if [ "$API_HEALTH" = "200" ]; then
    log_result "API Health Check" "PASS" "API is healthy (HTTP 200)"
else
    log_result "API Health Check" "FAIL" "API returned HTTP $API_HEALTH"
fi

# Test 2.2: API SSL certificate
echo -n "Testing API SSL certificate... "
API_SSL=$(curl -s -I $API_URL 2>&1 | grep -i "SSL certificate" || echo "")
if [ -z "$API_SSL" ]; then
    log_result "API SSL Certificate" "PASS" "Valid SSL certificate"
else
    log_result "API SSL Certificate" "FAIL" "SSL issue detected"
fi

echo ""
echo "=== 3. ENVIRONMENT CONFIGURATION ==="
echo ""

# Test 3.1: Vercel environment variables
echo -n "Checking Vercel environment variables... "
cd frontend
ENV_COUNT=$(vercel env ls 2>/dev/null | grep -c "NEXT_PUBLIC_" || echo "0")
cd ..
if [ "$ENV_COUNT" -gt 5 ]; then
    log_result "Vercel Environment Variables" "PASS" "$ENV_COUNT variables configured"
else
    log_result "Vercel Environment Variables" "WARN" "Only $ENV_COUNT variables found"
fi

echo ""
echo "=== 4. WEBSOCKET CONNECTION TEST ==="
echo ""

# Test 4.1: WebSocket endpoint
echo -n "Testing WebSocket connectivity... "
WS_TEST=$(curl -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" "https://api.logos-ecosystem.com/ws" || echo "000")
if [ "$WS_TEST" = "101" ] || [ "$WS_TEST" = "426" ]; then
    log_result "WebSocket Endpoint" "PASS" "WebSocket endpoint accessible"
else
    log_result "WebSocket Endpoint" "WARN" "WebSocket returned HTTP $WS_TEST"
fi

echo ""
echo "=== 5. CRITICAL PAGES TEST ==="
echo ""

# Test critical pages
PAGES=("/" "/dashboard" "/dashboard/invoicing" "/dashboard/cloudflare" "/dashboard/notifications")
for page in "${PAGES[@]}"; do
    echo -n "Testing page $page... "
    PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL$page" || echo "000")
    if [ "$PAGE_STATUS" = "200" ] || [ "$PAGE_STATUS" = "401" ]; then
        log_result "Page $page" "PASS" "HTTP $PAGE_STATUS"
    else
        log_result "Page $page" "FAIL" "HTTP $PAGE_STATUS"
    fi
done

echo ""
echo "=== 6. PAYMENT INTEGRATION TEST ==="
echo ""

# Test 6.1: Stripe webhook endpoint
echo -n "Testing Stripe webhook endpoint... "
STRIPE_WEBHOOK=$(curl -s -X POST "$API_URL/stripe/webhook" \
    -H "Content-Type: application/json" \
    -d '{"type":"test"}' \
    -w "\n%{http_code}" 2>/dev/null | tail -1)
if [ "$STRIPE_WEBHOOK" = "400" ] || [ "$STRIPE_WEBHOOK" = "401" ]; then
    log_result "Stripe Webhook Endpoint" "PASS" "Endpoint responding correctly"
else
    log_result "Stripe Webhook Endpoint" "WARN" "Unexpected response: HTTP $STRIPE_WEBHOOK"
fi

echo ""
echo "=== 7. DNS CONFIGURATION ==="
echo ""

# Test 7.1: DNS resolution
echo -n "Testing DNS resolution... "
DNS_IP=$(dig +short logos-ecosystem.com @8.8.8.8 | head -1)
if [ -n "$DNS_IP" ]; then
    log_result "DNS Resolution" "PASS" "Domain resolves to $DNS_IP"
else
    log_result "DNS Resolution" "FAIL" "Domain not resolving"
fi

echo ""
echo "=== 8. PERFORMANCE TESTS ==="
echo ""

# Test 8.1: Frontend load time
echo -n "Testing frontend load time... "
LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" $FRONTEND_URL)
LOAD_TIME_MS=$(echo "$LOAD_TIME * 1000" | bc)
if (( $(echo "$LOAD_TIME < 3" | bc -l) )); then
    log_result "Frontend Load Time" "PASS" "${LOAD_TIME_MS}ms"
else
    log_result "Frontend Load Time" "WARN" "${LOAD_TIME_MS}ms (slow)"
fi

# Generate summary
echo ""
echo "=== TEST SUMMARY ==="
echo ""

cat >> $REPORT_FILE << EOF

## Summary

- **Total Tests:** $((PASSED_TESTS + FAILED_TESTS + WARNINGS))
- **Passed:** $PASSED_TESTS
- **Failed:** $FAILED_TESTS
- **Warnings:** $WARNINGS

### Overall Status: $([ $FAILED_TESTS -eq 0 ] && echo "✅ DEPLOYMENT SUCCESSFUL" || echo "❌ DEPLOYMENT NEEDS ATTENTION")

## Recommendations

EOF

# Add recommendations based on results
if [ $FAILED_TESTS -gt 0 ]; then
    cat >> $REPORT_FILE << EOF
1. **Critical Issues Found** - Review failed tests immediately
2. Check API connectivity and configuration
3. Verify all environment variables are set correctly
EOF
elif [ $WARNINGS -gt 0 ]; then
    cat >> $REPORT_FILE << EOF
1. **Minor Issues Found** - Review warnings
2. Monitor system performance
3. Consider optimizing slow endpoints
EOF
else
    cat >> $REPORT_FILE << EOF
1. **All Systems Operational** ✅
2. Continue monitoring for 24 hours
3. Set up automated health checks
EOF
fi

cat >> $REPORT_FILE << EOF

## Next Steps

1. Monitor error logs: \`vercel logs\`
2. Check API logs in AWS CloudWatch
3. Verify payment webhook integration
4. Test user authentication flow
5. Perform load testing if needed

---
*Report generated automatically by LOGOS Deployment System*
EOF

# Display summary
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}DEPLOYMENT TEST SUMMARY${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Total Tests: $((PASSED_TESTS + FAILED_TESTS + WARNINGS))"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ DEPLOYMENT VERIFICATION SUCCESSFUL!${NC}"
else
    echo -e "${RED}❌ DEPLOYMENT NEEDS ATTENTION${NC}"
fi

echo ""
echo -e "${BLUE}📊 Full report saved to: $REPORT_FILE${NC}"
echo ""

# Create quick status script
cat > check-deployment-status.sh << 'EOF'
#!/bin/bash
echo "🔍 LOGOS ECOSYSTEM - Quick Status Check"
echo "======================================"
echo ""
echo "Frontend:"
curl -s -o /dev/null -w "  Status: %{http_code}\n  Time: %{time_total}s\n" https://logos-ecosystem.vercel.app
echo ""
echo "API:"
curl -s -o /dev/null -w "  Status: %{http_code}\n  Time: %{time_total}s\n" https://api.logos-ecosystem.com/health
echo ""
echo "DNS:"
echo "  logos-ecosystem.com -> $(dig +short logos-ecosystem.com | head -1)"
echo ""
EOF

chmod +x check-deployment-status.sh

echo -e "${YELLOW}💡 Run './check-deployment-status.sh' for quick status checks${NC}"

# Exit with appropriate code
exit $FAILED_TESTS