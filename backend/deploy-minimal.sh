#!/bin/bash

echo "🚀 Minimal deployment for Railway"

# Use minimal package.json
mv package.json package-full.json
cp package-minimal.json package.json

# Clean everything
rm -rf node_modules dist

# Install only essential dependencies
export NODE_OPTIONS="--max-old-space-size=512"
export JOBS=1

echo "📦 Installing minimal dependencies..."
npm install --production --no-optional --legacy-peer-deps

echo "🔨 Building..."
npm install typescript @types/node @types/express prisma
npx prisma generate
npx tsc -p tsconfig.minimal.json

echo "🧹 Cleaning up..."
npm uninstall typescript @types/node @types/express
npm prune --production

echo "✅ Build complete!"