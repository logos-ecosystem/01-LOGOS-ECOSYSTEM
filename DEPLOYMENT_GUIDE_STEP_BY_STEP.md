# 📚 Guía de Deployment Paso a Paso

## 🎯 Pre-requisitos

### Necesitas tener:
- [ ] Cuenta de AWS con acceso administrativo
- [ ] Cuenta de GitHub
- [ ] Cuenta de Vercel
- [ ] AWS CLI configurado
- [ ] Git configurado
- [ ] Dominio logos-ecosystem.com apuntando a los servicios

## 1️⃣ GitHub Setup

### Crear Repositorio:
```bash
# 1. Ve a https://github.com/new
# 2. Nombre: logos-ecosystem
# 3. Privado o Público (tu elección)
# 4. NO inicialices con README
```

### Subir Código:
```bash
# En tu terminal local
git add .
git commit -m "Initial commit - LOGOS Ecosystem"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/logos-ecosystem.git
git push -u origin main
```

## 2️⃣ AWS Backend Deployment

### A. Configurar Secrets Manager:
```bash
cd backend

# Editar .env.production con tus credenciales AWS nuevas
nano .env.production

# Ejecutar script de secrets
./setup-aws-secrets.sh production
```

### B. Crear Infraestructura:
```bash
# Crear stack de CloudFormation
aws cloudformation create-stack \
  --stack-name logos-production \
  --template-body file://aws-infrastructure.yaml \
  --parameters \
    ParameterKey=DBPassword,ParameterValue=Logosecosystem_777 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### C. Crear Certificado SSL:
```bash
# En AWS Console:
# 1. Ve a Certificate Manager
# 2. Request certificate
# 3. Dominios:
#    - api.logos-ecosystem.com
#    - *.logos-ecosystem.com
# 4. Validación DNS
# 5. Crear registros CNAME en tu DNS
```

### D. Build y Deploy Backend:
```bash
# Build Docker image
docker build -t logos-backend .

# Tag para ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 287103448174.dkr.ecr.us-east-1.amazonaws.com

docker tag logos-backend:latest 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest

# Push a ECR
docker push 287103448174.dkr.ecr.us-east-1.amazonaws.com/logos-production:latest

# Deploy con script
./aws-deployment.sh production
```

## 3️⃣ Vercel Frontend Deployment

### A. Conectar con GitHub:
1. Ve a https://vercel.com/new
2. Importa el repositorio `logos-ecosystem`
3. Selecciona el directorio `frontend`

### B. Configurar Variables de Entorno:
```env
NEXT_PUBLIC_API_URL=https://api.logos-ecosystem.com
NEXT_PUBLIC_APP_URL=https://logos-ecosystem.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RaDNFR452PkkFcmR6MA3fj3iRLq93pxyUPKZphkcAxEhxgemrNCQxz88rh2RIQT5eGnPr8hEWtsl8a96iGGgUhJ00iGXmKqxb
NEXT_PUBLIC_PAYPAL_CLIENT_ID=ATBj6N9mVxmnb_K_kD22oruRwdRbNCEumxeqEkcjBWnKs6F1USSLYgNOWqxMjABUh_9RwOFGkpCck73U
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_WS_URL=wss://api.logos-ecosystem.com
```

### C. Deploy:
```bash
# Vercel lo hará automáticamente
# O manualmente:
cd frontend
vercel --prod
```

## 4️⃣ Configurar DNS

### Registros necesarios:
```
# Frontend (Vercel)
logos-ecosystem.com -> CNAME -> cname.vercel-dns.com
www.logos-ecosystem.com -> CNAME -> cname.vercel-dns.com

# Backend (AWS ALB)
api.logos-ecosystem.com -> CNAME -> logos-alb-xxxxx.us-east-1.elb.amazonaws.com
```

## 5️⃣ Post-Deployment

### Verificar:
- [ ] https://logos-ecosystem.com carga correctamente
- [ ] https://api.logos-ecosystem.com/health responde
- [ ] Login funciona
- [ ] Pagos de prueba funcionan
- [ ] WebSocket se conecta

### Configurar Webhooks:
1. **Stripe**:
   - URL: https://api.logos-ecosystem.com/webhooks/stripe
   - Eventos: payment_intent.succeeded, customer.subscription.*

2. **PayPal**:
   - URL: https://api.logos-ecosystem.com/webhooks/paypal

## 🚨 Troubleshooting

### Si el backend no responde:
```bash
# Ver logs de ECS
aws logs tail /ecs/logos-production --follow

# Ver estado del servicio
aws ecs describe-services --cluster logos-production-cluster --services logos-production-service
```

### Si el frontend no carga:
```bash
# Ver logs en Vercel Dashboard
# Verificar variables de entorno
```

## 📊 Monitoreo

1. **CloudWatch** para backend
2. **Vercel Analytics** para frontend
3. **Configurar Sentry** para errores

---

**Tiempo estimado total**: 2-3 horas