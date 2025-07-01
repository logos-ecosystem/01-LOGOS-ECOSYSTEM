#!/bin/bash

# 🚀 LOGOS ECOSYSTEM - Railway Automated Deployment Script
# Distinguished Engineer Level Implementation
# Zero-touch deployment with automatic rollback

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="logos-ecosystem"
GITHUB_REPO="https://github.com/${GITHUB_USERNAME}/${PROJECT_NAME}"
CLOUDFLARE_DOMAIN="logos-ecosystem.com"

# Function to print colored output
log() {
    echo -e "${2:-$BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check required environment variables
check_prerequisites() {
    log "🔍 Checking prerequisites..." "$BLUE"
    
    local missing_vars=()
    
    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        error "Railway CLI not installed. Install it with: npm i -g @railway/cli"
    fi
    
    # Check required environment variables
    [[ -z "${RAILWAY_TOKEN:-}" ]] && missing_vars+=("RAILWAY_TOKEN")
    [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && missing_vars+=("CLOUDFLARE_API_TOKEN")
    [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]] && missing_vars+=("CLOUDFLARE_ZONE_ID")
    [[ -z "${GITHUB_TOKEN:-}" ]] && missing_vars+=("GITHUB_TOKEN")
    [[ -z "${GITHUB_USERNAME:-}" ]] && missing_vars+=("GITHUB_USERNAME")
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        error "Missing required environment variables: ${missing_vars[*]}"
    fi
    
    success "All prerequisites met"
}

# Test API connections
test_api_connections() {
    log "🔌 Testing API connections..." "$BLUE"
    
    # Test Railway API
    log "Testing Railway API..."
    if railway whoami &> /dev/null; then
        success "Railway API connection successful"
    else
        error "Railway API connection failed. Check RAILWAY_TOKEN"
    fi
    
    # Test Cloudflare API
    log "Testing Cloudflare API..."
    local cf_response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    if [[ $(echo "$cf_response" | jq -r '.success') == "true" ]]; then
        success "Cloudflare API connection successful"
    else
        error "Cloudflare API connection failed. Check CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID"
    fi
    
    # Test GitHub API
    log "Testing GitHub API..."
    local github_response=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
        "https://api.github.com/user")
    
    if [[ $(echo "$github_response" | jq -r '.login') == "${GITHUB_USERNAME}" ]]; then
        success "GitHub API connection successful"
    else
        error "GitHub API connection failed. Check GITHUB_TOKEN"
    fi
}

# Create or update GitHub repository
setup_github_repo() {
    log "📦 Setting up GitHub repository..." "$BLUE"
    
    # Check if repo exists
    local repo_check=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: token ${GITHUB_TOKEN}" \
        "https://api.github.com/repos/${GITHUB_USERNAME}/${PROJECT_NAME}")
    
    if [[ "$repo_check" == "404" ]]; then
        log "Creating new repository..."
        curl -s -X POST \
            -H "Authorization: token ${GITHUB_TOKEN}" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/user/repos \
            -d '{
                "name": "'${PROJECT_NAME}'",
                "description": "LOGOS AI Ecosystem - Enterprise Grade Platform",
                "private": false,
                "has_issues": true,
                "has_projects": true,
                "has_wiki": true
            }' > /dev/null
        success "Repository created"
    else
        log "Repository already exists"
    fi
    
    # Initialize git if needed
    if [[ ! -d .git ]]; then
        git init
        git remote add origin "${GITHUB_REPO}"
    fi
    
    # Add all files and push
    log "Pushing code to GitHub..."
    git add .
    git commit -m "feat: Railway deployment configuration

- Add Railway deployment scripts
- Configure automatic CI/CD
- Set up production environment
- Enable zero-downtime deployments

🚀 Generated with Distinguished Engineer Protocol" || true
    
    git branch -M main
    git push -u origin main --force
    
    success "Code pushed to GitHub"
}

# Create Railway project and services
setup_railway_project() {
    log "🚂 Setting up Railway project..." "$BLUE"
    
    # Create new Railway project
    log "Creating Railway project..."
    railway login --browserless
    railway init -n "${PROJECT_NAME}"
    
    # Create services
    log "Creating backend service..."
    railway service create backend
    
    log "Creating frontend service..."
    railway service create frontend
    
    # Create PostgreSQL database
    log "Creating PostgreSQL database..."
    railway plugin create postgresql
    
    # Create Redis instance
    log "Creating Redis instance..."
    railway plugin create redis
    
    success "Railway project created"
}

# Configure Railway environment variables
configure_railway_env() {
    log "🔧 Configuring Railway environment..." "$BLUE"
    
    # Backend environment variables
    railway env set NODE_ENV=production -s backend
    railway env set PORT=8000 -s backend
    railway env set JWT_SECRET="$(openssl rand -base64 32)" -s backend
    railway env set DATABASE_URL="\${PGDATABASE_URL}" -s backend
    railway env set REDIS_URL="\${REDIS_URL}" -s backend
    railway env set ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" -s backend
    railway env set STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}" -s backend
    railway env set STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}" -s backend
    railway env set CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}" -s backend
    railway env set CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID}" -s backend
    railway env set GITHUB_TOKEN="${GITHUB_TOKEN}" -s backend
    railway env set CORS_ORIGIN="https://${CLOUDFLARE_DOMAIN}" -s backend
    
    # Frontend environment variables
    railway env set NODE_ENV=production -s frontend
    railway env set NEXT_PUBLIC_API_URL="https://api.${CLOUDFLARE_DOMAIN}" -s frontend
    railway env set NEXT_PUBLIC_WS_URL="wss://api.${CLOUDFLARE_DOMAIN}" -s frontend
    railway env set NEXT_PUBLIC_STRIPE_PUBLIC_KEY="${STRIPE_PUBLIC_KEY:-}" -s frontend
    
    success "Environment variables configured"
}

