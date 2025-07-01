#!/bin/bash

# 🌐 Configuración FINAL de DNS

if [ $# -ne 2 ]; then
    echo "Uso: ./configure-dns-final.sh FRONTEND_URL BACKEND_URL"
    echo "Ejemplo: ./configure-dns-final.sh myapp.railway.app myapi.railway.app"
    exit 1
fi

FRONTEND_URL=$1
BACKEND_URL=$2
CLOUDFLARE_API_TOKEN="Uq6Wfm05mJVMsF452lWcl-jyEtyDefsj-lzAnAKJ"
CLOUDFLARE_ZONE_ID="4bc1271bd6a132931dcf2b7cdc7ccce7"

echo "🌐 Configurando DNS..."

# Configurar registros DNS
configure_dns() {
    local name=$1
    local content=$2
    
    # Eliminar registro existente si hay
    record_id=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${name}.logos-ecosystem.com" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | jq -r '.result[0].id // empty')
    
    if [ -n "$record_id" ]; then
        curl -s -X DELETE \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record_id}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" > /dev/null
    fi
    
    # Crear nuevo registro
    curl -s -X POST \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data '{
            "type": "CNAME",
            "name": "'${name}'",
            "content": "'${content}'",
            "ttl": 1,
            "proxied": true
        }' > /dev/null
    
    echo "✅ Configurado: ${name}.logos-ecosystem.com → ${content}"
}

# Configurar todos los dominios
configure_dns "@" "$FRONTEND_URL"
configure_dns "www" "logos-ecosystem.com"
configure_dns "api" "$BACKEND_URL"

# Configurar SSL
curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/ssl" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"value":"full"}' > /dev/null

curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/always_use_https" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}' > /dev/null

echo ""
echo "🎉 ¡DNS CONFIGURADO!"
echo ""
echo "Tu aplicación estará disponible en:"
echo "🌐 https://logos-ecosystem.com"
echo "🌐 https://www.logos-ecosystem.com"
echo "🔌 https://api.logos-ecosystem.com"
echo ""
echo "⏱️ Espera 5-10 minutos para propagación DNS"