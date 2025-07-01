#!/bin/bash

# Solicitar información
read -p "Ingresa tu usuario de GitHub: " GITHUB_USER
read -s -p "Ingresa tu token de GitHub (no se mostrará): " GITHUB_TOKEN
echo ""

# Crear repositorio privado usando la API de GitHub
echo "Creando repositorio privado..."
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{
    "name": "LOGOS-ECOSYSTEM-VERSION-BETA.001",
    "description": "Plataforma revolucionaria de IA con 100+ agentes especializados",
    "private": true,
    "has_issues": true,
    "has_projects": true,
    "has_wiki": true
  }'

# Agregar el remoto y hacer push
echo ""
echo "Configurando remoto y subiendo código..."
git remote add origin https://github.com/$GITHUB_USER/LOGOS-ECOSYSTEM-VERSION-BETA.001.git
git push -u origin master

echo ""
echo "✅ Repositorio privado creado y código subido!"
echo "🔗 URL: https://github.com/$GITHUB_USER/LOGOS-ECOSYSTEM-VERSION-BETA.001"
