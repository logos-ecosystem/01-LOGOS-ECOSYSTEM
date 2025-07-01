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
