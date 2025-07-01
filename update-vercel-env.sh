#!/bin/bash

# Script para actualizar variables de entorno en Vercel
# Necesitas tu VERCEL_TOKEN

set -e

echo "🚀 Actualizando variables de entorno en Vercel"
echo "============================================="
echo ""

# Solicitar token si no está en el ambiente
if [ -z "$VERCEL_TOKEN" ]; then
    echo "Necesitas tu token de Vercel"
    echo "Puedes obtenerlo en: https://vercel.com/account/tokens"
    read -sp "Ingresa tu VERCEL_TOKEN: " VERCEL_TOKEN
    echo ""
fi

# Obtener project ID del archivo local
PROJECT_ID=$(cat frontend/.vercel/project.json 2>/dev/null | jq -r '.projectId' || echo "")
ORG_ID=$(cat frontend/.vercel/project.json 2>/dev/null | jq -r '.orgId' || echo "")

if [ -z "$PROJECT_ID" ]; then
    echo "No se encontró project ID local"
    read -p "Ingresa el PROJECT_ID de Vercel: " PROJECT_ID
fi

echo ""
echo "Project ID: $PROJECT_ID"
echo "Org ID: $ORG_ID"
echo ""

# Función para actualizar variable de entorno
update_env_var() {
    local key=$1
    local value=$2
    
    echo -n "Actualizando $key... "
    
    # Primero intentar eliminar la variable existente
    curl -s -X DELETE \
        "https://api.vercel.com/v10/projects/$PROJECT_ID/env/$key" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" > /dev/null 2>&1 || true
    
    # Crear la nueva variable
    response=$(curl -s -X POST \
        "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "key": "'$key'",
            "value": "'$value'",
            "type": "plain",
            "target": ["production", "preview", "development"]
        }')
    
    if echo "$response" | grep -q "error"; then
        echo "❌ Error"
        echo "$response" | jq '.error'
    else
        echo "✅ OK"
    fi
}

# Actualizar las variables
echo "Actualizando variables de entorno..."
echo ""

update_env_var "NEXT_PUBLIC_API_URL" "https://api.logos-ecosystem.com"
update_env_var "NEXT_PUBLIC_API_BASE_URL" "https://api.logos-ecosystem.com/api/v1"
update_env_var "NEXT_PUBLIC_WS_URL" "wss://api.logos-ecosystem.com"

echo ""
echo "✅ Variables actualizadas!"
echo ""

# Trigger nuevo deployment
echo "¿Quieres hacer un nuevo deployment? (s/n)"
read -p "> " deploy

if [ "$deploy" = "s" ]; then
    echo "Creando nuevo deployment..."
    
    curl -X POST \
        "https://api.vercel.com/v13/deployments" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "logos-ecosystem",
            "project": "'$PROJECT_ID'",
            "target": "production",
            "gitSource": {
                "type": "github",
                "ref": "master"
            }
        }'
    
    echo ""
    echo "✅ Deployment iniciado!"
    echo "Verifica en: https://vercel.com/dashboard"
fi

echo ""
echo "🎉 Proceso completado!"