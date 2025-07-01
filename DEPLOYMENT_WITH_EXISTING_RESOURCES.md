# LOGOS Ecosystem - Deployment con Recursos Existentes

## 🎯 RESUMEN: Usaremos los recursos AWS que YA EXISTEN

### ✅ Recursos Confirmados y Listos

1. **AWS Account**: 287103448174 (logos-ecosys-admin)
2. **Base de Datos PostgreSQL**: 
   - Host: `logos-production-db.c0towm0wo2cg.us-east-1.rds.amazonaws.com`
   - Puerto: 5432
   - Usuario: logos_admin
   - Database: logos_production
   
3. **Redis Cache**:
   - Host: `logos-production-redis.zc7t27.0001.use1.cache.amazonaws.com`
   - Puerto: 6379

4. **ECS Cluster**: logos-production-cluster
5. **ECR Repository**: logos-production
6. **S3 Buckets**:
   - Uploads: logos-production-uploads
   - Static: logos-production-static
   - Backups: logos-production-backups

## 📋 Pasos de Deployment Actualizados

### Paso 1: Obtener Credenciales de Base de Datos

```bash
# Verificar si la contraseña está en Secrets Manager
aws secretsmanager list-secrets \
  --profile logos-production \
  --query "SecretList[?contains(Name, 'logos')].Name"

# Si existe, obtener la contraseña
aws secretsmanager get-secret-value \
  --secret-id logos-production/db-password \
  --profile logos-production \
  --query SecretString \
  --output text
```

### Paso 2: Preparar Variables de Entorno

```bash
# Copiar el archivo de producción real
cp backend/.env.production.real backend/.env.production

# Editar y reemplazar las variables:
# ${DB_PASSWORD} - Contraseña de la base de datos
# ${JWT_SECRET} - Generar con: openssl rand -base64 32
# ${STRIPE_SECRET_KEY} - De tu cuenta Stripe
# etc...
```

### Paso 3: Verificar Conectividad

```bash
# Test de conexión a la base de datos
psql "postgresql://logos_admin:PASSWORD@logos-production-db.c0towm0wo2cg.us-east-1.rds.amazonaws.com:5432/logos_production?sslmode=require" -c "SELECT version();"

# Test de Redis (requiere redis-cli)
redis-cli -h logos-production-redis.zc7t27.0001.use1.cache.amazonaws.com ping
```

### Paso 4: Preparar la Base de Datos

```bash
cd backend

# Ejecutar migraciones
DATABASE_URL="postgresql://logos_admin:PASSWORD@logos-production-db.c0towm0wo2cg.us-east-1.rds.amazonaws.com:5432/logos_production?sslmode=require" \
npm run prisma:migrate:deploy

# Seed inicial (solo si es necesario)
DATABASE_URL="postgresql://..." npm run prisma:seed
```

### Paso 5: Build y Deploy del Backend

```bash
# Construir imagen Docker
docker build -t logos-production:latest .

# Login a ECR
aws ecr get-login-password --region us-east-1 --profile logos-production | \
  docker login --username AWS --password-stdin 287103448174.dkr.ecr.us-east-1.amazonaws.com

# Tag y push
docker tag logos-production:latest 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest
docker push 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest

# Actualizar servicio ECS
aws ecs update-service \
  --cluster logos-production-cluster \
  --service logos-production-service \
  --force-new-deployment \
  --profile logos-production
```

### Paso 6: Obtener URL del Load Balancer

```bash
# Listar load balancers
aws elbv2 describe-load-balancers \
  --profile logos-production \
  --query "LoadBalancers[?contains(LoadBalancerName, 'logos')].DNSName" \
  --output text
```

### Paso 7: Deploy del Frontend en Vercel

```bash
cd frontend

# Configurar variables de entorno
vercel env add NEXT_PUBLIC_API_URL production
# Ingresa: https://[TU-ALB-URL]

# Deploy
vercel --prod
```

## ⚠️ IMPORTANTE: NO CREAR RECURSOS DUPLICADOS

### ❌ NO HACER:
- No crear nuevos RDS instances
- No crear nuevos buckets S3
- No crear nuevo cluster ECS
- No crear nuevo repositorio ECR

### ✅ SÍ HACER:
- Usar los recursos existentes listados arriba
- Actualizar configuraciones si es necesario
- Crear backups antes de cambios importantes

## 🔐 Secrets que Necesitas Configurar

1. **Contraseña de Base de Datos** (obtener del administrador actual)
2. **JWT Secrets** (generar nuevos)
3. **Stripe Keys** (de tu cuenta)
4. **SMTP/Email** (SendGrid o similar)
5. **OpenAI API Key** (si usas IA)

## 📊 Comandos Útiles para Monitoreo

```bash
# Ver logs del servicio
aws logs tail /ecs/logos-production --follow --profile logos-production

# Ver estado del servicio
aws ecs describe-services \
  --cluster logos-production-cluster \
  --services logos-production-service \
  --profile logos-production

# Ver tareas en ejecución
aws ecs list-tasks \
  --cluster logos-production-cluster \
  --service-name logos-production-service \
  --profile logos-production
```

## 🚨 Troubleshooting

### Si el servicio no se actualiza:
1. Verificar que la imagen se subió correctamente a ECR
2. Revisar los logs de ECS
3. Verificar que el task definition tiene los permisos correctos

### Si no puedes conectar a la base de datos:
1. Verificar security groups (debe permitir puerto 5432)
2. Verificar que el password es correcto
3. Verificar SSL está habilitado

---

**NOTA**: Este deployment usa infraestructura EXISTENTE. Coordina con el equipo si hay servicios actualmente en producción.

Última actualización: ${new Date().toISOString()}