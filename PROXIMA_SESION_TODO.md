# 📋 TODO - Próxima Sesión

## 🎯 Objetivo Principal
Completar la configuración de Stripe Webhooks y resolver el error 404

## 🔴 Tareas Críticas (Hacer Primero)

### 1. Configurar Stripe Dashboard
```bash
# Archivo con instrucciones:
cat STRIPE_DASHBOARD_GUIDE.md

# Pasos:
1. Ir a https://dashboard.stripe.com
2. Developers → Webhooks → Add endpoint
3. URL: https://api.logos-ecosystem.com/api/v1/payments/webhooks/stripe
4. Copiar el webhook secret (whsec_...)
```

### 2. Actualizar Webhook Secret
```bash
cd /home/juan/Claude/LOGOS-ECOSYSTEM/backend
./update-stripe-webhook.sh
# Pegar el secret cuando lo pida
```

### 3. Diagnosticar el Error 404
```bash
# Verificar que el endpoint esté registrado
curl https://api.logos-ecosystem.com/openapi.json | jq '.paths' | grep webhook

# Ver logs del servicio
aws logs get-log-events \
  --log-group-name /ecs/logos-backend \
  --log-stream-name $(aws logs describe-log-streams --log-group-name /ecs/logos-backend --order-by LastEventTime --descending --max-items 1 --query 'logStreams[0].logStreamName' --output text) \
  --limit 50 | jq -r '.events[].message' | grep -E "(route|webhook|payment)"

# Si persiste el 404, considerar:
- Revisar src/api/routes/payment.py línea 491
- Verificar que include_in_schema=False no esté bloqueando
- Considerar quitar include_in_schema=False temporalmente
```

## 🟡 Tareas Secundarias

### 4. Probar el Webhook
```bash
# Opción 1: Desde Stripe Dashboard
- Send test webhook → payment_intent.succeeded

# Opción 2: Con Stripe CLI
stripe listen --forward-to https://api.logos-ecosystem.com/api/v1/payments/webhooks/stripe
stripe trigger payment_intent.succeeded
```

### 5. Monitorear Resultados
```bash
# Ver logs en tiempo real
aws logs tail /ecs/logos-backend --follow --filter-pattern "webhook"
```

## 🟢 Si Todo Funciona

### 6. Verificar Integración Completa
- [ ] Crear un pago de prueba
- [ ] Verificar que el webhook se ejecute
- [ ] Confirmar actualización en base de datos
- [ ] Verificar logs sin errores

### 7. Documentar Configuración Final
```bash
# Actualizar documentación
echo "Webhook configurado: $(date)" >> DEPLOYMENT_FINAL_STATUS.md
```

## 🔧 Plan B - Si el 404 Persiste

### Opción 1: Modificar el Código
```python
# En src/api/routes/payment.py, línea 491
# Cambiar:
@router.post("/webhooks/stripe", include_in_schema=False)
# Por:
@router.post("/webhooks/stripe")
```

### Opción 2: Lambda + API Gateway
```bash
# Crear Lambda function
# Ver payment_webhook_handler.py como referencia
# Configurar API Gateway → Lambda
# Usar esa URL en Stripe
```

## 📊 Verificación Final
- [ ] Webhook responde 200 en Stripe Dashboard
- [ ] Logs muestran eventos procesados
- [ ] Base de datos actualizada correctamente
- [ ] No hay errores en CloudWatch

## 💡 Recordatorios
- El sistema está en PRODUCCIÓN
- No exponer el webhook secret
- Hacer cambios con cuidado
- Monitorear después de cada cambio

---
**Tiempo estimado**: 30-45 minutos
**Prioridad**: ALTA - Los pagos necesitan webhooks para funcionar correctamente