#!/bin/bash

echo "========================================"
echo "🔐 PUBLICANDO LOGOS ECOSYSTEM COMO PRIVADO"
echo "========================================"

# Verificar que estamos en el directorio correcto
if [ ! -f "README.md" ]; then
    echo "❌ Error: No estás en el directorio del proyecto"
    echo "Por favor, ejecuta este script desde: /home/juan/CLAUDE/LOGOS-PRODUCTION/LOGOS-ECOSYSTEM-VERSION-BETA.001"
    exit 1
fi

# Verificar que git está inicializado
if [ ! -d ".git" ]; then
    echo "❌ Error: El repositorio git no está inicializado"
    exit 1
fi

echo ""
echo "📋 INSTRUCCIONES PARA PUBLICAR COMO PRIVADO:"
echo ""
echo "1. OPCIÓN A: Usando GitHub CLI (recomendado)"
echo "   ========================================="
echo "   Primero, autentícate:"
echo "   $ gh auth login"
echo ""
echo "   Luego, crea el repositorio privado:"
echo "   $ gh repo create LOGOS-ECOSYSTEM-VERSION-BETA.001 --private --source=. --remote=origin --push"
echo ""
echo "2. OPCIÓN B: Manualmente"
echo "   ====================="
echo "   a) Ve a https://github.com/new"
echo "   b) Nombre: LOGOS-ECOSYSTEM-VERSION-BETA.001"
echo "   c) Selecciona: 🔒 Private"
echo "   d) NO inicialices con README"
echo "   e) Crea el repositorio"
echo ""
echo "   Luego ejecuta estos comandos:"
echo "   $ git remote add origin https://github.com/TU-USUARIO/LOGOS-ECOSYSTEM-VERSION-BETA.001.git"
echo "   $ git push -u origin master"
echo ""
echo "3. OPCIÓN C: Script automatizado"
echo "   ============================="
echo "   Si tienes tu token de GitHub configurado:"
echo ""

# Crear script para publicación con token
cat > publish-with-token.sh << 'EOF'
#!/bin/bash

# Solicitar información
read -p "Ingresa tu usuario de GitHub: " GITHUB_USER
read -s -p "Ingresa tu token de GitHub (no se mostrará): " GITHUB_TOKEN
echo ""

# Crear repositorio privado usando la API de GitHub
echo "Creando repositorio privado..."
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{
    "name": "LOGOS-ECOSYSTEM-VERSION-BETA.001",
    "description": "Plataforma revolucionaria de IA con 100+ agentes especializados",
    "private": true,
    "has_issues": true,
    "has_projects": true,
    "has_wiki": true
  }'

# Agregar el remoto y hacer push
echo ""
echo "Configurando remoto y subiendo código..."
git remote add origin https://github.com/$GITHUB_USER/LOGOS-ECOSYSTEM-VERSION-BETA.001.git
git push -u origin master

echo ""
echo "✅ Repositorio privado creado y código subido!"
echo "🔗 URL: https://github.com/$GITHUB_USER/LOGOS-ECOSYSTEM-VERSION-BETA.001"
EOF

chmod +x publish-with-token.sh

echo "   $ ./publish-with-token.sh"
echo ""
echo "========================================"
echo "📌 NOTAS IMPORTANTES:"
echo ""
echo "- El repositorio será PRIVADO (solo tú podrás verlo)"
echo "- Puedes agregar colaboradores desde Settings → Manage access"
echo "- Puedes hacerlo público más tarde si lo deseas"
echo "- El repositorio incluye todo el código y documentación"
echo ""
echo "Estado actual del repositorio:"
git status --short
echo ""
echo "Commits:"
git log --oneline -5
echo ""
echo "========================================"