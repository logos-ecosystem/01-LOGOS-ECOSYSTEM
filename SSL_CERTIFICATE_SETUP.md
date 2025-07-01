# 🔐 Configuración de Certificado SSL

## 📋 Registros DNS para Validación

Agrega estos registros CNAME en Cloudflare para validar el certificado:

### Registro 1 - Para api.logos-ecosystem.com:
- **Type**: CNAME
- **Name**: `_2f055c51e614a2444d0a88854de270c0.api`
- **Target**: `_1ff3bfa540a755abb9a5c76252d167e2.xlfgrmvvlj.acm-validations.aws.`
- **Proxy**: DNS only (nube gris)
- **TTL**: Auto

### Registro 2 - Para *.logos-ecosystem.com:
- **Type**: CNAME
- **Name**: `_587455ae94fbfc755b23f30b3a3ab9e6`
- **Target**: `_feb0b58d45f7fe096680f1c2ace7fffe.xlfgrmvvlj.acm-validations.aws.`
- **Proxy**: DNS only (nube gris)
- **TTL**: Auto

## 🚀 Pasos en Cloudflare:

1. Ve a https://dash.cloudflare.com
2. Selecciona tu dominio `logos-ecosystem.com`
3. Ve a **DNS** → **Records**
4. Agrega los dos registros CNAME de arriba

## ⏱️ Tiempo de Validación:
- AWS verificará automáticamente los registros DNS
- Típicamente toma 5-30 minutos
- Máximo 72 horas (raro)

## 🔍 Verificar Estado del Certificado:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:287103448174:certificate/1ac308b0-6e8a-428d-ae62-e102c649c237 \
  --query "Certificate.Status"
```

Cuando el estado sea "ISSUED", el certificado está listo.

## 📝 Información del Certificado:
- **ARN**: `arn:aws:acm:us-east-1:287103448174:certificate/1ac308b0-6e8a-428d-ae62-e102c649c237`
- **Dominios**: 
  - api.logos-ecosystem.com
  - *.logos-ecosystem.com

---

**IMPORTANTE**: No elimines estos registros CNAME después de la validación. AWS los usa para renovación automática.