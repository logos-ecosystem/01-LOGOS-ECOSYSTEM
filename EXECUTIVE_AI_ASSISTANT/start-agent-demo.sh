#!/bin/bash

# LOGOS ECOSYSTEM - Start Agent Demo
# Script para iniciar la demostración funcional de agentes

echo "🚀 LOGOS ECOSYSTEM - Agent Dashboard"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Python is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python no está instalado. Por favor instala Python 3."
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}📋 Instrucciones de Uso:${NC}"
echo ""
echo "1. MODO DEMO (Sin API):"
echo "   - Abre directamente el archivo HTML en tu navegador"
echo "   - Verás 158 agentes simulados funcionando"
echo ""
echo "2. MODO REAL (Con API):"
echo "   - Primero inicia tu servidor backend: cd backend && npm run dev"
echo "   - Edita el archivo HTML y cambia:"
echo -e "     ${GREEN}API_BASE_URL = 'http://localhost:8000/api/ai'${NC}"
echo -e "     ${GREEN}AUTH_TOKEN = 'tu-token-real'${NC}"
echo ""

# Start local server
PORT=8888
echo -e "${BLUE}🌐 Iniciando servidor local en puerto $PORT...${NC}"
echo ""

cd "$SCRIPT_DIR"

# Create a simple index.html that redirects
cat > index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>LOGOS Agent Dashboard</title>
    <style>
        body {
            background: #0a0a0a;
            color: #fff;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
        }
        h1 {
            color: #667eea;
            margin-bottom: 30px;
        }
        .links {
            display: flex;
            gap: 20px;
            justify-content: center;
        }
        .btn {
            background: #667eea;
            color: white;
            padding: 20px 40px;
            text-decoration: none;
            border-radius: 10px;
            font-size: 18px;
            transition: all 0.3s;
            display: inline-block;
        }
        .btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
        }
        .visual {
            background: #10b981;
        }
        .info {
            margin-top: 30px;
            color: #888;
            line-height: 1.6;
        }
        code {
            background: #1a1a1a;
            padding: 2px 8px;
            border-radius: 4px;
            color: #4ade80;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 LOGOS AI Agent System</h1>
        <div class="links">
            <a href="agent-dashboard-functional.html" class="btn">
                Dashboard Funcional
            </a>
            <a href="demo-visual.html" class="btn visual">
                Demo Visual
            </a>
        </div>
        <div class="info">
            <p>Dashboard: Interfaz completa con búsqueda y ejecución de agentes</p>
            <p>Demo Visual: Presentación animada del sistema</p>
            <br>
            <p>Para conectar con API real, edita <code>API_BASE_URL</code> en el dashboard</p>
        </div>
    </div>
</body>
</html>
EOF

echo -e "${GREEN}✅ Servidor iniciado!${NC}"
echo ""
echo -e "🌐 Abre tu navegador en: ${BLUE}http://localhost:$PORT${NC}"
echo ""
echo "Opciones disponibles:"
echo -e "  • ${GREEN}http://localhost:$PORT/agent-dashboard-functional.html${NC} - Dashboard completo"
echo -e "  • ${GREEN}http://localhost:$PORT/demo-visual.html${NC} - Demo visual"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""

# Start Python HTTP server
$PYTHON_CMD -m http.server $PORT