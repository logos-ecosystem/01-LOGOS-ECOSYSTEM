#!/bin/bash
echo "🔍 Quick Status Check"
echo "===================="
curl -s -o /dev/null -w "logos-ecosystem.com: %{http_code}\n" https://logos-ecosystem.com
curl -s -o /dev/null -w "API: %{http_code}\n" https://api.logos-ecosystem.com/health
echo ""
echo "Latest deployments:"
cd frontend && vercel ls | head -5
