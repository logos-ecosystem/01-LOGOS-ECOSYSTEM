#!/bin/bash

# 🚀 Deploy via GitHub to Railway - Sin usar tokens problemáticos

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 LOGOS ECOSYSTEM - Deploy via GitHub${NC}"
echo "======================================"
echo ""

# Paso 1: Push a GitHub
echo -e "${BLUE}Paso 1: Actualizando GitHub...${NC}"
git add .
git commit -m "Deploy to Railway" || true
git push origin main

echo -e "${GREEN}✅ Código actualizado en GitHub${NC}"

# Paso 2: Instrucciones para Railway
echo ""
echo -e "${BLUE}Paso 2: Deploy en Railway (Manual)${NC}"
echo ""
echo "1. Abre: https://railway.app/new"
echo ""
echo "2. Selecciona: 'Deploy from GitHub repo'"
echo ""
echo "3. Conecta tu GitHub y selecciona: logos-ecosystem/01-LOGOS-ECOSYSTEM"
echo ""
echo "4. Railway detectará automáticamente:"
echo "   - Backend en /backend"
echo "   - Frontend en /frontend"
echo ""
echo "5. Agrega las variables de entorno en Railway dashboard:"
echo ""
echo "   BACKEND:"
echo "   - NODE_ENV=production"
echo "   - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"
echo "   - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}"
echo "   - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}"
echo "   - CLOUDFLARE_ZONE_ID=${CLOUDFLARE_ZONE_ID}"
echo ""
echo "   FRONTEND:"
echo "   - NODE_ENV=production"
echo "   - NEXT_PUBLIC_API_URL=https://api.logos-ecosystem.com"
echo "   - NEXT_PUBLIC_STRIPE_PUBLIC_KEY=${STRIPE_PUBLIC_KEY}"
echo ""
echo "6. Agrega PostgreSQL y Redis desde Railway dashboard"
echo ""
echo "7. Configura dominios personalizados:"
echo "   - Frontend: logos-ecosystem.com"
echo "   - Backend: api.logos-ecosystem.com"
echo ""
echo -e "${GREEN}¡Listo! Deploy sin complicaciones de tokens${NC}"