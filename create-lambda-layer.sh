#!/bin/bash
# Script para crear Lambda Layer con dependencias de Python

set -e

echo "🔧 Creando Lambda Layer para Stripe"
echo "==================================="
echo ""

# Crear directorio temporal
TEMP_DIR="/tmp/lambda-layer-$$"
mkdir -p $TEMP_DIR/python

echo "1️⃣ Instalando dependencias..."
pip install stripe boto3 -t $TEMP_DIR/python/

echo ""
echo "2️⃣ Creando archivo ZIP..."
cd $TEMP_DIR
zip -r /tmp/stripe-layer.zip python/

echo ""
echo "3️⃣ Publicando Lambda Layer..."
LAYER_ARN=$(aws lambda publish-layer-version \
    --layer-name logos-stripe-dependencies \
    --description "Stripe SDK and dependencies for LOGOS webhook" \
    --zip-file fileb:///tmp/stripe-layer.zip \
    --compatible-runtimes python3.11 \
    --query 'LayerVersionArn' \
    --output text)

echo ""
echo "4️⃣ Actualizando función Lambda..."
aws lambda update-function-configuration \
    --function-name logos-stripe-webhook \
    --layers $LAYER_ARN \
    --query 'LastUpdateStatus' \
    --output text

echo ""
echo "✅ Lambda Layer creada y aplicada!"
echo "Layer ARN: $LAYER_ARN"
echo ""
echo "Limpiando archivos temporales..."
rm -rf $TEMP_DIR
rm -f /tmp/stripe-layer.zip

echo ""
echo "🎉 Proceso completado!"