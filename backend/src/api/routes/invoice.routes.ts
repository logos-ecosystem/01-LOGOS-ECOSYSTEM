import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createInvoiceSchema = Joi.object({
  customerId: Joi.string().uuid().optional(),
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unitPrice: Joi.number().positive().required(),
      taxRate: Joi.number().min(0).max(100).optional(),
      discountRate: Joi.number().min(0).max(100).optional(),
      productId: Joi.string().uuid().optional(),
      serviceId: Joi.string().uuid().optional()
    })
  ).min(1).required(),
  dueDate: Joi.date().greater('now').required(),
  paymentTerms: Joi.string().optional(),
  notes: Joi.string().optional(),
  discount: Joi.number().min(0).max(100).optional(),
  taxRate: Joi.number().min(0).max(100).optional(),
  sendEmail: Joi.boolean().optional(),
  recurring: Joi.object({
    frequency: Joi.string().valid('monthly', 'quarterly', 'yearly').required(),
    endDate: Joi.date().optional(),
    occurrences: Joi.number().positive().optional(),
    autoSend: Joi.boolean().optional(),
    autoCharge: Joi.boolean().optional()
  }).optional()
});

const updateInvoiceSchema = Joi.object({
  dueDate: Joi.date().optional(),
  paymentTerms: Joi.string().optional(),
  notes: Joi.string().optional(),
  status: Joi.string().valid('draft', 'pending', 'paid', 'cancelled').optional()
});

const applyPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  method: Joi.string().required(),
  reference: Joi.string().required(),
  date: Joi.date().required()
});

// Routes
router.get(
  '/',
  authMiddleware,
  invoiceController.getInvoices
);

router.get(
  '/analytics',
  authMiddleware,
  invoiceController.getAnalytics
);

router.get(
  '/:id',
  authMiddleware,
  invoiceController.getInvoice
);

router.post(
  '/',
  authMiddleware,
  validateRequest(createInvoiceSchema),
  invoiceController.createInvoice
);

router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateInvoiceSchema),
  invoiceController.updateInvoice
);

router.delete(
  '/:id',
  authMiddleware,
  invoiceController.deleteInvoice
);

router.post(
  '/:id/send',
  authMiddleware,
  invoiceController.sendInvoice
);

router.get(
  '/:id/pdf',
  authMiddleware,
  invoiceController.generatePDF
);

router.post(
  '/:id/payments',
  authMiddleware,
  validateRequest(applyPaymentSchema),
  invoiceController.applyPayment
);

router.post(
  '/recurring/generate',
  authMiddleware,
  invoiceController.generateRecurringInvoices
);

export default router;