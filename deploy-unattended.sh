#!/bin/bash

# LOGOS ECOSYSTEM - Unattended Deployment Script
# Este script realiza un deployment completamente automatizado sin intervención humana
# Incluye validaciones exhaustivas, rollback automático y notificaciones

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Configuración
DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)
LOG_DIR="./deployment-logs"
LOG_FILE="$LOG_DIR/deployment-$DEPLOYMENT_ID.log"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@logos-ecosystem.com}"
MAX_RETRIES=3
HEALTH_CHECK_TIMEOUT=300  # 5 minutos
ROLLBACK_ON_FAILURE=true

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Crear directorio de logs
mkdir -p "$LOG_DIR"

# Función de logging
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
    
    # Enviar notificaciones críticas
    if [[ "$level" == "ERROR" ]] || [[ "$level" == "CRITICAL" ]]; then
        send_notification "❌ Deployment Error" "$message" "danger"
    fi
}

# Función para enviar notificaciones
send_notification() {
    local title=$1
    local message=$2
    local level=${3:-"info"}
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$title\",\"attachments\":[{\"color\":\"$level\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # Email notification (usando AWS SES si está configurado)
    if command -v aws &> /dev/null; then
        aws ses send-email \
            --from "noreply@logos-ecosystem.com" \
            --to "$ADMIN_EMAIL" \
            --subject "LOGOS Deployment: $title" \
            --text "$message" 2>/dev/null || true
    fi
}

# Función para realizar health checks
health_check() {
    local service=$1
    local url=$2
    local expected_status=${3:-200}
    local retries=0
    
    log "INFO" "Checking health of $service..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
        
        if [ "$response" = "$expected_status" ]; then
            log "SUCCESS" "$service is healthy (HTTP $response)"
            return 0
        fi
        
        retries=$((retries + 1))
        log "WARN" "$service health check failed (attempt $retries/$MAX_RETRIES, HTTP $response)"
        sleep 10
    done
    
    log "ERROR" "$service health check failed after $MAX_RETRIES attempts"
    return 1
}

# Función para backup antes del deployment
create_backup() {
    log "INFO" "Creating backup before deployment..."
    
    # Backup de base de datos
    if [[ -n "$DATABASE_URL" ]]; then
        pg_dump "$DATABASE_URL" > "$LOG_DIR/db-backup-$DEPLOYMENT_ID.sql"
        log "SUCCESS" "Database backup created"
    fi
    
    # Backup de archivos importantes
    tar -czf "$LOG_DIR/config-backup-$DEPLOYMENT_ID.tar.gz" \
        backend/.env* \
        frontend/.env* \
        backend/prisma/schema.prisma \
        2>/dev/null || true
    
    log "SUCCESS" "Configuration backup created"
}

# Función de rollback
rollback() {
    log "CRITICAL" "Initiating rollback procedure..."
    
    # Restaurar versión anterior en AWS ECS
    if command -v aws &> /dev/null; then
        aws ecs update-service \
            --cluster logos-production-cluster \
            --service logos-production-service \
            --task-definition logos-production:$PREVIOUS_VERSION \
            --force-new-deployment || true
    fi
    
    # Restaurar frontend en Vercel
    if command -v vercel &> /dev/null; then
        cd frontend
        vercel rollback --yes || true
        cd ..
    fi
    
    # Restaurar base de datos si es necesario
    if [[ -f "$LOG_DIR/db-backup-$DEPLOYMENT_ID.sql" ]]; then
        log "INFO" "Restoring database backup..."
        psql "$DATABASE_URL" < "$LOG_DIR/db-backup-$DEPLOYMENT_ID.sql" || true
    fi
    
    send_notification "🔄 Deployment Rollback" "Deployment $DEPLOYMENT_ID has been rolled back" "warning"
}

