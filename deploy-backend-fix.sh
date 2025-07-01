#!/bin/bash
# Script para hacer deploy del backend con los cambios del webhook

set -e

echo "🚀 Deploy del Backend con Fix del Webhook"
echo "========================================"
echo ""

# Configuración
ECR_REPO="287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production"
TAG="webhook-fix-$(date +%Y%m%d-%H%M%S)"

# Verificar cuenta AWS
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ "$ACCOUNT_ID" != "287103448174" ]; then
    echo "❌ Error: Cuenta AWS incorrecta"
    exit 1
fi

echo "1️⃣ Construyendo imagen Docker..."
cd "/home/juan/Claude/LOGOS-ECOSYSTEM /backend"

# Usar el Dockerfile de Python
docker build -t logos-backend:$TAG -f Dockerfile.python .

echo ""
echo "2️⃣ Autenticando con ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REPO

echo ""
echo "3️⃣ Etiquetando imagen..."
docker tag logos-backend:$TAG $ECR_REPO:$TAG
docker tag logos-backend:$TAG $ECR_REPO:latest

echo ""
echo "4️⃣ Subiendo imagen a ECR..."
docker push $ECR_REPO:$TAG
docker push $ECR_REPO:latest

echo ""
echo "5️⃣ Actualizando Task Definition..."
# Obtener la task definition actual
TASK_DEF=$(aws ecs describe-task-definition --task-definition logos-backend --query 'taskDefinition' --output json)

# Actualizar la imagen
NEW_TASK_DEF=$(echo $TASK_DEF | jq ".containerDefinitions[0].image = \"$ECR_REPO:$TAG\"" | jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

# Registrar nueva task definition
NEW_TASK_ARN=$(aws ecs register-task-definition --cli-input-json "$NEW_TASK_DEF" --query 'taskDefinition.taskDefinitionArn' --output text)

echo ""
echo "6️⃣ Actualizando servicio ECS..."
aws ecs update-service \
    --cluster logos-production-cluster \
    --service logos-backend-correct \
    --task-definition $NEW_TASK_ARN \
    --force-new-deployment \
    --region us-east-1

echo ""
echo "✅ Deploy iniciado!"
echo ""
echo "📊 Monitorear progreso:"
echo "aws ecs describe-services --cluster logos-production-cluster --services logos-backend-correct --query 'services[0].deployments'"
echo ""
echo "🧪 Probar webhook (en 2-3 minutos):"
echo "curl -I https://api.logos-ecosystem.com/api/v1/payments/webhooks/stripe -X POST"
echo ""
echo "📝 Ver logs:"
echo "aws logs tail /ecs/logos-backend --follow"