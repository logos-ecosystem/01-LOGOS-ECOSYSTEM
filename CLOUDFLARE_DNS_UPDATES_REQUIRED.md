# 🌐 CLOUDFLARE DNS - CAMBIOS REQUERIDOS

## ⚡ CAMBIOS URGENTES

### 1. Backend API (CRÍTICO - Ya configurado HTTPS)
**Registro**: `api`
- **Tipo**: CNAME
- **Nombre**: `api`
- **Contenido ACTUAL**: `logos-backend-alb-915729089.us-east-1.elb.amazonaws.com`
- **Contenido NUEVO**: `logos-backend-alb-new-1190223801.us-east-1.elb.amazonaws.com`
- **Proxy**: **DNS only** (nube gris)
- **TTL**: Auto

**Estado**: El backend está funcionando correctamente con HTTPS en el nuevo ALB. Solo falta actualizar el DNS.

### 2. Frontend - Dominio Principal
**Registro**: `@` (root)
- **Tipo**: A
- **Nombre**: `@`
- **Contenido**: `76.76.21.21`
- **Proxy**: **DNS only** (nube gris)
- **TTL**: Auto

### 3. Frontend - Subdominio WWW
**Registro**: `www`
- **Tipo**: CNAME
- **Nombre**: `www`
- **Contenido**: `cname.vercel-dns.com`
- **Proxy**: **DNS only** (nube gris)
- **TTL**: Auto

## ✅ REGISTROS QUE NO DEBEN CAMBIARSE

### Validación SSL (NO TOCAR)
1. **_2f055c51e614a2444d0a88854de270c0.api**
   - CNAME → _1ff3bfa540a755abb9a5c76252d167e2.xlfgrmvvlj.acm-validations.aws.

2. **_587455ae94fbfc755b23f30b3a3ab9e6**
   - CNAME → _feb0b58d45f7fe096680f1c2ace7fffe.xlfgrmvvlj.acm-validations.aws.

## 🚀 PASOS PARA ACTUALIZAR

1. Ingresa a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona el dominio `logos-ecosystem.com`
3. Ve a **DNS** → **Records**
4. Actualiza cada registro según las instrucciones anteriores

## 🔍 VERIFICACIÓN POST-CAMBIO

Después de actualizar (espera 5-10 minutos):

```bash
# Verificar API Backend
curl https://api.logos-ecosystem.com/api/v1/health

# Verificar Frontend
curl -I https://logos-ecosystem.com
curl -I https://www.logos-ecosystem.com
```

## 📊 ESTADO ACTUAL

- ✅ Backend HTTPS configurado y funcionando en nuevo ALB
- ✅ Certificado SSL activo para api.logos-ecosystem.com
- ✅ Frontend desplegado en Vercel
- ✅ Dominios verificados en Vercel
- ⏳ Solo falta actualizar DNS en Cloudflare

---
**Última actualización**: $(date)