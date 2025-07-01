# ✅ Configuración Final del Webhook de Stripe

## 🎯 Webhook URL Lista para Usar

```
https://18ginwwfz6.execute-api.us-east-1.amazonaws.com/prod/stripe
```

## 📋 Pasos para Configurar en Stripe

### 1. Acceder a Stripe Dashboard
- Ve a https://dashboard.stripe.com
- Inicia sesión con tu cuenta

### 2. Crear el Webhook
1. Ve a **Developers** → **Webhooks**
2. Click en **"Add endpoint"**
3. **Endpoint URL**: 
   ```
   https://18ginwwfz6.execute-api.us-east-1.amazonaws.com/prod/stripe
   ```
4. **Description**: `LOGOS Ecosystem Lambda Webhook`

### 3. Seleccionar Eventos
Selecciona estos eventos esenciales:

- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### 4. Guardar y Copiar el Secret
1. Click en **"Add endpoint"**
2. **IMPORTANTE**: Copia el **Signing secret** (empieza con `whsec_`)
3. Guárdalo aquí temporalmente:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_________________________________
   ```

## 🔐 Actualizar el Secret en AWS

```bash
# Obtener secretos actuales
CURRENT=$(aws secretsmanager get-secret-value \
  --secret-id logos-backend-secrets \
  --query SecretString \
  --output text)

# Añadir el webhook secret
UPDATED=$(echo $CURRENT | jq '. + {"STRIPE_WEBHOOK_SECRET": "whsec_TU_SECRET_AQUI"}')

# Actualizar
aws secretsmanager update-secret \
  --secret-id logos-backend-secrets \
  --secret-string "$UPDATED"
```

## ✅ Verificar Funcionamiento

### 1. En Stripe Dashboard
- Click en tu webhook endpoint
- Click en **"Send test webhook"**
- Selecciona `payment_intent.succeeded`
- Click **"Send test webhook"**

### 2. Ver Logs de Lambda
```bash
aws logs tail /aws/lambda/logos-stripe-webhook --follow
```

### 3. Verificar Respuesta
- Si Stripe muestra **200** = ✅ Funcionando
- Si muestra **400** = ⚠️ Verificar el secret
- Si muestra **500** = ❌ Error de configuración

## 🎉 Estado Actual

### ✅ Completado
- Lambda function desplegada
- API Gateway configurado
- Dependencias instaladas (Stripe SDK)
- Permisos de AWS configurados
- URL del webhook activa

### ⏳ Pendiente
- Configurar en Stripe Dashboard
- Actualizar STRIPE_WEBHOOK_SECRET en Secrets Manager

## 📊 Arquitectura Final

```
Stripe → API Gateway → Lambda → Secrets Manager
                        ↓
                    DynamoDB
```

## 🔍 Monitoreo

### CloudWatch Logs
```bash
# Ver todos los logs
aws logs tail /aws/lambda/logos-stripe-webhook --follow

# Filtrar solo errores
aws logs tail /aws/lambda/logos-stripe-webhook --follow --filter-pattern ERROR
```

### Métricas
- Ve a CloudWatch → Lambda → logos-stripe-webhook
- Revisa:
  - Invocaciones
  - Errores
  - Duración
  - Throttles

## 💡 Ventajas de esta Solución

1. **Serverless**: No necesitas mantener servidores
2. **Auto-escalable**: Lambda escala automáticamente
3. **Costo-efectivo**: Solo pagas por uso
4. **Independiente**: No afecta al backend principal
5. **Fácil de actualizar**: Solo cambias el código de Lambda

## 🚀 Próximos Pasos

1. **Configurar en Stripe** (5 minutos)
2. **Actualizar el secret** (2 minutos)
3. **Probar con webhook real** (2 minutos)
4. **Monitorear primeros eventos** (ongoing)

---

**Stack de CloudFormation**: `logos-stripe-webhook`
**Lambda Function**: `logos-stripe-webhook`
**API Gateway**: `logos-stripe-webhook-api`

La solución está lista y esperando configuración en Stripe.