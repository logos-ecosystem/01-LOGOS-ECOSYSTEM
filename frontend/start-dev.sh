#!/bin/bash

echo "🚀 Iniciando servidor de desarrollo LOGOS ECOSYSTEM..."
echo ""

# Cambiar al directorio frontend
cd /home/juan/Claude/LOGOS-ECOSYSTEM/frontend

# Verificar que estamos en el directorio correcto
echo "📁 Directorio actual: $(pwd)"
echo ""

# Verificar Node.js
echo "📦 Versión de Node.js:"
node --version || echo "❌ Node.js no está instalado"
echo ""

# Verificar npm
echo "📦 Versión de npm:"
npm --version || echo "❌ npm no está instalado"
echo ""

# Limpiar caché si es necesario
echo "🧹 Limpiando caché..."
rm -rf .next
echo "✅ Caché limpiado"
echo ""

# Verificar dependencias
echo "📋 Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules no encontrado. Instalando dependencias..."
    npm install
else
    echo "✅ Dependencias encontradas"
fi
echo ""

# Configurar puerto alternativo
export PORT=3001
echo "🌐 Usando puerto: $PORT"
echo ""

# Iniciar el servidor con más información
echo "🚀 Iniciando Next.js en http://localhost:$PORT"
echo "----------------------------------------"
echo ""

# Ejecutar con variables de debug
NODE_ENV=development npm run dev -- --port $PORT