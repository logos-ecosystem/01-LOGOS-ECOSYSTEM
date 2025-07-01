#!/bin/bash

echo "🚀 LOGOS ECOSYSTEM - Deploy to Vercel"
echo "====================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Vercel CLI...${NC}"
    npm i -g vercel
fi

# Cambiar al directorio frontend
cd frontend

# Restaurar configuración original de Next.js si fue modificada
if [ -f "next.config.backup.js" ]; then
    echo -e "${BLUE}🔄 Restaurando configuración original...${NC}"
    mv next.config.backup.js next.config.js
fi

# Crear archivo de configuración de Vercel
echo -e "${BLUE}📝 Creando configuración de Vercel...${NC}"
cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "functions": {
    "src/pages/api/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.logos-ecosystem.com/api/:path*"
    }
  ],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://logos-ecosystem.vercel.app",
    "NEXT_PUBLIC_API_URL": "https://api.logos-ecosystem.com",
    "NEXT_PUBLIC_WS_URL": "wss://api.logos-ecosystem.com",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "@stripe_publishable_key",
    "NEXT_PUBLIC_PAYPAL_CLIENT_ID": "@paypal_client_id",
    "NEXT_PUBLIC_CLOUDFLARE_ZONE_ID": "@cloudflare_zone_id",
    "NEXT_PUBLIC_CLOUDFLARE_API_TOKEN": "@cloudflare_api_token"
  }
}
EOF

# Crear archivo .vercelignore
echo -e "${BLUE}📝 Creando .vercelignore...${NC}"
cat > .vercelignore << 'EOF'
.git
.next
node_modules
*.log
.env.local
.env.development
__tests__
__mocks__
coverage
.vscode
.idea
*.md
EOF

echo -e "${GREEN}✅ Configuración lista${NC}"
echo ""
echo -e "${YELLOW}📋 INSTRUCCIONES PARA DEPLOY:${NC}"
echo ""
echo "1. Ejecuta el siguiente comando:"
echo -e "   ${BLUE}vercel${NC}"
echo ""
echo "2. Cuando te pregunte:"
echo "   - Set up and deploy: ${GREEN}Y${NC}"
echo "   - Which scope: Selecciona tu cuenta o crea una nueva"
echo "   - Link to existing project: ${GREEN}N${NC} (crear nuevo)"
echo "   - Project name: ${BLUE}logos-ecosystem${NC}"
echo "   - Directory: ${BLUE}.${NC} (directorio actual)"
echo "   - Override settings: ${GREEN}N${NC}"
echo ""
echo "3. Para configurar variables de entorno:"
echo -e "   ${BLUE}vercel env add${NC}"
echo ""
echo "4. Para deploy a producción:"
echo -e "   ${BLUE}vercel --prod${NC}"
echo ""
echo -e "${GREEN}🌟 Tu app estará disponible en: https://logos-ecosystem.vercel.app${NC}"
echo ""

# Preguntar si quiere ejecutar el deploy ahora
echo -e "${YELLOW}¿Quieres ejecutar el deploy ahora? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${BLUE}🚀 Iniciando deploy a Vercel...${NC}"
    vercel
else
    echo -e "${YELLOW}✨ Puedes ejecutar 'vercel' cuando estés listo${NC}"
fi