#!/bin/bash

# 🧪 Railway Deployment Testing Script
# Distinguished Engineer Level - Comprehensive validation

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="logos-ecosystem.com"
API_DOMAIN="api.logos-ecosystem.com"
EXPECTED_ENDPOINTS=(
    "https://${DOMAIN}"
    "https://www.${DOMAIN}"
    "https://${API_DOMAIN}/health"
    "https://${API_DOMAIN}/api-docs"
    "https://${API_DOMAIN}/metrics"
)

# Test results
PASSED_TESTS=0
FAILED_TESTS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_TESTS++))
}

error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_TESTS++))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test DNS resolution
test_dns() {
    log "Testing DNS resolution..."
    
    for domain in "$DOMAIN" "www.$DOMAIN" "$API_DOMAIN"; do
        if host "$domain" > /dev/null 2>&1; then
            success "DNS resolution for $domain"
        else
            error "DNS resolution failed for $domain"
        fi
    done
}

# Test SSL certificates
test_ssl() {
    log "Testing SSL certificates..."
    
    for domain in "$DOMAIN" "$API_DOMAIN"; do
        if echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
            success "SSL certificate valid for $domain"
        else
            error "SSL certificate invalid for $domain"
        fi
    done
}

# Test HTTP endpoints
test_endpoints() {
    log "Testing HTTP endpoints..."
    
    for endpoint in "${EXPECTED_ENDPOINTS[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "000")
        if [[ "$response" == "200" ]]; then
            success "$endpoint returned 200"
        else
            error "$endpoint returned $response"
        fi
    done
}

# Test API functionality
test_api() {
    log "Testing API functionality..."
    
    # Test health endpoint
    health_response=$(curl -s "https://${API_DOMAIN}/health")
    if [[ $(echo "$health_response" | jq -r '.status' 2>/dev/null) == "healthy" ]]; then
        success "API health check passed"
    else
        error "API health check failed"
    fi
    
    # Test WebSocket endpoint
    ws_response=$(curl -s -o /dev/null -w "%{http_code}" "https://${API_DOMAIN}/socket.io/" || echo "000")
    if [[ "$ws_response" == "200" ]] || [[ "$ws_response" == "400" ]]; then
        success "WebSocket endpoint accessible"
    else
        error "WebSocket endpoint not accessible"
    fi
}

# Test response times
test_performance() {
    log "Testing performance..."
    
    for endpoint in "https://${DOMAIN}" "https://${API_DOMAIN}/health"; do
        response_time=$(curl -s -o /dev/null -w "%{time_total}" "$endpoint" || echo "999")
        response_time_ms=$(echo "$response_time * 1000" | bc)
        
        if (( $(echo "$response_time < 2" | bc -l) )); then
            success "$endpoint response time: ${response_time_ms}ms"
        else
            error "$endpoint response time too slow: ${response_time_ms}ms"
        fi
    done
}

# Test security headers
test_security() {
    log "Testing security headers..."
    
    headers=$(curl -s -I "https://${DOMAIN}")
    
    # Check for security headers
    security_headers=(
        "X-Content-Type-Options: nosniff"
        "X-Frame-Options:"
        "X-XSS-Protection:"
        "Strict-Transport-Security:"
    )
    
    for header in "${security_headers[@]}"; do
        if echo "$headers" | grep -i "$header" > /dev/null; then
            success "Security header present: $header"
        else
            warning "Security header missing: $header"
        fi
    done
}

# Test Railway CLI connectivity
test_railway_cli() {
    log "Testing Railway CLI connectivity..."
    
    if command -v railway &> /dev/null; then
        if railway whoami &> /dev/null; then
            success "Railway CLI authenticated"
        else
            error "Railway CLI not authenticated"
        fi
    else
        error "Railway CLI not installed"
    fi
}

# Test Cloudflare API
test_cloudflare_api() {
    log "Testing Cloudflare API..."
    
    if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] && [[ -n "${CLOUDFLARE_ZONE_ID:-}" ]]; then
        cf_response=$(curl -s -X GET \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json")
        
        if [[ $(echo "$cf_response" | jq -r '.success') == "true" ]]; then
            success "Cloudflare API connection successful"
        else
            error "Cloudflare API connection failed"
        fi
    else
        warning "Cloudflare API credentials not set"
    fi
}

# Main test execution
main() {
    echo "🧪 LOGOS ECOSYSTEM - Railway Deployment Testing"
    echo "=============================================="
    echo ""
    
    # Run all tests
    test_dns
    echo ""
    
    test_ssl
    echo ""
    
    test_endpoints
    echo ""
    
    test_api
    echo ""
    
    test_performance
    echo ""
    
    test_security
    echo ""
    
    test_railway_cli
    echo ""
    
    test_cloudflare_api
    echo ""
    
    # Summary
    echo "=============================================="
    echo "TEST SUMMARY"
    echo "=============================================="
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo ""
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All tests passed! Deployment successful!${NC}"
        echo ""
        echo "Your application is live at:"
        echo "🌐 https://${DOMAIN}"
        echo "🔌 https://${API_DOMAIN}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Please check the deployment.${NC}"
        exit 1
    fi
}

# Execute main function
main "$@"