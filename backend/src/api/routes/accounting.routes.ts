import { Router } from 'express';
import { accountingController } from '../controllers/accounting.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { body, param } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get available accounting providers
router.get('/providers', accountingController.getProviders);

// Get user's accounting integrations
router.get('/integrations', accountingController.getIntegrations);

// Connect to accounting provider
router.post('/connect/:provider',
  validateRequest([
    param('provider').isIn(['quickbooks', 'xero', 'sage', 'freshbooks']),
    body('authCode').optional().isString(),
    body('realmId').optional().isString()
  ]),
  accountingController.connectProvider
);

// Disconnect from accounting provider
router.delete('/disconnect/:provider',
  validateRequest([
    param('provider').isIn(['quickbooks', 'xero', 'sage', 'freshbooks'])
  ]),
  accountingController.disconnectProvider
);

// Sync specific invoice
router.post('/sync/invoice/:invoiceId',
  validateRequest([
    param('invoiceId').isUUID()
  ]),
  accountingController.syncInvoice
);

// Sync specific payment
router.post('/sync/payment/:paymentId',
  validateRequest([
    param('paymentId').isUUID()
  ]),
  accountingController.syncPayment
);

// Bulk sync
router.post('/sync/bulk',
  validateRequest([
    body('type').isIn(['invoices', 'payments', 'customers', 'all']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
  ]),
  accountingController.bulkSync
);

// Get consolidated reports
router.get('/reports', accountingController.getReports);

// Get sync history
router.get('/sync-history', accountingController.getSyncHistory);

// Webhook endpoints
router.post('/webhooks/quickbooks', accountingController.handleQuickBooksWebhook);
router.post('/webhooks/xero', accountingController.handleXeroWebhook);

// Export data
router.post('/export',
  validateRequest([
    body('format').isIn(['csv', 'excel', 'pdf']),
    body('type').isIn(['invoices', 'payments', 'customers', 'reports']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
  ]),
  accountingController.exportData
);

// Import data
router.post('/import',
  validateRequest([
    body('provider').isIn(['quickbooks', 'xero', 'csv']),
    body('type').isIn(['invoices', 'payments', 'customers']),
    body('mappings').optional().isObject()
  ]),
  accountingController.importData
);

// Settings
router.get('/settings', accountingController.getSettings);
router.put('/settings',
  validateRequest([
    body('autoSync').optional().isBoolean(),
    body('syncFrequency').optional().isIn(['realtime', 'hourly', 'daily', 'weekly']),
    body('syncTypes').optional().isArray()
  ]),
  accountingController.updateSettings
);

export default router;