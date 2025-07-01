# 🌐 Configuración Completa de api.logos-ecosystem.com

## 📋 CONFIGURACIÓN DNS EN CLOUDFLARE

### 1. Registro Principal API (ACTUALIZAR)
**IMPORTANTE: Este es el que necesitas cambiar**

- **Type**: `CNAME`
- **Name**: `api`
- **Target**: `logos-backend-alb-new-1190223801.us-east-1.elb.amazonaws.com`
- **Proxy status**: **DNS only** (nube gris - MUY IMPORTANTE)
- **TTL**: `Auto`

### 2. Registros de Validación SSL (YA CONFIGURADOS)
Estos ya están configurados y funcionando, NO los cambies:

#### Registro SSL #1
- **Type**: `CNAME`
- **Name**: `_2f055c51e614a2444d0a88854de270c0.api`
- **Target**: `_1ff3bfa540a755abb9a5c76252d167e2.xlfgrmvvlj.acm-validations.aws.`
- **Proxy status**: **DNS only**
- **TTL**: `Auto`

#### Registro SSL #2
- **Type**: `CNAME`
- **Name**: `_587455ae94fbfc755b23f30b3a3ab9e6`
- **Target**: `_feb0b58d45f7fe096680f1c2ace7fffe.xlfgrmvvlj.acm-validations.aws.`
- **Proxy status**: **DNS only**
- **TTL**: `Auto`

## 🔧 CONFIGURACIÓN DEL BACKEND AWS

### Load Balancer (ALB)
- **DNS Name**: `logos-backend-alb-new-1190223801.us-east-1.elb.amazonaws.com`
- **Type**: Application Load Balancer
- **Scheme**: Internet-facing
- **IP address type**: IPv4
- **Listeners**:
  - Port 80 (HTTP) → Redirect to HTTPS
  - Port 443 (HTTPS) → Forward to Target Group

### Target Group
- **Name**: `logos-backend-tg-new`
- **Protocol**: HTTP
- **Port**: 8000
- **Target type**: IP
- **Health check path**: `/api/v1/health/`
- **Health check interval**: 30 seconds
- **Healthy threshold**: 2
- **Unhealthy threshold**: 2

### SSL Certificate
- **Domain**: `api.logos-ecosystem.com`
- **Type**: AWS Certificate Manager (ACM)
- **Status**: Issued
- **ARN**: `arn:aws:acm:us-east-1:287103448174:certificate/1ac308b0-6e8a-428d-ae62-e102c649c237`
- **Validation**: DNS validated

### ECS Service
- **Cluster**: `logos-production-cluster`
- **Service**: `logos-backend-correct`
- **Task Definition**: `logos-backend:latest`
- **Desired count**: 2
- **Launch type**: Fargate
- **Platform version**: LATEST

## 🔐 CONFIGURACIÓN DE SEGURIDAD

### Security Group Rules
**Inbound:**
- **HTTP (80)**: 0.0.0.0/0 (Redirects to HTTPS)
- **HTTPS (443)**: 0.0.0.0/0
- **Custom TCP (8000)**: From ALB security group only

**Outbound:**
- **All traffic**: 0.0.0.0/0

### CORS Configuration
```javascript
{
  "allowedOrigins": [
    "https://logos-ecosystem.vercel.app",
    "https://logos-ecosystem.com",
    "https://www.logos-ecosystem.com"
  ],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allowedHeaders": ["*"],
  "exposedHeaders": ["X-Total-Count"],
  "credentials": true,
  "maxAge": 86400
}
```

## 📊 ENDPOINTS DISPONIBLES

### Health Check
- `GET https://api.logos-ecosystem.com/health`
- `GET https://api.logos-ecosystem.com/api/v1/health`

### API Documentation
- `GET https://api.logos-ecosystem.com/docs`
- `GET https://api.logos-ecosystem.com/redoc`

### Authentication
- `POST https://api.logos-ecosystem.com/api/v1/auth/register`
- `POST https://api.logos-ecosystem.com/api/v1/auth/login`
- `POST https://api.logos-ecosystem.com/api/v1/auth/refresh`
- `POST https://api.logos-ecosystem.com/api/v1/auth/logout`

