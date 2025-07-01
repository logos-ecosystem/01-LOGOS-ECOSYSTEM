# 🌐 Configuración DNS en Cloudflare para LOGOS Ecosystem

## 📋 Registros DNS Necesarios

### 1️⃣ Frontend (Vercel)

Para conectar con Vercel necesitas:

| Tipo | Nombre | Contenido | Proxy | TTL |
|------|--------|-----------|-------|-----|
| CNAME | @ | cname.vercel-dns.com | ❌ DNS only | Auto |
| CNAME | www | cname.vercel-dns.com | ❌ DNS only | Auto |

**Nota**: Si Cloudflare no permite CNAME en root (@), usa:
| Tipo | Nombre | Contenido | Proxy | TTL |
|------|--------|-----------|-------|-----|
| A | @ | 76.76.21.21 | ❌ DNS only | Auto |
| CNAME | www | cname.vercel-dns.com | ❌ DNS only | Auto |

### 2️⃣ Backend API (AWS)

Necesitarás el endpoint de tu ALB de AWS:

| Tipo | Nombre | Contenido | Proxy | TTL |
|------|--------|-----------|-------|-----|
| CNAME | api | tu-alb-endpoint.us-east-1.elb.amazonaws.com | ❌ DNS only | Auto |

### 3️⃣ Configuración Completa Ejemplo

```
# Frontend
logos-ecosystem.com         A      76.76.21.21              DNS only
www.logos-ecosystem.com     CNAME  cname.vercel-dns.com     DNS only

# Backend  
api.logos-ecosystem.com     CNAME  logos-alb-xxxxx.us-east-1.elb.amazonaws.com  DNS only

# Opcional - Subdominio para app
app.logos-ecosystem.com     CNAME  cname.vercel-dns.com     DNS only
```

## 🔧 Pasos en Cloudflare

### Paso 1: Agregar Registros para Vercel

1. **Login en Cloudflare**
   - Ve a https://dash.cloudflare.com
   - Selecciona tu dominio logos-ecosystem.com

2. **Ve a DNS → Records**

3. **Agrega registro A para root**:
   - Type: `A`
   - Name: `@` (o déjalo vacío)
   - IPv4 address: `76.76.21.21`
   - Proxy status: **DNS only** (nube gris)
   - TTL: Auto
   - Save

4. **Agrega CNAME para www**:
   - Type: `CNAME`
   - Name: `www`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (nube gris)
   - TTL: Auto
   - Save

### Paso 2: Configurar en Vercel

1. **En Vercel Dashboard**:
   - Ve a tu proyecto
   - Settings → Domains
   - Add Domain: `logos-ecosystem.com`
   - Add Domain: `www.logos-ecosystem.com`

2. **Vercel te mostrará**:
   - ✅ Si los DNS están correctos
   - ❌ Si necesitas ajustar algo

### Paso 3: Agregar Backend API (después de crear ALB en AWS)

1. **Obtén el endpoint del ALB**:
   ```bash
   aws elbv2 describe-load-balancers --names logos-alb --query 'LoadBalancers[0].DNSName' --output text
   ```

2. **En Cloudflare DNS**:
   - Type: `CNAME`
   - Name: `api`
   - Target: `[tu-alb-endpoint].us-east-1.elb.amazonaws.com`
   - Proxy status: **DNS only** (importante para API)
   - Save

## ⚙️ Configuración SSL/TLS en Cloudflare

### Para máxima compatibilidad:

1. **SSL/TLS → Overview**:
   - Modo: `Full (strict)` si tienes certificados válidos
   - O `Full` si usas certificados autofirmados

2. **SSL/TLS → Edge Certificates**:
   - Always Use HTTPS: `ON`
   - Minimum TLS Version: `TLS 1.2`

3. **SSL/TLS → Origin Server**:
   - Puedes crear un certificado origen si lo necesitas

## 🔍 Verificación

### Después de configurar, verifica:

```bash
# Verificar DNS frontend
dig logos-ecosystem.com
dig www.logos-ecosystem.com

# Verificar DNS API (cuando esté configurado)
dig api.logos-ecosystem.com

# Test con curl
curl -I https://logos-ecosystem.com
curl -I https://api.logos-ecosystem.com/health
```

## ⏱️ Tiempos de Propagación

- **Cloudflare**: Instantáneo dentro de su red
- **Global**: 5-30 minutos típicamente
- **Máximo**: 48 horas (raro)

## 🚨 Troubleshooting

### Si Vercel no valida el dominio:
1. Asegúrate que Proxy está en **DNS only** (nube gris)
2. Espera 5-10 minutos
3. Click "Refresh" en Vercel

### Si la API no responde:
1. Verifica que el ALB esté funcionando en AWS
2. Asegúrate que el CNAME apunte al endpoint correcto
3. Verifica que no esté usando Cloudflare Proxy

### Error "Too many redirects":
1. En Cloudflare SSL/TLS → Overview
2. Cambia a "Full" o "Full (strict)"
3. Verifica que no haya reglas de redirección conflictivas

## 📝 Notas Importantes

1. **NO actives Cloudflare Proxy** (nube naranja) para:
   - Registros que apuntan a Vercel
   - API backend (puede causar problemas con WebSockets)

2. **Certificados SSL**:
   - Vercel maneja SSL automáticamente
   - AWS necesitará certificado en ACM

3. **Subdominos adicionales**:
   - `app.logos-ecosystem.com` para la app
   - `admin.logos-ecosystem.com` para panel admin
   - `staging.logos-ecosystem.com` para pruebas

---

**¿Necesitas ayuda?** Los registros DNS son críticos para que todo funcione correctamente.