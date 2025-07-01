# 🔧 Configuración de Stripe Webhooks

## 📋 Pasos para Configurar

### 1. Acceder al Dashboard de Stripe
1. Ve a https://dashboard.stripe.com
2. Inicia sesión con tu cuenta
3. Ve a **Developers** → **Webhooks**

### 2. Crear un Nuevo Endpoint
1. Click en **"Add endpoint"**
2. En **Endpoint URL**, ingresa:
   ```
   https://api.logos-ecosystem.com/api/v1/payments/webhooks/stripe
   ```
3. En **Description**, ingresa: "LOGOS Ecosystem Production Webhook"

### 3. Seleccionar Eventos
Selecciona los siguientes eventos:

#### Pagos
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `payment_intent.canceled`
- ✅ `payment_intent.created`

#### Cargos
- ✅ `charge.succeeded`
- ✅ `charge.failed`
- ✅ `charge.refunded`
- ✅ `charge.dispute.created`

#### Clientes
- ✅ `customer.created`
- ✅ `customer.updated`
- ✅ `customer.deleted`

#### Suscripciones
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `customer.subscription.trial_will_end`

#### Facturas
- ✅ `invoice.created`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `invoice.finalized`

#### Métodos de Pago
- ✅ `payment_method.attached`
- ✅ `payment_method.detached`
- ✅ `payment_method.updated`

### 4. Obtener el Webhook Secret
1. Después de crear el endpoint, Stripe mostrará un **"Signing secret"**
2. Comenzará con `whsec_`
3. Copia este valor - lo necesitarás para el siguiente paso

### 5. Actualizar AWS Secrets Manager

```bash
# Actualizar el secreto en AWS
aws secretsmanager update-secret \
  --secret-id logos-backend-secrets \
  --secret-string '{"STRIPE_WEBHOOK_SECRET":"whsec_TU_SECRETO_AQUI"}' \
  --region us-east-1
```

O puedes usar el script helper:

```bash
#!/bin/bash
# update-stripe-webhook.sh

WEBHOOK_SECRET="whsec_TU_SECRETO_AQUI"

# Obtener secretos actuales
CURRENT_SECRETS=$(aws secretsmanager get-secret-value \
  --secret-id logos-backend-secrets \
  --query SecretString \
  --output text)

# Actualizar con el nuevo webhook secret
UPDATED_SECRETS=$(echo $CURRENT_SECRETS | jq ". + {\"STRIPE_WEBHOOK_SECRET\": \"$WEBHOOK_SECRET\"}")

# Actualizar en AWS
aws secretsmanager update-secret \
  --secret-id logos-backend-secrets \
  --secret-string "$UPDATED_SECRETS"

echo "✅ Stripe Webhook Secret actualizado"
```

### 6. Reiniciar el Servicio ECS

```bash
# Forzar nuevo deployment para que tome los cambios
aws ecs update-service \
  --cluster logos-production-cluster \
  --service logos-backend-correct \
  --force-new-deployment \
  --region us-east-1
```

## 🧪 Probar el Webhook

### Opción 1: Stripe CLI (Recomendado para desarrollo)
```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Reenviar eventos al endpoint local
stripe listen --forward-to https://api.logos-ecosystem.com/api/v1/payments/webhooks/stripe

# En otra terminal, trigger un evento de prueba
stripe trigger payment_intent.succeeded
```

### Opción 2: Desde el Dashboard
1. En el webhook creado, click en **"Send test webhook"**
2. Selecciona el tipo de evento
3. Click en **"Send test webhook"**
4. Verifica en los logs que se recibió correctamente

## 📊 Monitoreo

### Ver Logs en AWS CloudWatch
```bash
# Ver logs del webhook
aws logs tail /ecs/logos-backend --follow --filter-pattern "webhook"
```

### Verificar en Stripe Dashboard
- Ve a **Developers** → **Webhooks** → **[Tu endpoint]**
- Revisa la sección **"Recent deliveries"**
- Cada intento mostrará:
  - Status (200 = éxito)
  - Tiempo de respuesta
  - Detalles del evento

## 🔍 Troubleshooting

### Error 400: Invalid signature
- Verifica que el STRIPE_WEBHOOK_SECRET sea correcto
- Asegúrate de que no haya espacios extra al copiar

### Error 500: Internal server error
- Revisa los logs de CloudWatch
- Verifica que la base de datos esté accesible

### Timeout
- El webhook debe responder en menos de 20 segundos
- Considera procesar eventos de forma asíncrona

## 📝 Eventos Importantes

### payment_intent.succeeded
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234",
      "amount": 2000,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "user_id": "user_123",
        "order_id": "order_456"
      }
    }
  }
}
```

### customer.subscription.created
```json
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_1234",
      "customer": "cus_5678",
      "status": "active",
      "items": {
        "data": [{
          "price": {
            "id": "price_1234",
            "recurring": {
              "interval": "month"
            }
          }
        }]
      }
    }
  }
}
```

## ✅ Verificación Final

1. **Webhook activo**: Estado "Enabled" en Stripe Dashboard
2. **Eventos llegando**: Revisar "Recent deliveries" muestra status 200
3. **Base de datos actualizada**: Los pagos se reflejan en la DB
4. **Logs limpios**: No hay errores en CloudWatch

---

**Importante**: Mantén el webhook secret seguro y nunca lo expongas en el código o logs.