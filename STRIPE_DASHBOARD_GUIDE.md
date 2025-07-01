# 🚀 Guía Rápida - Configuración de Stripe Dashboard

## 📋 Checklist de Configuración

### 1. Acceder al Dashboard
- [ ] Ve a https://dashboard.stripe.com
- [ ] Inicia sesión con tus credenciales

### 2. Navegar a Webhooks
- [ ] Click en **Developers** en el menú lateral
- [ ] Click en **Webhooks**
- [ ] Click en **Add endpoint**

### 3. Configurar el Endpoint
- [ ] **Endpoint URL**: 
  ```
  https://api.logos-ecosystem.com/api/v1/payments/webhooks/stripe
  ```
- [ ] **Description**: `LOGOS Ecosystem Production Webhook`

### 4. Seleccionar Eventos (IMPORTANTE)
Marca TODOS estos eventos:

#### Pagos Básicos
- [ ] `payment_intent.succeeded`
- [ ] `payment_intent.payment_failed`
- [ ] `payment_intent.canceled`
- [ ] `payment_intent.created`

#### Cargos
- [ ] `charge.succeeded`
- [ ] `charge.failed`
- [ ] `charge.refunded`

#### Suscripciones
- [ ] `customer.subscription.created`
- [ ] `customer.subscription.updated`
- [ ] `customer.subscription.deleted`
- [ ] `customer.subscription.trial_will_end`

#### Checkout
- [ ] `checkout.session.completed`

#### Clientes
- [ ] `customer.created`
- [ ] `customer.updated`

#### Métodos de Pago
- [ ] `payment_method.attached`
- [ ] `payment_method.detached`

### 5. Guardar y Obtener el Secret
- [ ] Click en **Add endpoint**
- [ ] COPIA el **Signing secret** (empieza con `whsec_`)
- [ ] Guárdalo temporalmente aquí:
  ```
  STRIPE_WEBHOOK_SECRET=whsec_________________________________
  ```

## 🔐 Actualizar el Secret en AWS

Una vez que tengas el webhook secret, ejecuta:

```bash
cd /home/juan/Claude/LOGOS-ECOSYSTEM/backend
./update-stripe-webhook.sh
```

Cuando te pida el secret, pega el valor que copiaste.

## ✅ Verificar la Configuración

### 1. En Stripe Dashboard
- [ ] El webhook aparece como "Active"
- [ ] Los eventos están listados correctamente

### 2. Enviar Test Webhook
- [ ] Click en tu webhook endpoint
- [ ] Click en **Send test webhook**
- [ ] Selecciona `payment_intent.succeeded`
- [ ] Click **Send test webhook**

### 3. Verificar Respuesta
- [ ] Si responde 200 = ✅ Funcionando
- [ ] Si responde 400 = ⚠️ Verificar el secret
- [ ] Si responde 404 = ❌ Problema con el endpoint

## 🔍 Si el Webhook Devuelve 404

Ejecuta estos comandos para diagnosticar:

```bash
# 1. Verificar que el servicio esté corriendo
aws ecs describe-services \
  --cluster logos-production-cluster \
  --services logos-backend-correct \
  --query 'services[0].runningCount'

# 2. Ver logs recientes
aws logs tail /ecs/logos-backend --since 5m

# 3. Reiniciar el servicio
aws ecs update-service \
  --cluster logos-production-cluster \
  --service logos-backend-correct \
  --force-new-deployment
```

## 📊 Monitoreo Post-Configuración

```bash
# Ver eventos de webhook en tiempo real
aws logs tail /ecs/logos-backend --follow --filter-pattern "webhook"
```

## 💡 Alternativa si Persiste el 404

Si el webhook sigue sin funcionar, podemos:
1. Crear un Lambda function dedicado
2. Usar API Gateway + Lambda
3. Configurar un endpoint temporal para debugging

---

**IMPORTANTE**: No compartas el webhook secret en ningún lugar público. Solo úsalo en el script de actualización.