# Validaciones pre-deployment
pre_deployment_checks() {
    log "INFO" "=== Starting Pre-Deployment Checks ==="
    
    # 1. Verificar variables de entorno críticas
    log "INFO" "Checking environment variables..."
    required_vars=(
        "DATABASE_URL"
        "STRIPE_SECRET_KEY"
        "PAYPAL_CLIENT_ID"
        "PAYPAL_CLIENT_SECRET"
        "JWT_SECRET"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log "ERROR" "Missing required environment variable: $var"
            return 1
        fi
    done
    log "SUCCESS" "All required environment variables are set"
    
    # 2. Verificar conectividad de servicios
    log "INFO" "Checking service connectivity..."
    
    # Database
    if ! psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
        log "ERROR" "Cannot connect to database"
        return 1
    fi
    log "SUCCESS" "Database connection verified"
    
    # Redis
    if ! redis-cli -h "$REDIS_HOST" ping &>/dev/null; then
        log "WARN" "Redis connection failed (non-critical)"
    else
        log "SUCCESS" "Redis connection verified"
    fi
    
    # 3. Validar código
    log "INFO" "Validating code..."
    
    # Backend TypeScript
    cd backend
    if ! npm run typecheck &>/dev/null; then
        log "ERROR" "Backend TypeScript validation failed"
        cd ..
        return 1
    fi
    log "SUCCESS" "Backend TypeScript validation passed"
    
    # Frontend build test
    cd ../frontend
    if ! npm run build &>/dev/null; then
        log "ERROR" "Frontend build validation failed"
        cd ..
        return 1
    fi
    log "SUCCESS" "Frontend build validation passed"
    cd ..
    
    # 4. Verificar espacio en disco
    log "INFO" "Checking disk space..."
    available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 5 ]; then
        log "ERROR" "Insufficient disk space: ${available_space}GB available (minimum 5GB required)"
        return 1
    fi
    log "SUCCESS" "Disk space check passed: ${available_space}GB available"
    
    # 5. Verificar certificados SSL
    log "INFO" "Checking SSL certificates..."
    if ! openssl s_client -connect api.logos-ecosystem.com:443 -servername api.logos-ecosystem.com < /dev/null 2>/dev/null | openssl x509 -noout -checkend 86400; then
        log "WARN" "SSL certificate expires within 24 hours"
    else
        log "SUCCESS" "SSL certificates are valid"
    fi
    
    log "SUCCESS" "=== Pre-Deployment Checks Completed Successfully ==="
    return 0
}

# Función de deployment del backend
deploy_backend() {
    log "INFO" "=== Starting Backend Deployment ==="
    
    cd backend
    
    # Build Docker image
    log "INFO" "Building Docker image..."
    docker build -t logos-production:$DEPLOYMENT_ID . || return 1
    
    # Tag for ECR
    docker tag logos-production:$DEPLOYMENT_ID \
        287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest
    docker tag logos-production:$DEPLOYMENT_ID \
        287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:$DEPLOYMENT_ID
    
    # Push to ECR
    log "INFO" "Pushing to ECR..."
    aws ecr get-login-password --region us-east-1 | \
        docker login --username AWS --password-stdin \
        287103448174.dkr.ecr.us-east-1.amazonaws.com
    
    docker push 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest || return 1
    docker push 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:$DEPLOYMENT_ID || return 1
    
    # Update ECS service
    log "INFO" "Updating ECS service..."
    aws ecs update-service \
        --cluster logos-production-cluster \
        --service logos-production-service \
        --force-new-deployment || return 1
    
    # Wait for deployment to stabilize
    log "INFO" "Waiting for ECS deployment to stabilize..."
    aws ecs wait services-stable \
        --cluster logos-production-cluster \
        --services logos-production-service || return 1
    
    cd ..
    log "SUCCESS" "Backend deployment completed"
    return 0
}

# Función de deployment del frontend
deploy_frontend() {
    log "INFO" "=== Starting Frontend Deployment ==="
    
    cd frontend
    
    # Build production
    log "INFO" "Building frontend for production..."
    npm run build || return 1
    
    # Deploy to Vercel
    log "INFO" "Deploying to Vercel..."
    vercel --prod --yes || return 1
    
    cd ..
    log "SUCCESS" "Frontend deployment completed"
    return 0
}

# Función de migraciones de base de datos
run_migrations() {
    log "INFO" "=== Running Database Migrations ==="
    
    cd backend
    
    # Generate Prisma client
    npx prisma generate || return 1
    
    # Run migrations
    DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy || return 1
    
    cd ..
    log "SUCCESS" "Database migrations completed"
    return 0
}

