#!/bin/bash
# Script para probar el webhook de Stripe

echo "🧪 Prueba de Webhook de Stripe"
echo "=============================="
echo ""

# Verificar que curl está instalado
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl no está instalado"
    exit 1
fi

# URL del webhook
WEBHOOK_URL="https://api.logos-ecosystem.com/api/v1/payments/webhooks/stripe"

# Crear un payload de prueba
PAYLOAD='{
  "id": "evt_test_webhook",
  "object": "event",
  "api_version": "2023-10-16",
  "created": 1700000000,
  "data": {
    "object": {
      "id": "pi_test_1234567890",
      "object": "payment_intent",
      "amount": 2000,
      "amount_capturable": 0,
      "amount_received": 2000,
      "currency": "usd",
      "customer": "cus_test_1234",
      "description": "Test payment",
      "metadata": {
        "user_id": "test_user_123",
        "order_id": "test_order_456"
      },
      "status": "succeeded",
      "created": 1700000000,
      "livemode": false
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "payment_intent.succeeded"
}'

# Enviar webhook de prueba (sin firma - fallará la verificación)
echo "📤 Enviando webhook de prueba (sin firma)..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📥 Respuesta del servidor:"
echo "HTTP Status: $HTTP_CODE"
echo "Body: $BODY"
echo ""

if [ "$HTTP_CODE" = "400" ]; then
    echo "✅ El webhook rechazó correctamente la petición sin firma válida"
    echo "   Esto es el comportamiento esperado para seguridad."
else
    echo "⚠️  Código de respuesta inesperado: $HTTP_CODE"
fi

echo ""
echo "📝 Para una prueba completa con firma válida:"
echo "1. Instala Stripe CLI: brew install stripe/stripe-cli/stripe"
echo "2. Ejecuta: stripe login"
echo "3. Ejecuta: stripe listen --forward-to $WEBHOOK_URL"
echo "4. En otra terminal: stripe trigger payment_intent.succeeded"
echo ""
echo "🔍 Para ver los logs del webhook:"
echo "aws logs tail /ecs/logos-backend --follow --filter-pattern webhook"