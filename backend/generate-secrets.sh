#!/bin/bash

# Generate secure random secrets for LOGOS Ecosystem

echo "Generating secure random secrets..."
echo ""
echo "# Authentication Secrets"
echo "JWT_SECRET=\"$(openssl rand -base64 32)\""
echo "JWT_REFRESH_SECRET=\"$(openssl rand -base64 32)\""
echo "SESSION_SECRET=\"$(openssl rand -base64 32)\""
echo ""
echo "# Encryption Key (32 character hex)"
echo "ENCRYPTION_KEY=\"$(openssl rand -hex 16)\""
echo ""
echo "# Database Password (if creating new)"
echo "DB_PASSWORD=\"$(openssl rand -base64 24 | tr -d '/+' | cut -c1-20)\""
echo ""
echo "IMPORTANT: Save these securely and never commit them to version control!"