### Products
- `GET https://api.logos-ecosystem.com/api/v1/products`
- `GET https://api.logos-ecosystem.com/api/v1/products/{id}`
- `POST https://api.logos-ecosystem.com/api/v1/products`
- `PUT https://api.logos-ecosystem.com/api/v1/products/{id}`
- `DELETE https://api.logos-ecosystem.com/api/v1/products/{id}`

### Subscriptions
- `GET https://api.logos-ecosystem.com/api/v1/subscriptions`
- `POST https://api.logos-ecosystem.com/api/v1/subscriptions/create`
- `POST https://api.logos-ecosystem.com/api/v1/subscriptions/{id}/cancel`
- `PUT https://api.logos-ecosystem.com/api/v1/subscriptions/{id}/update`

### Payments
- `POST https://api.logos-ecosystem.com/api/v1/payments/create-checkout`
- `POST https://api.logos-ecosystem.com/api/v1/payments/create-subscription`
- `GET https://api.logos-ecosystem.com/api/v1/payments/history`
- `POST https://api.logos-ecosystem.com/webhooks/stripe`

### Support
- `GET https://api.logos-ecosystem.com/api/v1/support/tickets`
- `POST https://api.logos-ecosystem.com/api/v1/support/tickets`
- `GET https://api.logos-ecosystem.com/api/v1/support/tickets/{id}`
- `PUT https://api.logos-ecosystem.com/api/v1/support/tickets/{id}`

### AI Services
- `POST https://api.logos-ecosystem.com/api/v1/ai/chat`
- `POST https://api.logos-ecosystem.com/api/v1/ai/generate`
- `GET https://api.logos-ecosystem.com/api/v1/ai/models`

### WebSocket
- `wss://api.logos-ecosystem.com/ws`

## 🔄 HEADERS REQUERIDOS

### Request Headers
```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
Accept: application/json
X-API-Version: v1
```

### Response Headers
```http
X-Request-ID: {uuid}
X-Rate-Limit-Limit: 100
X-Rate-Limit-Remaining: 99
X-Rate-Limit-Reset: 1719131234
```

## 📈 LÍMITES Y QUOTAS

- **Rate Limit**: 100 requests per 15 minutes per IP
- **Payload Size**: Max 10MB per request
- **WebSocket Connections**: Max 1000 concurrent
- **File Upload**: Max 50MB per file

## 🛠️ CONFIGURACIÓN EN CLOUDFLARE

### SSL/TLS
- **Encryption mode**: Full (strict)
- **Always Use HTTPS**: ON
- **Minimum TLS Version**: 1.2
- **Opportunistic Encryption**: ON
- **TLS 1.3**: ON

### Security
- **Security Level**: Medium
- **Challenge Passage**: 30 minutes
- **Browser Integrity Check**: ON
- **Privacy Pass Support**: ON

### Performance
- **HTTP/2**: ON
- **HTTP/3 (with QUIC)**: ON
- **0-RTT Connection Resumption**: ON
- **gRPC**: ON
- **WebSockets**: ON

### Caching
- **Caching Level**: Standard
- **Browser Cache TTL**: Respect Existing Headers
- **Always Online**: OFF (API no necesita caché estático)

## 🚀 PASOS PARA ACTUALIZAR EN CLOUDFLARE

1. **Login** en https://dash.cloudflare.com
2. **Selecciona** el dominio `logos-ecosystem.com`
3. **Ve a** DNS → Records
4. **Busca** el registro `api` (CNAME)
5. **Click** en "Edit" (lápiz)
6. **Cambia** el Target de:
   - `logos-backend-alb-915729089.us-east-1.elb.amazonaws.com` (antiguo)
7. **A**:
   - `logos-backend-alb-new-1190223801.us-east-1.elb.amazonaws.com` (nuevo)
8. **Asegúrate** que Proxy status esté en **DNS only** (nube gris)
9. **Save**

## ✅ VERIFICACIÓN POST-CAMBIO

Después de actualizar (espera 5-10 minutos para propagación DNS):

```bash
# Verificar DNS
dig api.logos-ecosystem.com

# Verificar HTTPS
curl -I https://api.logos-ecosystem.com/health

# Verificar API
curl https://api.logos-ecosystem.com/api/v1/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2024-06-23T07:45:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "connected"
  }
}
```

---

**IMPORTANTE**: El cambio principal es actualizar el CNAME de `api` al nuevo ALB. Los demás registros (validación SSL) NO deben modificarse.