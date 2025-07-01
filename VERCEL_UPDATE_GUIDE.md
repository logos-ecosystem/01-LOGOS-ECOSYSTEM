# 🚀 Actualización de Variables en Vercel

## 📋 Variables a Actualizar

### 1. Ve a Vercel Dashboard
- URL: https://vercel.com/dashboard
- Selecciona el proyecto: `logos-ecosystem`
- Ve a: **Settings** → **Environment Variables**

### 2. Actualiza estas variables:

#### API URLs (cambiar de HTTP a HTTPS):
```
NEXT_PUBLIC_API_URL=https://api.logos-ecosystem.com
NEXT_PUBLIC_API_BASE_URL=https://api.logos-ecosystem.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.logos-ecosystem.com
```

#### Mantén estas como están:
```
NEXT_PUBLIC_APP_NAME=LOGOS AI Ecosystem
NEXT_PUBLIC_APP_URL=https://logos-ecosystem.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RaDNFR452PkkFcmR6MA3fj3iRLq93pxyUPKZphkcAxEhxgemrNCQxz88rh2RIQT5eGnPr8hEWtsl8a96iGGgUhJ00iGXmKqxb
NEXT_PUBLIC_PAYPAL_CLIENT_ID=ATBj6N9mVxmnb_K_kD22oruRwdRbNCEumxeqEkcjBWnKs6F1USSLYgNOWqxMjABUh_9RwOFGkpCck73U
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_BETA_FEATURES=true
```

### 3. Pasos para actualizar cada variable:

1. **Encuentra la variable** en la lista
2. **Click en los 3 puntos** (...) a la derecha
3. **Click en "Edit"**
4. **Cambia el valor**:
   - `http://` → `https://`
   - `ws://` → `wss://`
5. **Save**

### 4. Redeploy después de actualizar

Después de actualizar todas las variables:
1. Ve a **Deployments**
2. En el deployment más reciente, click en los 3 puntos (...) 
3. Click en **"Redeploy"**
4. Click en **"Redeploy"** en el modal

## 🔍 Verificación

Después del redeploy (2-3 minutos):

1. Abre: https://logos-ecosystem.vercel.app
2. Abre las DevTools (F12)
3. Ve a la pestaña **Network**
4. Las llamadas API deberían ir a `https://api.logos-ecosystem.com`

## ⚡ Alternativa: Usando Vercel CLI

Si tienes Vercel CLI instalado:

```bash
cd frontend

# Listar variables actuales
vercel env ls

# Actualizar una por una
vercel env add NEXT_PUBLIC_API_URL production
# Ingresa: https://api.logos-ecosystem.com

vercel env add NEXT_PUBLIC_API_BASE_URL production
# Ingresa: https://api.logos-ecosystem.com/api/v1

vercel env add NEXT_PUBLIC_WS_URL production
# Ingresa: wss://api.logos-ecosystem.com

# Redeploy
vercel --prod
```

## 📝 Resumen de cambios:

| Variable | Antes | Después |
|----------|--------|---------|
| NEXT_PUBLIC_API_URL | http://logos-backend-alb-915729089... | https://api.logos-ecosystem.com |
| NEXT_PUBLIC_API_BASE_URL | http://logos-backend-alb-915729089.../api/v1 | https://api.logos-ecosystem.com/api/v1 |
| NEXT_PUBLIC_WS_URL | ws://logos-backend-alb-915729089... | wss://api.logos-ecosystem.com |

---

**¿Ya estás en el dashboard de Vercel?**