import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createIndexes() {
  console.log('📊 Creating performance indexes...');

  try {
    // Create composite indexes for common queries
    const indexes = [
      // User searches
      'CREATE INDEX IF NOT EXISTS idx_users_email_verified ON "User"(email, "isVerified")',
      
      // Invoice queries
      'CREATE INDEX IF NOT EXISTS idx_invoices_user_date ON "Invoice"("userId", "issueDate" DESC)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON "Invoice"(status, "dueDate")',
      
      // Notification queries
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON "Notification"("userId", read, "createdAt" DESC)',
      
      // API key lookups
      'CREATE INDEX IF NOT EXISTS idx_apikeys_key ON "ApiKey"(key)',
      
      // Support ticket queries
      'CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON "SupportTicket"("userId", status, "createdAt" DESC)',
      
      // Audit log queries
      'CREATE INDEX IF NOT EXISTS idx_auditlog_entity_date ON "AuditLog"(entity, "entityId", "createdAt" DESC)',
      
      // Usage tracking
      'CREATE INDEX IF NOT EXISTS idx_usage_period ON "Usage"("userId", period)',
      
      // Session lookups
      'CREATE INDEX IF NOT EXISTS idx_sessions_token ON "Session"(token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON "Session"("expiresAt")',
      
      // Product searches
      'CREATE INDEX IF NOT EXISTS idx_products_active ON "Product"("isActive", "createdAt" DESC)',
      
      // Subscription queries
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON "Subscription"("userId", status)',
      
      // Full text search indexes
      'CREATE INDEX IF NOT EXISTS idx_products_search ON "Product" USING GIN(to_tsvector(\'english\', name || \' \' || description))',
      'CREATE INDEX IF NOT EXISTS idx_tickets_search ON "SupportTicket" USING GIN(to_tsvector(\'english\', subject || \' \' || description))'
    ];

    for (const index of indexes) {
      try {
        await prisma.$executeRawUnsafe(index);
        console.log('✅ Created index:', index.match(/idx_\w+/)?.[0]);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('⏭️  Index already exists:', index.match(/idx_\w+/)?.[0]);
        } else {
          console.error('❌ Error creating index:', error.message);
        }
      }
    }

    // Create function for updated_at trigger
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for automatic updatedAt
    const tables = ['User', 'Product', 'Subscription', 'Invoice', 'SupportTicket'];
    
    for (const table of tables) {
      const triggerName = `update_${table.toLowerCase()}_updated_at`;
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER ${triggerName}
          BEFORE UPDATE ON "${table}"
          FOR EACH ROW
          EXECUTE PROCEDURE update_updated_at_column();
        `);
        console.log('✅ Created trigger:', triggerName);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('⏭️  Trigger already exists:', triggerName);
        } else {
          console.error('❌ Error creating trigger:', error.message);
        }
      }
    }

    // Analyze tables for query optimization
    console.log('\n🔍 Analyzing tables for query optimization...');
    const tablesToAnalyze = [
      'User', 'Product', 'Subscription', 'Invoice', 'InvoiceItem',
      'Payment', 'Notification', 'ApiKey', 'SupportTicket', 'AuditLog'
    ];

    for (const table of tablesToAnalyze) {
      try {
        await prisma.$executeRawUnsafe(`ANALYZE "${table}"`);
        console.log('✅ Analyzed table:', table);
      } catch (error) {
        console.error('❌ Error analyzing table:', table, error);
      }
    }

    console.log('\n🎉 Database indexing completed successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createIndexes();