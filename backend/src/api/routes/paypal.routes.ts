import { Router } from 'express';
import { paypalController } from '../controllers/paypal.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { body, param } from 'express-validator';

const router = Router();

// All routes except webhook require authentication
router.use((req, res, next) => {
  if (req.path === '/webhook') {
    return next();
  }
  authMiddleware(req, res, next);
});

// Get PayPal client configuration
router.get('/client-config', paypalController.getClientToken);

// Create subscription
router.post('/subscriptions',
  validateRequest([
    body('planId').isUUID(),
    body('returnUrl').optional().isURL(),
    body('cancelUrl').optional().isURL()
  ]),
  paypalController.createSubscription
);

// Get subscription details
router.get('/subscriptions/:subscriptionId',
  validateRequest([
    param('subscriptionId').notEmpty()
  ]),
  paypalController.getSubscription
);

// Cancel subscription
router.post('/subscriptions/:subscriptionId/cancel',
  validateRequest([
    param('subscriptionId').notEmpty(),
    body('reason').optional().isString()
  ]),
  paypalController.cancelSubscription
);

// Suspend subscription
router.post('/subscriptions/:subscriptionId/suspend',
  validateRequest([
    param('subscriptionId').notEmpty(),
    body('reason').optional().isString()
  ]),
  paypalController.suspendSubscription
);

// Reactivate subscription
router.post('/subscriptions/:subscriptionId/reactivate',
  validateRequest([
    param('subscriptionId').notEmpty(),
    body('reason').optional().isString()
  ]),
  paypalController.reactivateSubscription
);

// Create one-time payment
router.post('/payments',
  validateRequest([
    body('amount').isFloat({ min: 0.01 }),
    body('currency').optional().isISO4217(),
    body('description').optional().isString(),
    body('invoiceId').optional().isUUID(),
    body('returnUrl').optional().isURL(),
    body('cancelUrl').optional().isURL(),
    body('items').optional().isArray(),
    body('items.*.name').optional().isString(),
    body('items.*.description').optional().isString(),
    body('items.*.quantity').optional().isInt({ min: 1 }),
    body('items.*.price').optional().isFloat({ min: 0 })
  ]),
  paypalController.createPayment
);

// Capture payment
router.post('/payments/capture',
  validateRequest([
    body('orderId').notEmpty()
  ]),
  paypalController.capturePayment
);

// Process refund
router.post('/refunds',
  validateRequest([
    body('captureId').notEmpty(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('currency').optional().isISO4217(),
    body('reason').optional().isString()
  ]),
  paypalController.refundPayment
);

// Get payment methods
router.get('/payment-methods', paypalController.getPaymentMethods);

// Update payment preferences
router.put('/preferences',
  validateRequest([
    body('defaultPaymentMethod').isIn(['STRIPE', 'PAYPAL'])
  ]),
  paypalController.updatePaymentPreferences
);

// Sync plans (admin only)
router.post('/sync-plans', paypalController.syncPlans);

// Webhook endpoint (no auth)
router.post('/webhook', paypalController.handleWebhook);

export default router;