import { Router } from 'express';
import productController from '../controllers/product.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

// Get all products
router.get('/',
  [
    query('type').optional().isIn(['expert_bot', 'ai_assistant', 'automation_agent', 'analytics_bot', 'custom_solution']),
    query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending', 'error', 'maintenance']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  productController.getProducts
);

// Get product details
router.get('/:id',
  [
    param('id').isUUID().withMessage('Invalid product ID')
  ],
  validateRequest,
  productController.getProductDetails
);

// Create new product
router.post('/',
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('type').isIn(['expert_bot', 'ai_assistant', 'automation_agent', 'analytics_bot', 'custom_solution']),
    body('description').notEmpty().withMessage('Description is required'),
    body('templateId').optional().isUUID(),
    body('configuration').optional().isObject()
  ],
  validateRequest,
  productController.createProduct
);

// Update product
router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    body('name').optional().notEmpty(),
    body('description').optional().notEmpty(),
    body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending', 'error', 'maintenance'])
  ],
  validateRequest,
  productController.updateProduct
);

// Update product configuration
router.put('/:id/configuration',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    body('general').optional().isObject(),
    body('behavior').optional().isObject(),
    body('capabilities').optional().isObject(),
    body('security').optional().isObject()
  ],
  validateRequest,
  productController.updateConfiguration
);

// Test product configuration
router.post('/:id/test',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    body('input').notEmpty().withMessage('Test input is required')
  ],
  validateRequest,
  productController.testConfiguration
);

// Delete product
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid product ID')
  ],
  validateRequest,
  productController.deleteProduct
);

// Duplicate product
router.post('/:id/duplicate',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    body('name').notEmpty().withMessage('New product name is required')
  ],
  validateRequest,
  productController.duplicateProduct
);

// Deploy product
router.post('/:id/deploy',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    body('environment').isIn(['development', 'staging', 'production'])
  ],
  validateRequest,
  productController.deployProduct
);

// Regenerate API key
router.post('/:id/api-key/regenerate',
  [
    param('id').isUUID().withMessage('Invalid product ID')
  ],
  validateRequest,
  productController.regenerateApiKey
);

// Get product metrics
router.get('/:id/metrics',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    query('startDate').isISO8601().withMessage('Invalid start date'),
    query('endDate').isISO8601().withMessage('Invalid end date')
  ],
  validateRequest,
  productController.getProductMetrics
);

// Get product logs
router.get('/:id/logs',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    query('level').optional().isIn(['info', 'warning', 'error', 'debug']),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  productController.getProductLogs
);

// Integration routes
router.get('/:id/integrations',
  [param('id').isUUID()],
  validateRequest,
  productController.getIntegrations
);

router.post('/:id/integrations',
  [
    param('id').isUUID(),
    body('type').notEmpty(),
    body('name').notEmpty(),
    body('config').isObject()
  ],
  validateRequest,
  productController.addIntegration
);

router.put('/:id/integrations/:integrationId',
  [
    param('id').isUUID(),
    param('integrationId').isUUID()
  ],
  validateRequest,
  productController.updateIntegration
);

router.delete('/:id/integrations/:integrationId',
  [
    param('id').isUUID(),
    param('integrationId').isUUID()
  ],
  validateRequest,
  productController.removeIntegration
);

// Webhook routes
router.get('/:id/webhooks',
  [param('id').isUUID()],
  validateRequest,
  productController.getWebhooks
);

router.post('/:id/webhooks',
  [
    param('id').isUUID(),
    body('url').isURL(),
    body('events').isArray(),
    body('events.*').isString()
  ],
  validateRequest,
  productController.addWebhook
);

router.put('/:id/webhooks/:webhookId',
  [
    param('id').isUUID(),
    param('webhookId').isUUID()
  ],
  validateRequest,
  productController.updateWebhook
);

router.delete('/:id/webhooks/:webhookId',
  [
    param('id').isUUID(),
    param('webhookId').isUUID()
  ],
  validateRequest,
  productController.removeWebhook
);

// Custom command routes
router.get('/:id/commands',
  [param('id').isUUID()],
  validateRequest,
  productController.getCommands
);

router.post('/:id/commands',
  [
    param('id').isUUID(),
    body('name').notEmpty(),
    body('description').notEmpty(),
    body('trigger').notEmpty(),
    body('action').notEmpty(),
    body('parameters').isArray()
  ],
  validateRequest,
  productController.addCommand
);

router.put('/:id/commands/:commandId',
  [
    param('id').isUUID(),
    param('commandId').isUUID()
  ],
  validateRequest,
  productController.updateCommand
);

router.delete('/:id/commands/:commandId',
  [
    param('id').isUUID(),
    param('commandId').isUUID()
  ],
  validateRequest,
  productController.removeCommand
);

// Template routes
router.get('/templates',
  [
    query('category').optional().isString()
  ],
  validateRequest,
  productController.getTemplates
);

router.get('/templates/:templateId',
  [
    param('templateId').isUUID()
  ],
  validateRequest,
  productController.getTemplateDetails
);

// Import/Export routes
router.get('/:id/export',
  [param('id').isUUID()],
  validateRequest,
  productController.exportConfiguration
);

router.post('/:id/import',
  [param('id').isUUID()],
  validateRequest,
  productController.importConfiguration
);

export default router;