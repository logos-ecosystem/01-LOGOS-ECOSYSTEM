#!/bin/bash
# Script para actualizar el Stripe Webhook Secret en AWS Secrets Manager

set -e

echo "🔧 Actualización de Stripe Webhook Secret"
echo "========================================"
echo ""

# Verificar que estamos en la cuenta correcta
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ "$ACCOUNT_ID" != "287103448174" ]; then
    echo "❌ Error: Cuenta AWS incorrecta. Esperada: 287103448174, Actual: $ACCOUNT_ID"
    exit 1
fi

# Solicitar el webhook secret
echo "Ingresa el Stripe Webhook Secret (comienza con 'whsec_'):"
read -s WEBHOOK_SECRET
echo ""

# Validar formato
if [[ ! "$WEBHOOK_SECRET" =~ ^whsec_ ]]; then
    echo "❌ Error: El webhook secret debe comenzar con 'whsec_'"
    exit 1
fi

# Obtener secretos actuales
echo "📥 Obteniendo configuración actual..."
CURRENT_SECRETS=$(aws secretsmanager get-secret-value \
    --secret-id logos-backend-secrets \
    --query SecretString \
    --output text \
    --region us-east-1)

# Actualizar con el nuevo webhook secret
echo "🔄 Actualizando webhook secret..."
UPDATED_SECRETS=$(echo $CURRENT_SECRETS | jq ". + {\"STRIPE_WEBHOOK_SECRET\": \"$WEBHOOK_SECRET\"}")

# Guardar en AWS Secrets Manager
aws secretsmanager update-secret \
    --secret-id logos-backend-secrets \
    --secret-string "$UPDATED_SECRETS" \
    --region us-east-1

echo "✅ Webhook secret actualizado en AWS Secrets Manager"
echo ""

# Preguntar si quiere reiniciar el servicio
echo "¿Deseas reiniciar el servicio ECS para aplicar los cambios? (s/n)"
read -p "> " RESTART

if [ "$RESTART" = "s" ]; then
    echo "🔄 Reiniciando servicio ECS..."
    aws ecs update-service \
        --cluster logos-production-cluster \
        --service logos-backend-correct \
        --force-new-deployment \
        --region us-east-1 \
        --output json > /dev/null
    
    echo "✅ Servicio reiniciado. Los cambios se aplicarán en ~2-3 minutos"
    echo ""
    echo "Puedes monitorear el progreso con:"
    echo "aws ecs describe-services --cluster logos-production-cluster --services logos-backend-correct --query 'services[0].deployments'"
else
    echo ""
    echo "⚠️  Recuerda reiniciar el servicio manualmente para aplicar los cambios:"
    echo "aws ecs update-service --cluster logos-production-cluster --service logos-backend-correct --force-new-deployment"
fi

echo ""
echo "📝 Próximos pasos:"
echo "1. Verifica el webhook en: https://dashboard.stripe.com/webhooks"
echo "2. Envía un webhook de prueba desde el dashboard"
echo "3. Revisa los logs: aws logs tail /ecs/logos-backend --follow --filter-pattern webhook"
echo ""
echo "🎉 Configuración completada!"