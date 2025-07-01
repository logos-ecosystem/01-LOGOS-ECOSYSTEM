#!/bin/bash

# Script para actualizar deployments existentes
# LOGOS Ecosystem - Update Existing Infrastructure

set -e

echo "🚀 Actualizando LOGOS Ecosystem"
echo "==============================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración basada en tu vercel.json
ALB_ENDPOINT="logos-backend-alb-915729089.us-east-1.elb.amazonaws.com"
VERCEL_PROJECT="logos-ecosystem"

echo -e "${BLUE}Configuración detectada:${NC}"
echo "• ALB Endpoint: $ALB_ENDPOINT"
echo "• Vercel Project: $VERCEL_PROJECT"
echo ""

# 1. GITHUB
echo -e "${YELLOW}1. GitHub - Push del código${NC}"
echo "Necesitas configurar el remote primero:"
echo "git remote set-url origin https://github.com/TU_USUARIO/TU_REPO.git"
echo ""
read -p "¿Ya configuraste el remote? (s/n): " configured
if [ "$configured" = "s" ]; then
    echo "Pushing código..."
    git push -u origin master || git push -u origin main
else
    echo "Configura el remote y ejecuta: git push -u origin master"
fi

# 2. AWS BACKEND
echo ""
echo -e "${YELLOW}2. AWS - Actualizar Backend${NC}"
echo "El ALB ya existe en: $ALB_ENDPOINT"
read -p "¿Quieres actualizar el backend en ECS? (s/n): " update_backend

if [ "$update_backend" = "s" ]; then
    cd backend
    
    # Verificar si podemos obtener info del stack
    echo "Buscando información del stack..."
    STACK_NAME=$(aws cloudformation list-stacks --query "StackSummaries[?contains(StackName, 'logos')].StackName" --output text | head -1)
    
    if [ ! -z "$STACK_NAME" ]; then
        echo "Stack encontrado: $STACK_NAME"
        
        # Obtener info del ECR
        ECR_REPO=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ECRRepository'].OutputValue" --output text)
        CLUSTER=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ClusterName'].OutputValue" --output text)
        SERVICE=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ServiceName'].OutputValue" --output text)
        
        echo "ECR: $ECR_REPO"
        echo "Cluster: $CLUSTER"
        echo "Service: $SERVICE"
        
        # Build y push
        echo "Building Docker image..."
        docker build -t logos-backend .
        
        # Login ECR
        aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REPO
        
        # Tag y push
        docker tag logos-backend:latest $ECR_REPO:latest
        docker push $ECR_REPO:latest
        
        # Update service
        echo "Actualizando servicio ECS..."
        aws ecs update-service --cluster $CLUSTER --service $SERVICE --force-new-deployment
        
        echo -e "${GREEN}✓ Backend actualizado${NC}"
    else
        echo "No se encontró el stack. Ejecuta manualmente:"
        echo "cd backend && ./aws-deployment.sh production"
    fi
    
    cd ..
fi

# 3. VERCEL FRONTEND
echo ""
echo -e "${YELLOW}3. Vercel - Actualizar Frontend${NC}"
echo "Vercel detectará automáticamente el push a GitHub"
echo "O puedes forzar un deploy:"
read -p "¿Quieres hacer deploy manual a Vercel? (s/n): " deploy_vercel

if [ "$deploy_vercel" = "s" ]; then
    cd frontend
    
    # Verificar si Vercel CLI está instalado
    if command -v vercel &> /dev/null; then
        echo "Desplegando a Vercel..."
        vercel --prod
    else
        echo "Instala Vercel CLI: npm i -g vercel"
        echo "O deploya desde: https://vercel.com/$VERCEL_PROJECT"
    fi
    
    cd ..
fi

# 4. VERIFICACIÓN
echo ""
echo -e "${YELLOW}4. Verificación${NC}"
echo "Verificando endpoints..."

# Backend health
echo -n "Backend API: "
curl -s -o /dev/null -w "%{http_code}" http://$ALB_ENDPOINT/health || echo "ERROR"

echo ""
echo ""
echo -e "${GREEN}✅ Proceso completado${NC}"
echo ""
echo "URLs:"
echo "• Frontend: https://$VERCEL_PROJECT.vercel.app"
echo "• Backend: http://$ALB_ENDPOINT"
echo "• API Health: http://$ALB_ENDPOINT/health"
echo ""
echo -e "${YELLOW}⚠️  Pendientes:${NC}"
echo "• Configurar HTTPS en ALB (Certificate Manager)"
echo "• Actualizar DNS api.logos-ecosystem.com → $ALB_ENDPOINT"
echo "• Configurar Stripe webhooks"
echo "• Agregar credenciales a Secrets Manager"