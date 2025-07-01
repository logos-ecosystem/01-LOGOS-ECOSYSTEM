#!/bin/bash

# LOGOS ECOSYSTEM - Start Backend for Agent System
# Script para iniciar el backend con los agentes integrados

echo "🚀 LOGOS ECOSYSTEM - Iniciando Backend Local"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo -e "${RED}Error: Ejecuta este script desde la raíz del proyecto LOGOS-ECOSYSTEM${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Configuración del Backend:${NC}"
echo "- Puerto: 8000"
echo "- Base de datos: SQLite local"
echo "- Modo: Desarrollo"
echo "- Debug: Activado"
echo ""

# Create a minimal server extension for agents
cat > backend/src/agent-integration-temp.js << 'EOF'
// Temporary agent integration for development
const { createAgentRoutes } = require('../../EXECUTIVE_AI_ASSISTANT/agent-routes-extension');

module.exports = function setupAgentRoutes(app) {
    try {
        const agentRoutes = createAgentRoutes();
        app.use('/api/ai', agentRoutes);
        console.log('✅ Agent routes integrated successfully!');
        console.log('📊 158 AI agents are now available at /api/ai/agents');
    } catch (error) {
        console.warn('⚠️ Could not load agent routes:', error.message);
        console.log('ℹ️ Running without agent integration');
    }
};
EOF

echo -e "${GREEN}✅ Configuración completada${NC}"
echo ""

# Instructions for manual integration
echo -e "${YELLOW}⚠️ IMPORTANTE - Integración Manual Requerida:${NC}"
echo ""
echo "Para que los agentes funcionen, necesitas añadir estas líneas en backend/src/server.ts:"
echo ""
echo -e "${GREEN}1. Después de las importaciones (línea ~35):${NC}"
echo "   import { createAgentRoutes } from '../EXECUTIVE_AI_ASSISTANT/agent-routes-extension';"
echo ""
echo -e "${GREEN}2. Después de las rutas existentes (línea ~148):${NC}"
echo "   // AI Agents Routes (158 agents)"
echo "   app.use('/api/ai', createAgentRoutes());"
echo ""

# Create a test script
cat > test-backend.sh << 'EOF'
#!/bin/bash
echo "🧪 Probando el backend..."
sleep 3

# Test health endpoint
echo "Testing /health..."
curl -s http://localhost:8000/health | jq '.' || echo "Health check failed"

# Test AI agents endpoint
echo -e "\nTesting /api/ai/agents/categories..."
curl -s http://localhost:8000/api/ai/agents/categories | jq '.' || echo "Agents API not available"

echo -e "\n✅ Test completado"
EOF

chmod +x test-backend.sh

echo -e "${YELLOW}📝 Instrucciones para iniciar:${NC}"
echo ""
echo "1. En una nueva terminal, ejecuta:"
echo -e "   ${GREEN}cd backend${NC}"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""
echo "2. El servidor estará disponible en:"
echo -e "   ${GREEN}http://localhost:8000${NC}"
echo ""
echo "3. Para probar que funciona:"
echo -e "   ${GREEN}./test-backend.sh${NC}"
echo ""
echo "4. Luego recarga el dashboard en tu navegador"
echo ""

# Create quick integration guide
cat > QUICK_AGENT_INTEGRATION.md << 'EOF'
# Quick Agent Integration Guide

## Option 1: Manual Integration (Recommended)

Add to `backend/src/server.ts`:

```typescript
// Line ~35 (after imports)
import { createAgentRoutes } from '../EXECUTIVE_AI_ASSISTANT/agent-routes-extension';

// Line ~148 (after other routes)
app.use('/api/ai', createAgentRoutes());
logger.info('🤖 Loaded 158 specialized AI agents');
```

## Option 2: Direct Access

The agents are already implemented in:
- `/EXECUTIVE_AI_ASSISTANT/agent-routes-extension.ts`
- `/EXECUTIVE_AI_ASSISTANT/.../agent-registry.service.ts`
- `/EXECUTIVE_AI_ASSISTANT/.../agent.controller.ts`

## Testing

Once integrated:
1. Start backend: `cd backend && npm run dev`
2. Test: `curl http://localhost:8000/api/ai/agents/categories`
3. Open dashboard: `http://localhost:8888/agent-dashboard-functional.html`

## Troubleshooting

- Permission issues: Files may be owned by root
- Use `sudo` if needed for editing server.ts
- Or copy the integration files to a writable location
EOF

echo -e "${GREEN}✅ Scripts de ayuda creados:${NC}"
echo "- test-backend.sh - Para probar el backend"
echo "- QUICK_AGENT_INTEGRATION.md - Guía rápida de integración"
echo ""
echo -e "${YELLOW}🎯 Siguiente paso:${NC}"
echo "Inicia el backend con: cd backend && npm run dev"