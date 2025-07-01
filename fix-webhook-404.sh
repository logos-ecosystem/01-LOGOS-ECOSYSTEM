#!/bin/bash
# Script para resolver el error 404 del webhook de Stripe

set -e

echo "🔧 Resolviendo Error 404 del Webhook de Stripe"
echo "============================================="
echo ""

# Verificar cuenta AWS
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ "$ACCOUNT_ID" != "287103448174" ]; then
    echo "❌ Error: Cuenta AWS incorrecta"
    exit 1
fi

echo "1️⃣ Construyendo nueva imagen Docker..."
cd /home/juan/Claude/LOGOS-ECOSYSTEM/backend

# Construir imagen
docker build -t logos-backend:latest .

echo ""
echo "2️⃣ Etiquetando imagen para ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 287103448174.dkr.ecr.us-east-1.amazonaws.com

docker tag logos-backend:latest 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-backend:latest

echo ""
echo "3️⃣ Subiendo imagen a ECR..."
docker push 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-backend:latest

echo ""
echo "4️⃣ Actualizando servicio ECS..."
aws ecs update-service \
    --cluster logos-production-cluster \
    --service logos-backend-correct \
    --force-new-deployment \
    --region us-east-1

echo ""
echo "✅ Proceso completado!"
echo ""
echo "⏳ El servicio tardará 2-3 minutos en actualizarse."
echo ""
echo "Para monitorear el progreso:"
echo "aws ecs describe-services --cluster logos-production-cluster --services logos-backend-correct --query 'services[0].deployments'"
echo ""
echo "Para probar el webhook después:"
echo "curl -I https://api.logos-ecosystem.com/api/v1/payments/webhooks/stripe -X POST"