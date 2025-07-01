# 🔧 Configuración de Cuenta AWS

## Problema Detectado
- Cuenta actual: `518370720528` (juanjauregui)
- Cuenta necesaria: `287103448174` (donde está la infraestructura)

## Soluciones:

### Opción 1: Cambiar de Perfil AWS (Recomendado)
```bash
# Ver perfiles disponibles
aws configure list-profiles

# Si tienes un perfil para la cuenta 287103448174:
export AWS_PROFILE=nombre-del-perfil

# O usar en cada comando:
aws --profile nombre-del-perfil ecs list-clusters
```

### Opción 2: Configurar Nuevas Credenciales
```bash
# Configurar credenciales para la cuenta correcta
aws configure
# Ingresa:
# - AWS Access Key ID: [tu-nueva-key-de-cuenta-287103448174]
# - AWS Secret Access Key: [tu-nuevo-secret]
# - Default region: us-east-1
# - Default output format: json
```

### Opción 3: Usar Variables de Entorno
```bash
export AWS_ACCESS_KEY_ID="tu-access-key-cuenta-287103448174"
export AWS_SECRET_ACCESS_KEY="tu-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

## Verificar Cuenta Correcta
```bash
# Debe mostrar Account: 287103448174
aws sts get-caller-identity
```

## Deploy Manual Mientras Tanto

### Backend (desde tu máquina local o EC2 con acceso correcto):
```bash
cd backend

# Build local
docker build -t logos-backend .

# Login ECR (cuenta 287103448174)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  287103448174.dkr.ecr.us-east-1.amazonaws.com

# Tag y push
docker tag logos-backend:latest \
  287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest

docker push \
  287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest

# Update servicio
aws ecs update-service \
  --cluster logos-production-cluster \
  --service logos-production-service \
  --force-new-deployment \
  --region us-east-1
```

### Frontend (Vercel - Automático):
El push a GitHub ya debería haber disparado el deploy automático en Vercel.

## URLs para Verificar:
- GitHub: https://github.com/logos-ecosystem/logos-ecosystem ✅
- Frontend: https://logos-ecosystem.vercel.app (verificar en unos minutos)
- Backend: http://logos-backend-alb-915729089.us-east-1.elb.amazonaws.com/health

---

**¿Tienes acceso a la cuenta AWS 287103448174?**