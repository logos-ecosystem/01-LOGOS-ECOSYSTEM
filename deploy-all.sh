#!/bin/bash

# LOGOS Ecosystem - Complete Deployment Script
# Este script automatiza el deployment completo

set -e

echo "🚀 LOGOS Ecosystem - Deployment Completo"
echo "========================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar requisitos
echo -e "${BLUE}Verificando requisitos...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI no está instalado${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    exit 1
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Todos los requisitos cumplidos${NC}"
echo ""

# Preguntar por las credenciales AWS
echo -e "${YELLOW}Configuración AWS${NC}"
echo "Necesitas tus nuevas credenciales AWS"
read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -sp "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
echo ""
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=us-east-1

# Verificar credenciales
echo -n "Verificando credenciales AWS... "
if aws sts get-caller-identity &>/dev/null; then
    echo -e "${GREEN}✅ Válidas${NC}"
else
    echo -e "${RED}❌ Inválidas${NC}"
    exit 1
fi

# Actualizar .env.production con las credenciales
echo -e "${BLUE}Actualizando configuración...${NC}"
cd backend
sed -i "s/AWS_ACCESS_KEY_ID=.*/AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID/" .env.production 2>/dev/null || \
sed -i '' "s/AWS_ACCESS_KEY_ID=.*/AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID/" .env.production
sed -i "s/AWS_SECRET_ACCESS_KEY=.*/AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY/" .env.production 2>/dev/null || \
sed -i '' "s/AWS_SECRET_ACCESS_KEY=.*/AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY/" .env.production

# Crear Secrets en AWS Secrets Manager
echo ""
echo -e "${BLUE}Configurando AWS Secrets Manager...${NC}"
./setup-secrets-interactive.sh production

# Crear infraestructura AWS
echo ""
echo -e "${BLUE}Creando infraestructura AWS...${NC}"
echo "Esto puede tomar 10-15 minutos..."

STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name logos-production 2>&1 || true)
if [[ $STACK_EXISTS == *"does not exist"* ]]; then
    aws cloudformation create-stack \
        --stack-name logos-production \
        --template-body file://aws-infrastructure.yaml \
        --parameters ParameterKey=DBPassword,ParameterValue=Logosecosystem_777 \
        --capabilities CAPABILITY_NAMED_IAM \
        --region us-east-1
    
    echo "Esperando que se cree la infraestructura..."
    aws cloudformation wait stack-create-complete --stack-name logos-production
else
    echo "Stack ya existe, actualizando..."
    aws cloudformation update-stack \
        --stack-name logos-production \
        --template-body file://aws-infrastructure.yaml \
        --parameters ParameterKey=DBPassword,ParameterValue=Logosecosystem_777 \
        --capabilities CAPABILITY_NAMED_IAM \
        --region us-east-1 || echo "No hay cambios que actualizar"
fi

# Obtener outputs del stack
echo ""
echo -e "${BLUE}Obteniendo información de la infraestructura...${NC}"
ALB_URL=$(aws cloudformation describe-stacks --stack-name logos-production --query 'Stacks[0].Outputs[?OutputKey==`ALBEndpoint`].OutputValue' --output text)
ECR_URI=$(aws cloudformation describe-stacks --stack-name logos-production --query 'Stacks[0].Outputs[?OutputKey==`ECRRepository`].OutputValue' --output text)

echo "ALB URL: $ALB_URL"
echo "ECR URI: $ECR_URI"

# Build y push Docker image
echo ""
echo -e "${BLUE}Construyendo imagen Docker...${NC}"
docker build -t logos-backend .

# Login a ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

# Tag y push
docker tag logos-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest

# Deploy a ECS
echo ""
echo -e "${BLUE}Desplegando a ECS...${NC}"
./aws-deployment.sh production

# Mostrar URLs
echo ""
echo -e "${GREEN}✅ Backend desplegado!${NC}"
echo -e "API URL: ${YELLOW}http://$ALB_URL${NC}"
echo ""

# Frontend con Vercel
echo -e "${BLUE}Frontend - Vercel${NC}"
echo "Para desplegar el frontend:"
echo "1. Ve a https://vercel.com/new"
echo "2. Importa tu repositorio de GitHub"
echo "3. Configura las siguientes variables de entorno:"
echo ""
echo "NEXT_PUBLIC_API_URL=http://$ALB_URL"
echo "NEXT_PUBLIC_APP_URL=https://logos-ecosystem.com"
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RaDNFR452PkkFcmR6MA3fj3iRLq93pxyUPKZphkcAxEhxgemrNCQxz88rh2RIQT5eGnPr8hEWtsl8a96iGGgUhJ00iGXmKqxb"
echo "NEXT_PUBLIC_PAYPAL_CLIENT_ID=ATBj6N9mVxmnb_K_kD22oruRwdRbNCEumxeqEkcjBWnKs6F1USSLYgNOWqxMjABUh_9RwOFGkpCck73U"
echo ""

# GitHub
echo -e "${BLUE}GitHub${NC}"
echo "Para subir a GitHub:"
echo "git add ."
echo "git commit -m 'Deploy to production'"
echo "git remote add origin https://github.com/TU_USUARIO/logos-ecosystem.git"
echo "git push -u origin main"
echo ""

echo -e "${GREEN}✅ Deployment backend completado!${NC}"
echo -e "${YELLOW}⚠️  Recuerda:${NC}"
echo "1. Configurar certificado SSL en AWS Certificate Manager"
echo "2. Actualizar DNS para apuntar a $ALB_URL"
echo "3. Configurar Stripe webhooks"
echo "4. Desplegar frontend en Vercel"

cd ..