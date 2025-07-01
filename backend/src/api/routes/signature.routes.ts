import { Router } from 'express';
import { signatureController } from '../controllers/signature.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { body, param } from 'express-validator';
import multer from 'multer';

const router = Router();
const upload = multer({ memory: true });

// All routes require authentication
router.use(authMiddleware);

// Sign a document
router.post('/sign/:documentId',
  upload.single('document'),
  validateRequest([
    param('documentId').notEmpty(),
    body('signatureData').optional().isString(),
    body('signatureImage').optional().isString(), // Base64 image
    body('location').optional().isObject()
  ]),
  signatureController.signDocument
);

// Create signature request
router.post('/request',
  validateRequest([
    body('documentId').notEmpty(),
    body('signers').isArray().notEmpty(),
    body('signers.*.email').isEmail(),
    body('signers.*.name').notEmpty(),
    body('signers.*.role').notEmpty(),
    body('signers.*.order').isInt({ min: 1 }),
    body('deadline').optional().isISO8601(),
    body('sequential').optional().isBoolean(),
    body('message').optional().isString()
  ]),
  signatureController.createSignatureRequest
);

// Get signature requests
router.get('/requests', signatureController.getSignatureRequests);

// Get signature request details
router.get('/request/:requestId',
  validateRequest([
    param('requestId').isUUID()
  ]),
  signatureController.getSignatureRequest
);

// Cancel signature request
router.delete('/request/:requestId',
  validateRequest([
    param('requestId').isUUID()
  ]),
  signatureController.cancelSignatureRequest
);

// Verify document
router.get('/verify/:documentId',
  validateRequest([
    param('documentId').notEmpty()
  ]),
  signatureController.verifyDocument
);

// Get document signatures
router.get('/document/:documentId',
  validateRequest([
    param('documentId').notEmpty()
  ]),
  signatureController.getDocumentSignatures
);

// Download signed document
router.get('/download/:documentId',
  validateRequest([
    param('documentId').notEmpty()
  ]),
  signatureController.downloadSignedDocument
);

// Generate signature certificate
router.get('/certificate/:signatureId',
  validateRequest([
    param('signatureId').isUUID()
  ]),
  signatureController.generateCertificate
);

// Revoke signature
router.post('/revoke/:signatureId',
  validateRequest([
    param('signatureId').isUUID(),
    body('reason').notEmpty()
  ]),
  signatureController.revokeSignature
);

// Get audit trail
router.get('/audit/:documentId',
  validateRequest([
    param('documentId').notEmpty()
  ]),
  signatureController.getAuditTrail
);

// Bulk sign documents
router.post('/bulk-sign',
  validateRequest([
    body('documentIds').isArray().notEmpty(),
    body('signatureData').optional().isString()
  ]),
  signatureController.bulkSign
);

// Upload signature image
router.post('/upload-signature',
  upload.single('signature'),
  signatureController.uploadSignatureImage
);

// Get user's signature settings
router.get('/settings', signatureController.getSignatureSettings);

// Update signature settings
router.put('/settings',
  validateRequest([
    body('defaultSignatureImage').optional().isString(),
    body('signatureType').optional().isIn(['draw', 'type', 'upload']),
    body('fontFamily').optional().isString(),
    body('autoSign').optional().isBoolean()
  ]),
  signatureController.updateSignatureSettings
);

// Public verification endpoint (no auth required)
router.get('/public/verify/:certificateId',
  validateRequest([
    param('certificateId').notEmpty()
  ]),
  signatureController.publicVerifyCertificate
);

export default router;