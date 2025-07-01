#!/bin/bash
echo "🔍 LOGOS ECOSYSTEM Status"
echo "========================"
echo ""
echo "Checking all endpoints..."
echo ""
curl -s -o /dev/null -w "Frontend (Direct): %{http_code} - %{url_effective}\n" https://frontend-juan-jaureguis-projects.vercel.app
curl -s -o /dev/null -w "logos-ecosystem.com: %{http_code}\n" https://logos-ecosystem.com
curl -s -o /dev/null -w "www.logos-ecosystem.com: %{http_code}\n" https://www.logos-ecosystem.com
curl -s -o /dev/null -w "API Backend: %{http_code}\n" https://api.logos-ecosystem.com/health
echo ""
echo "Latest deployments:"
cd frontend && vercel ls | head -5
