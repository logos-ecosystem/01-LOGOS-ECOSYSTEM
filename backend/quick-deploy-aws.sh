#!/bin/bash

# Quick AWS Deployment Script for LOGOS Backend
# Este script simplifica el deployment a AWS

set -e

echo "🚀 LOGOS Backend - Quick AWS Deployment"
echo "======================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI no está instalado${NC}"
    echo "Instálalo con: pip install awscli"
    exit 1
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    exit 1
fi

# Configuración
STACK_NAME="logos-production"
REGION="us-east-1"
DB_PASSWORD="Logosecosystem_777"

echo -e "${YELLOW}Configuración:${NC}"
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo ""

# Paso 1: Verificar credenciales AWS
echo -e "${YELLOW}1. Verificando credenciales AWS...${NC}"
if aws sts get-caller-identity &>/dev/null; then
    echo -e "${GREEN}✓ Credenciales válidas${NC}"
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo "Account ID: $ACCOUNT_ID"
else
    echo -e "${RED}❌ Configura tus credenciales AWS primero${NC}"
    echo "Edita .env.production y agrega:"
    echo "  AWS_ACCESS_KEY_ID=tu-key"
    echo "  AWS_SECRET_ACCESS_KEY=tu-secret"
    exit 1
fi

# Paso 2: Crear/Actualizar infraestructura
echo ""
echo -e "${YELLOW}2. Creando infraestructura con CloudFormation...${NC}"

# Verificar si el stack existe
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &>/dev/null; then
    echo "Stack existe, actualizando..."
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://aws-infrastructure.yaml \
        --parameters ParameterKey=DBPassword,ParameterValue=$DB_PASSWORD \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION || echo "No hay cambios que actualizar"
else
    echo "Creando nuevo stack..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://aws-infrastructure.yaml \
        --parameters ParameterKey=DBPassword,ParameterValue=$DB_PASSWORD \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION
    
    echo "Esperando que se complete (10-15 minutos)..."
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
fi

# Paso 3: Obtener outputs
echo ""
echo -e "${YELLOW}3. Obteniendo información del stack...${NC}"

# Función para obtener output
get_output() {
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
        --output text
}

ALB_URL=$(get_output "ALBEndpoint")
ECR_REPO=$(get_output "ECRRepository")
CLUSTER_NAME=$(get_output "ClusterName")
SERVICE_NAME=$(get_output "ServiceName")

echo -e "${GREEN}✓ Infraestructura lista${NC}"
echo "ALB URL: $ALB_URL"
echo "ECR Repository: $ECR_REPO"

# Paso 4: Build y push Docker image
echo ""
echo -e "${YELLOW}4. Construyendo imagen Docker...${NC}"
docker build -t logos-backend .

# Login a ECR
echo "Login a ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

# Tag y push
echo "Subiendo imagen..."
docker tag logos-backend:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

# Paso 5: Actualizar servicio ECS
echo ""
echo -e "${YELLOW}5. Desplegando a ECS...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $REGION

echo ""
echo -e "${GREEN}✅ Deployment completado!${NC}"
echo ""
echo -e "${YELLOW}URLs y próximos pasos:${NC}"
echo "• API URL: http://$ALB_URL"
echo "• Health check: http://$ALB_URL/health"
echo ""
echo "Próximos pasos:"
echo "1. Configurar certificado SSL en ACM"
echo "2. Actualizar DNS: api.logos-ecosystem.com → $ALB_URL"
echo "3. Configurar Secrets Manager: ./setup-secrets-interactive.sh production"
echo "4. Deploy frontend en Vercel con API_URL=http://$ALB_URL"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "La API está en HTTP. Configura HTTPS antes de producción."