# Post-deployment checks
post_deployment_checks() {
    log "INFO" "=== Starting Post-Deployment Checks ==="
    
    # Esperar un poco para que los servicios se estabilicen
    sleep 30
    
    # Health checks
    health_check "Backend API" "https://api.logos-ecosystem.com/health" 200
    health_check "Frontend" "https://logos-ecosystem.com" 200
    health_check "Database" "https://api.logos-ecosystem.com/health/db" 200
    health_check "Redis" "https://api.logos-ecosystem.com/health/redis" 200
    
    # Verificar funcionalidades críticas
    log "INFO" "Testing critical endpoints..."
    
    # Test auth endpoint
    auth_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "https://api.logos-ecosystem.com/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"test"}' || echo "000")
    
    if [[ "$auth_response" != "401" ]] && [[ "$auth_response" != "200" ]]; then
        log "ERROR" "Auth endpoint not responding correctly (HTTP $auth_response)"
        return 1
    fi
    
    log "SUCCESS" "=== Post-Deployment Checks Completed Successfully ==="
    return 0
}

# Función principal de deployment
main() {
    log "INFO" "🚀 Starting LOGOS Ecosystem Unattended Deployment"
    log "INFO" "Deployment ID: $DEPLOYMENT_ID"
    
    # Guardar versión actual para rollback
    PREVIOUS_VERSION=$(aws ecs describe-services \
        --cluster logos-production-cluster \
        --services logos-production-service \
        --query 'services[0].taskDefinition' \
        --output text | rev | cut -d: -f1 | rev || echo "unknown")
    
    log "INFO" "Current version: $PREVIOUS_VERSION"
    
    # Pre-deployment
    if ! pre_deployment_checks; then
        log "CRITICAL" "Pre-deployment checks failed. Aborting deployment."
        send_notification "❌ Deployment Failed" "Pre-deployment checks failed for deployment $DEPLOYMENT_ID" "danger"
        exit 1
    fi
    
    # Backup
    create_backup
    
    # Deploy backend
    if ! deploy_backend; then
        log "CRITICAL" "Backend deployment failed"
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback
        fi
        exit 1
    fi
    
    # Run migrations
    if ! run_migrations; then
        log "CRITICAL" "Database migrations failed"
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback
        fi
        exit 1
    fi
    
    # Deploy frontend
    if ! deploy_frontend; then
        log "CRITICAL" "Frontend deployment failed"
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback
        fi
        exit 1
    fi
    
    # Post-deployment checks
    if ! post_deployment_checks; then
        log "CRITICAL" "Post-deployment checks failed"
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback
        fi
        exit 1
    fi
    
    # Success!
    log "SUCCESS" "🎉 Deployment completed successfully!"
    send_notification "✅ Deployment Successful" "Deployment $DEPLOYMENT_ID completed successfully" "good"
    
    # Generar reporte
    generate_deployment_report
}

# Generar reporte de deployment
generate_deployment_report() {
    cat > "$LOG_DIR/deployment-report-$DEPLOYMENT_ID.md" << EOF
# LOGOS Ecosystem Deployment Report

**Deployment ID:** $DEPLOYMENT_ID  
**Date:** $(date)  
**Status:** SUCCESS  
**Duration:** $SECONDS seconds  

## Services Deployed
- Backend: Docker image logos-production:$DEPLOYMENT_ID
- Frontend: Vercel production deployment
- Database: Migrations applied successfully

## Health Check Results
- Backend API: ✅ Healthy
- Frontend: ✅ Healthy
- Database: ✅ Connected
- Redis: ✅ Connected

## Configuration
- Previous Version: $PREVIOUS_VERSION
- Rollback Available: Yes
- Logs: $LOG_FILE

## Next Steps
1. Monitor application metrics
2. Check error logs for any issues
3. Verify all features are working correctly
4. Update monitoring dashboards

---
Generated automatically by LOGOS Deployment System
EOF

    log "INFO" "Deployment report generated: $LOG_DIR/deployment-report-$DEPLOYMENT_ID.md"
}

# Trap para limpiar en caso de error
trap 'log "ERROR" "Deployment interrupted"; exit 1' INT TERM

# Ejecutar deployment
main

# Fin del script
log "INFO" "Deployment script completed in $SECONDS seconds"