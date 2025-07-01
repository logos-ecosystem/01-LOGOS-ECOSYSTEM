# 🚀 Deployment con Repositorios Existentes

## Estado Actual
- ✅ Código listo con commit inicial
- ✅ DNS configurado en Cloudflare
- ✅ Credenciales parcialmente rotadas
- ⏳ Repositorios existentes sin conectar

## 1️⃣ Conectar con GitHub Existente

```bash
# Opción A: Si el repo está vacío
git remote add origin https://github.com/TU_USUARIO/NOMBRE_REPO.git
git push -u origin master

# Opción B: Si el repo ya tiene contenido
git remote add origin https://github.com/TU_USUARIO/NOMBRE_REPO.git
git fetch origin
git merge origin/master --allow-unrelated-histories
git push origin master

# Opción C: Si quieres sobrescribir todo
git remote add origin https://github.com/TU_USUARIO/NOMBRE_REPO.git
git push -f origin master
```

## 2️⃣ Actualizar Deployment en AWS

### Verificar estado actual:
```bash
# Ver stacks existentes
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Ver servicios ECS
aws ecs list-clusters
aws ecs list-services --cluster TU_CLUSTER
```

### Actualizar backend:
```bash
cd backend

# Si ya existe la infraestructura
./aws-deployment.sh production

# Si necesitas actualizar la infraestructura
aws cloudformation update-stack \
  --stack-name TU_STACK_NAME \
  --template-body file://aws-infrastructure.yaml \
  --capabilities CAPABILITY_NAMED_IAM
```

## 3️⃣ Actualizar Vercel

### Opción A: Vía Git (Automático)
```bash
# Solo haz push y Vercel detectará los cambios
git push origin master
```

### Opción B: Vía CLI
```bash
cd frontend
vercel --prod
```

### Opción C: Vía Dashboard
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Settings → Environment Variables
4. Actualiza:
   - `NEXT_PUBLIC_API_URL` con tu ALB endpoint
   - Otras variables según necesites

## 📋 Información que Necesito

Para darte comandos exactos, necesito saber:

1. **GitHub**:
   - URL del repositorio
   - Nombre de la rama principal (master/main)

2. **AWS**:
   - Nombre del CloudFormation stack
   - Nombre del cluster ECS
   - Región (supongo us-east-1)

3. **Vercel**:
   - Nombre del proyecto
   - Si está conectado a GitHub

## 🔍 Comandos para Obtener Info

```bash
# Info de AWS
aws cloudformation list-stacks --query 'StackSummaries[?contains(StackName, `logos`)]'
aws ecs list-clusters
aws ecr describe-repositories

# Info de Vercel
vercel list

# Info de Git
git config --get remote.origin.url
```

---

**¿Cuáles son los nombres/URLs de tus repositorios existentes?**