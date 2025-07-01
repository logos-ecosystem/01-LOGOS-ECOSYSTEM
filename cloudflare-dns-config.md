# Configuración DNS en Cloudflare para logos-ecosystem.com

## 1. Registros para el Frontend (Vercel)

### Dominio principal
- **Type**: CNAME
- **Name**: @ (o logos-ecosystem.com)
- **Content**: cname.vercel-dns.com
- **Proxy status**: Proxied (nube naranja)
- **TTL**: Auto

### Subdominio www
- **Type**: CNAME
- **Name**: www
- **Content**: cname.vercel-dns.com
- **Proxy status**: Proxied (nube naranja)
- **TTL**: Auto

## 2. Registro para el Backend API (AWS ALB)

### Subdominio api
- **Type**: CNAME
- **Name**: api
- **Content**: logos-backend-alb-915729089.us-east-1.elb.amazonaws.com
- **Proxy status**: DNS only (nube gris) ⚠️ IMPORTANTE
- **TTL**: Auto

**NOTA IMPORTANTE**: El proxy de Cloudflare debe estar DESHABILITADO (nube gris) para el subdominio 'api' porque AWS ALB maneja su propio certificado SSL.

## 3. Validación del Certificado SSL de AWS (Temporal)

Para validar el certificado SSL en AWS ACM, agrega este registro:

- **Type**: CNAME
- **Name**: _587455ae94fbfc755b23f30b3a3ab9e6
- **Content**: _feb0b58d45f7fe096680f1c2ace7fffe.xlfgrmvvlj.acm-validations.aws.
- **Proxy status**: DNS only (nube gris)
- **TTL**: Auto

Este registro es necesario solo hasta que AWS valide el certificado (generalmente 5-10 minutos). Después puedes eliminarlo si lo deseas.

## Verificación

Una vez configurados los registros, las URLs deberían funcionar así:

- https://logos-ecosystem.com → Frontend en Vercel
- https://www.logos-ecosystem.com → Frontend en Vercel
- https://api.logos-ecosystem.com → Backend en AWS

## Tiempo de Propagación

Los cambios DNS pueden tardar:
- Con Cloudflare Proxy: Inmediato
- Sin Cloudflare Proxy (api): 5-30 minutos