# 🚀 GitHub Repository Setup

## 1️⃣ Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Configura:
   - Repository name: `logos-ecosystem`
   - Description: "LOGOS Ecosystem - AI-powered marketplace platform"
   - Private/Public: Tu elección
   - **NO** inicialices con README, .gitignore o License

## 2️⃣ Conectar y Subir Código

Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub:

```bash
# Agregar remote origin
git remote add origin https://github.com/TU_USUARIO/logos-ecosystem.git

# Verificar remote
git remote -v

# Push inicial
git push -u origin master

# Si tu repositorio usa 'main' en lugar de 'master':
git branch -M main
git push -u origin main
```

## 3️⃣ Configurar Secretos en GitHub

Ve a Settings → Secrets and variables → Actions y agrega:

### Secretos de AWS:
- `AWS_ACCESS_KEY_ID`: Tu nueva access key
- `AWS_SECRET_ACCESS_KEY`: Tu nuevo secret key

### Secretos de Vercel (los obtendrás después):
- `VERCEL_TOKEN`: Token de Vercel
- `VERCEL_ORG_ID`: ID de organización
- `VERCEL_PROJECT_ID`: ID del proyecto

## 4️⃣ Habilitar GitHub Actions

1. Ve a Actions en tu repositorio
2. Habilita workflows si está deshabilitado
3. Copia el contenido de `github-actions-deploy.yml` a `.github/workflows/deploy.yml`

## 5️⃣ Configurar Branch Protection (Opcional)

Para mayor seguridad en producción:

1. Settings → Branches
2. Add rule
3. Branch name pattern: `main` o `master`
4. Configurar:
   - Require pull request reviews
   - Require status checks to pass
   - Include administrators

## 📝 Comandos Útiles

```bash
# Ver estado
git status

# Ver historial
git log --oneline

# Crear nueva rama
git checkout -b feature/nueva-funcionalidad

# Cambiar entre ramas
git checkout main

# Pull últimos cambios
git pull origin main

# Push cambios
git add .
git commit -m "Descripción del cambio"
git push origin main
```

## 🔗 URLs Importantes

Después de crear el repositorio tendrás:
- Repositorio: `https://github.com/TU_USUARIO/logos-ecosystem`
- Clone HTTPS: `https://github.com/TU_USUARIO/logos-ecosystem.git`
- Clone SSH: `git@github.com:TU_USUARIO/logos-ecosystem.git`

---

**Nota**: Si usas autenticación de dos factores, considera usar:
1. Personal Access Token en lugar de contraseña
2. SSH keys para mayor comodidad