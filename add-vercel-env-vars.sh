#!/bin/bash

# LOGOS ECOSYSTEM - Add Environment Variables to Vercel
# This script adds all necessary environment variables to the existing Vercel project

echo "🔐 Adding Environment Variables to Vercel"
echo "======================================="
echo ""

cd frontend

# Production environment variables
echo "Adding NEXT_PUBLIC_API_URL..."
echo "https://api.logos-ecosystem.com" | vercel env add NEXT_PUBLIC_API_URL production

echo "Adding NEXT_PUBLIC_APP_URL..."
echo "https://logos-ecosystem.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

echo "Adding NEXT_PUBLIC_GRAPHQL_URL..."
echo "https://api.logos-ecosystem.com/graphql" | vercel env add NEXT_PUBLIC_GRAPHQL_URL production

echo "Adding NEXT_PUBLIC_WS_URL..."
echo "wss://api.logos-ecosystem.com" | vercel env add NEXT_PUBLIC_WS_URL production

echo "Adding NEXT_PUBLIC_APP_NAME..."
echo "LOGOS Ecosystem" | vercel env add NEXT_PUBLIC_APP_NAME production

echo "Adding NEXT_PUBLIC_ENABLE_ANALYTICS..."
echo "true" | vercel env add NEXT_PUBLIC_ENABLE_ANALYTICS production

echo "Adding NEXT_PUBLIC_ENABLE_CHAT..."
echo "true" | vercel env add NEXT_PUBLIC_ENABLE_CHAT production

echo "Adding NEXT_PUBLIC_ENABLE_NOTIFICATIONS..."
echo "true" | vercel env add NEXT_PUBLIC_ENABLE_NOTIFICATIONS production

# Payment keys (you'll need to replace with real values)
echo "Adding NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY..."
echo "pk_test_51234567890abcdefghijklmnopqrstuvwxyz" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

echo "Adding NEXT_PUBLIC_PAYPAL_CLIENT_ID..."
echo "ATBj6N9KcQx8kKzUebFZBKrQOxmQ6xyzABCDEF" | vercel env add NEXT_PUBLIC_PAYPAL_CLIENT_ID production

echo ""
echo "✅ Environment variables added successfully!"
echo ""
echo "To redeploy with new environment variables:"
echo "  cd frontend && vercel --prod"
echo ""
echo "To view all environment variables:"
echo "  vercel env ls"
echo ""
echo "⚠️  Important: Replace the payment keys with your actual production values!"