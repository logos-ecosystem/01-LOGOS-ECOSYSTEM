# 🚀 Setup Temporal - LOGOS ECOSYSTEM

## ⚠️ IMPORTANTE
Este setup es **TEMPORAL** para desarrollo/testing. **NO usar en producción**.

## 📋 Pasos para Configurar

### 1. Backend Setup

```bash
cd backend

# Copiar archivo temporal
cp .env.temp .env

# IMPORTANTE: Editar .env y agregar tus NUEVAS credenciales AWS:
# - AWS_ACCESS_KEY_ID=<tu-nueva-key>
# - AWS_SECRET_ACCESS_KEY=<tu-nuevo-secret>

# Instalar dependencias
npm install

# Ejecutar migraciones de base de datos
npx prisma migrate deploy

# Iniciar servidor
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend

# Copiar archivo temporal
cp .env.local.temp .env.local

# Instalar dependencias
npm install

# Iniciar aplicación
npm run dev
```

## 🔍 Verificar que Todo Funcione

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Health: http://localhost:8080/health

## ⚠️ Limitaciones Actuales

1. **Anthropic AI**: Deshabilitado (sin API key)
2. **Stripe Webhooks**: No configurados
3. **Email**: Usando credenciales antiguas (rotar cuando sea posible)
4. **AWS Keys**: Debes agregar las nuevas manualmente

## 📝 Credenciales Pendientes de Rotar

- [ ] AWS Access Keys (agregar las nuevas al .env)
- [ ] Anthropic API Key (cuando el servicio funcione)
- [ ] Stripe Secret Key
- [ ] PayPal Secret
- [ ] SMTP Credentials

## 🔐 Próximos Pasos

Una vez que tengas todas las credenciales rotadas:
1. Configurar AWS Secrets Manager
2. Actualizar a usar .env.production
3. Desplegar en AWS/Vercel

## ⚡ Comandos Útiles

```bash
# Ver logs del backend
npm run dev

# Verificar conexión a base de datos
npx prisma db push

# Generar cliente Prisma
npx prisma generate

# Ver estado de migraciones
npx prisma migrate status
```

---

**Recuerda**: Este es un setup temporal. Para producción, usa AWS Secrets Manager.