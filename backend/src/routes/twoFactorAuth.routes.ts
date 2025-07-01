import { Router } from 'express';
import { TwoFactorAuthController } from '../controllers/twoFactorAuth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireTwoFactor } from '../middleware/twoFactorAuth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get 2FA status
router.get('/status', TwoFactorAuthController.getStatus);

// Generate 2FA secret and QR code
router.post(
  '/generate',
  TwoFactorAuthController.generateSecret
);

// Enable 2FA
router.post(
  '/enable',
  [
    body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  TwoFactorAuthController.enable
);

// Disable 2FA (requires 2FA verification)
router.post(
  '/disable',
  [
    body('password').notEmpty().withMessage('Password is required'),
    body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
  ],
  validateRequest,
  requireTwoFactor,
  TwoFactorAuthController.disable
);

// Regenerate backup codes (requires 2FA verification)
router.post(
  '/backup-codes/regenerate',
  [
    body('password').notEmpty().withMessage('Password is required'),
    body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
  ],
  validateRequest,
  requireTwoFactor,
  TwoFactorAuthController.regenerateBackupCodes
);

export default router;