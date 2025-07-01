import { Router } from 'express';
import subscriptionController from '../controllers/subscription.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

// Get all available plans
router.get('/plans', subscriptionController.getPlans);

// Get current user subscription
router.get('/current', subscriptionController.getCurrentSubscription);

// Create new subscription
router.post('/',
  [
    body('planId').notEmpty().withMessage('Plan ID is required'),
    body('paymentMethodId').notEmpty().withMessage('Payment method ID is required')
  ],
  validateRequest,
  subscriptionController.createSubscription
);

// Update subscription
router.put('/:subscriptionId',
  [
    param('subscriptionId').isUUID().withMessage('Invalid subscription ID'),
    body('planId').notEmpty().withMessage('Plan ID is required')
  ],
  validateRequest,
  subscriptionController.updateSubscription
);

// Cancel subscription
router.post('/:subscriptionId/cancel',
  [
    param('subscriptionId').isUUID().withMessage('Invalid subscription ID'),
    body('immediate').optional().isBoolean()
  ],
  validateRequest,
  subscriptionController.cancelSubscription
);

// Reactivate subscription
router.post('/:subscriptionId/reactivate',
  [
    param('subscriptionId').isUUID().withMessage('Invalid subscription ID')
  ],
  validateRequest,
  subscriptionController.reactivateSubscription
);

// Payment methods
router.get('/payment-methods', subscriptionController.getPaymentMethods);

router.post('/payment-methods',
  [
    body('paymentMethodId').notEmpty().withMessage('Payment method ID is required')
  ],
  validateRequest,
  subscriptionController.addPaymentMethod
);

router.put('/payment-methods/:paymentMethodId/default',
  [
    param('paymentMethodId').notEmpty()
  ],
  validateRequest,
  subscriptionController.setDefaultPaymentMethod
);

router.delete('/payment-methods/:paymentMethodId',
  [
    param('paymentMethodId').notEmpty()
  ],
  validateRequest,
  subscriptionController.removePaymentMethod
);

// Invoices
router.get('/invoices',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  subscriptionController.getInvoices
);

router.get('/invoices/:invoiceId',
  [
    param('invoiceId').notEmpty()
  ],
  validateRequest,
  subscriptionController.getInvoiceDetails
);

router.get('/invoices/:invoiceId/download',
  [
    param('invoiceId').notEmpty()
  ],
  validateRequest,
  subscriptionController.downloadInvoice
);

// Usage statistics
router.get('/usage', subscriptionController.getUsageStats);

router.get('/usage/history',
  [
    query('startDate').isISO8601().withMessage('Invalid start date'),
    query('endDate').isISO8601().withMessage('Invalid end date')
  ],
  validateRequest,
  subscriptionController.getUsageHistory
);

// Stripe specific endpoints
router.post('/stripe/setup-intent', subscriptionController.createSetupIntent);

router.post('/stripe/payment-intent',
  [
    body('amount').isInt({ min: 50 }).withMessage('Invalid amount')
  ],
  validateRequest,
  subscriptionController.createPaymentIntent
);

router.post('/stripe/checkout-session',
  [
    body('planId').notEmpty().withMessage('Plan ID is required')
  ],
  validateRequest,
  subscriptionController.createCheckoutSession
);

router.post('/stripe/customer-portal', subscriptionController.createCustomerPortalSession);

export default router;