# 🌐 Configuración Completa de api.logos-ecosystem.com en Cloudflare

## 📋 Registros DNS Necesarios

### 1️⃣ Registro Principal API (Para el ALB)
- **Type**: CNAME
- **Name**: `api`
- **Target**: `logos-backend-alb-915729089.us-east-1.elb.amazonaws.com`
- **Proxy**: DNS only (☁️ gris - IMPORTANTE)
- **TTL**: Auto

### 2️⃣ Registro Validación SSL #1
- **Type**: CNAME
- **Name**: `_2f055c51e614a2444d0a88854de270c0.api`
- **Target**: `_1ff3bfa540a755abb9a5c76252d167e2.xlfgrmvvlj.acm-validations.aws.`
- **Proxy**: DNS only (☁️ gris)
- **TTL**: Auto

### 3️⃣ Registro Validación SSL #2
- **Type**: CNAME
- **Name**: `_587455ae94fbfc755b23f30b3a3ab9e6`
- **Target**: `_feb0b58d45f7fe096680f1c2ace7fffe.xlfgrmvvlj.acm-validations.aws.`
- **Proxy**: DNS only (☁️ gris)
- **TTL**: Auto

## 🔧 Pasos Detallados en Cloudflare

### Paso 1: Acceder a DNS
1. Ve a https://dash.cloudflare.com
2. Selecciona `logos-ecosystem.com`
3. En el menú lateral, click en **DNS**

### Paso 2: Agregar Registro API Principal
1. Click en **"Add record"** (botón azul)
2. Completa:
   - Type: `CNAME`
   - Name: `api` (solo escribe "api", no todo el dominio)
   - Target: `logos-backend-alb-915729089.us-east-1.elb.amazonaws.com`
   - Proxy status: Click para que quede **GRIS** (DNS only)
   - TTL: `Auto`
3. Click **"Save"**

### Paso 3: Agregar Registro Validación SSL #1
1. Click en **"Add record"** nuevamente
2. Completa:
   - Type: `CNAME`
   - Name: `_2f055c51e614a2444d0a88854de270c0.api`
   - Target: `_1ff3bfa540a755abb9a5c76252d167e2.xlfgrmvvlj.acm-validations.aws.`
   - Proxy status: **GRIS** (DNS only)
   - TTL: `Auto`
3. Click **"Save"**

### Paso 4: Agregar Registro Validación SSL #2
1. Click en **"Add record"** otra vez
2. Completa:
   - Type: `CNAME`
   - Name: `_587455ae94fbfc755b23f30b3a3ab9e6`
   - Target: `_feb0b58d45f7fe096680f1c2ace7fffe.xlfgrmvvlj.acm-validations.aws.`
   - Proxy status: **GRIS** (DNS only)
   - TTL: `Auto`
3. Click **"Save"**

## ✅ Verificación

Después de agregar los 3 registros, deberías ver algo así en tu lista de DNS:

```
api                                    CNAME    logos-backend-alb-915...     DNS only
_2f055c51e614a2444d0a88854de270c0.api CNAME    _1ff3bfa540a755abb9a5c...  DNS only
_587455ae94fbfc755b23f30b3a3ab9e6     CNAME    _feb0b58d45f7fe096680f1...  DNS only
```

## ⚠️ MUY IMPORTANTE

1. **NO actives el proxy de Cloudflare** (nube naranja) para estos registros
2. **Todos deben estar en "DNS only"** (nube gris)
3. **Copia y pega exactamente** los valores de Target, incluyendo el punto final

## 🕐 Tiempos

- **Propagación DNS**: 5-30 minutos típicamente
- **Validación SSL**: AWS verificará automáticamente (5-30 min)
- **Total**: En 1 hora debería estar todo funcionando

## 🔍 Test Rápido

Después de 10 minutos, prueba:
```bash
# Verificar DNS
dig api.logos-ecosystem.com

# Debería resolver a:
# logos-backend-alb-915729089.us-east-1.elb.amazonaws.com
```

---

**¿Necesitas ayuda con algún paso específico?**