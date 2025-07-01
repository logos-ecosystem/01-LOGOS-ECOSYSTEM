#!/bin/bash

echo "Fixing critical build errors..."

# Fix logger imports
find src -name "*.ts" -exec sed -i "s/import logger from '\.\.\/utils\/logger'/import { logger } from '..\/utils\/logger'/g" {} \;

# Fix claude service export
sed -i "s/import { claudeService }/import { ClaudeService }/g" src/services/github.service.ts

# Fix email transporter typo
sed -i "s/createTransporter/createTransport/g" src/services/health.service.ts

# Fix auditLogService import
sed -i "s/import { auditLogService }/import { AuditLogService }/g" src/services/paypal.service.ts

# Create missing invoice service
cat > src/services/invoice.service.ts << 'EOF'
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export class InvoiceService {
  async createInvoice(data: any) {
    try {
      return await prisma.invoice.create({ data });
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  async getInvoice(id: string) {
    return await prisma.invoice.findUnique({ where: { id } });
  }

  async updateInvoice(id: string, data: any) {
    return await prisma.invoice.update({ where: { id }, data });
  }
}

export const invoiceService = new InvoiceService();
EOF

echo "Build error fixes applied!"