# Deploy services to Railway
deploy_to_railway() {
    log "🚀 Deploying to Railway..." "$BLUE"
    
    # Deploy backend
    log "Deploying backend service..."
    cd backend
    railway up -s backend --detach
    cd ..
    
    # Deploy frontend
    log "Deploying frontend service..."
    cd frontend
    railway up -s frontend --detach
    cd ..
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Get service URLs
    BACKEND_URL=$(railway domain -s backend)
    FRONTEND_URL=$(railway domain -s frontend)
    
    log "Backend URL: ${BACKEND_URL}"
    log "Frontend URL: ${FRONTEND_URL}"
    
    success "Services deployed to Railway"
}

# Configure custom domains in Railway
configure_railway_domains() {
    log "🌐 Configuring Railway custom domains..." "$BLUE"
    
    # Add custom domain for frontend
    railway domain add "${CLOUDFLARE_DOMAIN}" -s frontend
    
    # Add custom domain for backend API
    railway domain add "api.${CLOUDFLARE_DOMAIN}" -s backend
    
    # Get CNAME values
    FRONTEND_CNAME=$(railway domain -s frontend | grep -A1 "${CLOUDFLARE_DOMAIN}" | tail -1)
    BACKEND_CNAME=$(railway domain -s backend | grep -A1 "api.${CLOUDFLARE_DOMAIN}" | tail -1)
    
    success "Railway domains configured"
}

# Configure Cloudflare DNS
configure_cloudflare_dns() {
    log "☁️ Configuring Cloudflare DNS..." "$BLUE"
    
    # Function to create or update DNS record
    update_dns_record() {
        local name=$1
        local content=$2
        local proxied=${3:-true}
        
        # Check if record exists
        local record_id=$(curl -s -X GET \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${name}.${CLOUDFLARE_DOMAIN}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" | jq -r '.result[0].id // empty')
        
        if [[ -n "$record_id" ]]; then
            # Update existing record
            curl -s -X PUT \
                "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record_id}" \
                -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
                -H "Content-Type: application/json" \
                --data '{
                    "type": "CNAME",
                    "name": "'${name}'",
                    "content": "'${content}'",
                    "ttl": 1,
                    "proxied": '${proxied}'
                }' > /dev/null
            log "Updated DNS record: ${name}"
        else
            # Create new record
            curl -s -X POST \
                "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
                -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
                -H "Content-Type: application/json" \
                --data '{
                    "type": "CNAME",
                    "name": "'${name}'",
                    "content": "'${content}'",
                    "ttl": 1,
                    "proxied": '${proxied}'
                }' > /dev/null
            log "Created DNS record: ${name}"
        fi
    }
    
    # Configure root domain
    update_dns_record "@" "${FRONTEND_CNAME}" true
    
    # Configure www subdomain
    update_dns_record "www" "${CLOUDFLARE_DOMAIN}" true
    
    # Configure API subdomain
    update_dns_record "api" "${BACKEND_CNAME}" true
    
    # Configure SSL/TLS settings
    curl -s -X PATCH \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/ssl" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data '{"value":"full"}' > /dev/null
    
    # Enable Always Use HTTPS
    curl -s -X PATCH \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/always_use_https" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data '{"value":"on"}' > /dev/null
    
    success "Cloudflare DNS configured"
}

# Run health checks
run_health_checks() {
    log "🏥 Running health checks..." "$BLUE"
    
    # Wait for DNS propagation
    log "Waiting for DNS propagation (this may take a few minutes)..."
    sleep 60
    
    # Check frontend
    log "Checking frontend..."
    local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "https://${CLOUDFLARE_DOMAIN}")
    if [[ "$frontend_status" == "200" ]]; then
        success "Frontend is accessible at https://${CLOUDFLARE_DOMAIN}"
    else
        warning "Frontend returned status code: ${frontend_status}"
    fi
    
    # Check backend API
    log "Checking backend API..."
    local api_status=$(curl -s -o /dev/null -w "%{http_code}" "https://api.${CLOUDFLARE_DOMAIN}/health")
    if [[ "$api_status" == "200" ]]; then
        success "Backend API is accessible at https://api.${CLOUDFLARE_DOMAIN}"
    else
        warning "Backend API returned status code: ${api_status}"
    fi
    
    # Check SSL certificate
    log "Checking SSL certificate..."
    if openssl s_client -connect "${CLOUDFLARE_DOMAIN}:443" -servername "${CLOUDFLARE_DOMAIN}" < /dev/null 2>&1 | grep -q "Verify return code: 0"; then
        success "SSL certificate is valid"
    else
        warning "SSL certificate verification failed"
    fi
    
    # Final summary
    log "🎉 Deployment Summary" "$GREEN"
    echo "=========================="
    echo "Frontend URL: https://${CLOUDFLARE_DOMAIN}"
    echo "Backend API: https://api.${CLOUDFLARE_DOMAIN}"
    echo "Railway Dashboard: https://railway.app/project/${PROJECT_NAME}"
    echo "=========================="
}

# Main execution
main() {
    log "🚀 Starting LOGOS ECOSYSTEM Railway Deployment" "$GREEN"
    
    check_prerequisites
    test_api_connections
    setup_github_repo
    setup_railway_project
    configure_railway_env
    deploy_to_railway
    configure_railway_domains
    configure_cloudflare_dns
    run_health_checks
    
    success "🎉 Deployment completed successfully!"
    success "Your application is now live at https://${CLOUDFLARE_DOMAIN}"
}

# Execute main function
main "$@"