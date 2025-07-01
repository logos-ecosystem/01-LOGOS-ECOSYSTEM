#!/bin/bash

# Deploy Backend to Existing AWS Infrastructure
set -e

echo "🚀 Desplegando Backend a AWS ECS"
echo "================================"

cd backend

# Configuración conocida
ALB_ENDPOINT="logos-backend-alb-915729089.us-east-1.elb.amazonaws.com"
REGION="us-east-1"
ACCOUNT_ID="287103448174"

# Buscar stack
echo "Buscando stack de CloudFormation..."
STACK_NAME=$(aws cloudformation list-stacks --region $REGION --query "StackSummaries[?contains(StackName, 'logos') && (StackStatus=='CREATE_COMPLETE' || StackStatus=='UPDATE_COMPLETE')].StackName" --output text | head -1)

if [ -z "$STACK_NAME" ]; then
    echo "❌ No se encontró stack. Posibles stacks:"
    aws cloudformation list-stacks --region $REGION --query "StackSummaries[*].{Name:StackName,Status:StackStatus}" --output table
    exit 1
fi

echo "✓ Stack encontrado: $STACK_NAME"

# Obtener recursos
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/logos-production"
CLUSTER="logos-production-cluster"
SERVICE="logos-production-service"

echo "ECR: $ECR_REPO"
echo "Cluster: $CLUSTER"
echo "Service: $SERVICE"

# Build
echo ""
echo "📦 Construyendo imagen Docker..."
docker build -t logos-backend .

# Login ECR
echo "🔐 Login a ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

# Tag y Push
echo "⬆️ Subiendo imagen..."
docker tag logos-backend:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

# Update ECS Service
echo "🔄 Actualizando servicio ECS..."
aws ecs update-service \
    --cluster $CLUSTER \
    --service $SERVICE \
    --force-new-deployment \
    --region $REGION

echo ""
echo "✅ Backend desplegado!"
echo "⏳ El servicio tardará 2-5 minutos en actualizar"
echo ""
echo "Verifica en:"
echo "• http://$ALB_ENDPOINT/health"
echo "• AWS Console: https://console.aws.amazon.com/ecs"

cd ..