#!/bin/bash

# LOGOS ECOSYSTEM - Agent Integration Script
# This script integrates the 158 specialized agents with the main API

echo "🚀 LOGOS ECOSYSTEM - Integrating 158 Specialized Agents"
echo "======================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "backend/src/server.ts" ]; then
    echo -e "${RED}Error: Must run from LOGOS-ECOSYSTEM root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Step 1: Creating integration backup...${NC}"
cp backend/src/server.ts backend/src/server.ts.backup.$(date +%Y%m%d_%H%M%S)

echo -e "${YELLOW}📝 Step 2: Creating integration patch...${NC}"
cat > /tmp/agent-integration.patch << 'EOF'
// LOGOS ECOSYSTEM - Agent Integration
// Add this after the existing imports
import { createAgentRoutes } from '../EXECUTIVE_AI_ASSISTANT/agent-routes-extension';

// Add this after other route definitions (around line 148)
// Specialized AI Agents Routes (158 agents)
app.use('/api/ai', createAgentRoutes());
logger.info('🤖 Loaded 158 specialized AI agents');
EOF

echo -e "${YELLOW}🔧 Step 3: Manual Integration Required${NC}"
echo "Please add the following to your backend/src/server.ts file:"
echo ""
echo "1. Add import at the top (after other imports):"
echo -e "${GREEN}import { createAgentRoutes } from '../EXECUTIVE_AI_ASSISTANT/agent-routes-extension';${NC}"
echo ""
echo "2. Add route registration (after line 148, after other routes):"
echo -e "${GREEN}// Specialized AI Agents Routes (158 agents)"
echo "app.use('/api/ai', createAgentRoutes());"
echo "logger.info('🤖 Loaded 158 specialized AI agents');${NC}"
echo ""

echo -e "${YELLOW}📋 Step 4: Testing the integration...${NC}"
echo "Run these commands to test:"
echo ""
echo "1. cd backend && npm run dev"
echo "2. curl http://localhost:8000/api/ai/agents/categories"
echo "3. curl http://localhost:8000/api/ai/agents?limit=10"
echo ""

echo -e "${YELLOW}📊 Available Endpoints:${NC}"
echo "GET  /api/ai/agents                 - List all agents"
echo "GET  /api/ai/agents/categories      - Get categories"
echo "GET  /api/ai/agents/:id             - Get agent details"
echo "POST /api/ai/agents/:id/execute     - Execute capability"
echo "POST /api/ai/agents/:id/chat        - Chat with agent"
echo ""

echo -e "${GREEN}✅ Integration script complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Manually add the imports and routes to server.ts"
echo "2. Run 'npm run dev' to test"
echo "3. Access http://localhost:8000/api/ai/agents to see all agents"

# Create a quick test file
cat > test-agents.js << 'EOF'
// Quick test script for agent API
const axios = require('axios');

async function testAgentAPI() {
  try {
    // Test categories
    const categories = await axios.get('http://localhost:8000/api/ai/agents/categories');
    console.log('Categories:', categories.data.categories.length);
    
    // Test agent list
    const agents = await axios.get('http://localhost:8000/api/ai/agents?limit=5');
    console.log('Total agents:', agents.data.pagination.total);
    console.log('First 5 agents:', agents.data.agents.map(a => a.name));
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run test if server is running
setTimeout(testAgentAPI, 2000);
EOF

echo -e "${YELLOW}Created test-agents.js for testing the API${NC}"