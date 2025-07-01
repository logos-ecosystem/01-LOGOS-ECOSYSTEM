import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.middleware';
import { gdprController } from '../controllers/gdpr.controller';
import { rateLimiter } from '../middleware/security.middleware';

const router = Router();

// All GDPR routes require authentication
router.use(authenticateToken);

// Get user's data export
router.post(
  '/data-export',
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }), // 5 requests per hour
  gdprController.requestDataExport
);

// Download exported data
router.get(
  '/data-export/:exportId',
  gdprController.downloadDataExport
);

// Update privacy preferences
router.put(
  '/preferences',
  [
    body('marketingEmails').optional().isBoolean(),
    body('productUpdates').optional().isBoolean(),
    body('usageAnalytics').optional().isBoolean(),
    body('thirdPartySharing').optional().isBoolean(),
  ],
  gdprController.updatePrivacyPreferences
);

// Get privacy preferences
router.get(
  '/preferences',
  gdprController.getPrivacyPreferences
);

// Delete user account and all data
router.delete(
  '/delete-account',
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 }), // 3 attempts per hour
  [
    body('confirmation').equals('DELETE').withMessage('Invalid confirmation'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  gdprController.deleteAccount
);

// Get data processing activities
router.get(
  '/processing-activities',
  gdprController.getProcessingActivities
);

// Consent management
router.post(
  '/consent',
  [
    body('type').isIn(['cookies', 'analytics', 'marketing', 'all']),
    body('granted').isBoolean(),
  ],
  gdprController.updateConsent
);

router.get(
  '/consent',
  gdprController.getConsent
);

// Data rectification request
router.post(
  '/rectify',
  [
    body('field').notEmpty(),
    body('value').notEmpty(),
    body('reason').optional().isString(),
  ],
  gdprController.requestDataRectification
);

// Data portability
router.get(
  '/export/json',
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }),
  gdprController.exportDataAsJSON
);

// Right to be informed
router.get(
  '/privacy-notice',
  gdprController.getPrivacyNotice
);

// Data retention info
router.get(
  '/retention',
  gdprController.getDataRetentionInfo
);

export default router;