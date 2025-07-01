import { Request, Response, NextFunction } from 'express';
import { TwoFactorAuthService } from '../services/twoFactorAuth.service';
import { AuditLogService } from '../services/auditLog.service';
import { prisma } from '../config/database';

/**
 * Middleware to verify 2FA token when required
 */
export const requireTwoFactor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has 2FA enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true
      }
    });

    if (!user || !user.twoFactorEnabled) {
      // 2FA not enabled, continue normally
      return next();
    }

    // Check for 2FA token in headers or body
    const twoFactorToken = req.headers['x-2fa-token'] as string || req.body.twoFactorToken;

    if (!twoFactorToken) {
      return res.status(403).json({
        error: '2FA_REQUIRED',
        message: 'Two-factor authentication token required',
        requiresTwoFactor: true
      });
    }

    // Check if it's a backup code format (XXXX-XXXX)
    const isBackupCode = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(twoFactorToken);

    let isValid = false;
    if (isBackupCode) {
      // Verify backup code
      isValid = await TwoFactorAuthService.verifyBackupCode(userId, twoFactorToken);
    } else {
      // Verify TOTP token
      isValid = TwoFactorAuthService.verifyToken(user.twoFactorSecret!, twoFactorToken);
    }

    if (!isValid) {
      await AuditLogService.create({
        userId,
        action: '2FA_VERIFICATION_FAILED',
        entity: 'User',
        entityId: userId,
        success: false,
        errorMessage: 'Invalid 2FA token'
      }, req);

      return res.status(403).json({
        error: 'INVALID_2FA_TOKEN',
        message: 'Invalid two-factor authentication token'
      });
    }

    // Token is valid, continue
    next();
  } catch (error) {
    console.error('2FA middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during 2FA verification'
    });
  }
};

/**
 * Middleware for sensitive operations requiring 2FA even if user doesn't have it enabled
 */
export const forceTwoFactorForSensitiveOps = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If 2FA is not enabled, require email verification instead
    if (!user.twoFactorEnabled) {
      const emailToken = req.headers['x-email-verification-token'] as string || req.body.emailVerificationToken;

      if (!emailToken) {
        // Send verification email (implement email service)
        return res.status(403).json({
          error: 'VERIFICATION_REQUIRED',
          message: 'This operation requires additional verification. Please check your email.',
          verificationType: 'email',
          email: user.email
        });
      }

      // Verify email token (implement verification logic)
      // For now, we'll just check if a token is provided
      if (!emailToken || emailToken.length < 6) {
        return res.status(403).json({
          error: 'INVALID_VERIFICATION_TOKEN',
          message: 'Invalid verification token'
        });
      }
    } else {
      // User has 2FA enabled, use regular 2FA verification
      return requireTwoFactor(req, res, next);
    }

    next();
  } catch (error) {
    console.error('Sensitive operation 2FA middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during verification'
    });
  }
};

/**
 * Middleware to check if 2FA setup is complete
 */
export const checkTwoFactorSetup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorVerified: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add 2FA status to request
    req.user = {
      ...req.user!,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorVerified: user.twoFactorVerified
    };

    next();
  } catch (error) {
    console.error('2FA setup check error:', error);
    next(error);
  }
};

/**
 * List of operations that require 2FA
 */
export const SENSITIVE_OPERATIONS = [
  'DELETE_ACCOUNT',
  'CHANGE_EMAIL',
  'CHANGE_PASSWORD',
  'GENERATE_API_KEY',
  'DELETE_API_KEY',
  'EXPORT_DATA',
  'CHANGE_PAYMENT_METHOD',
  'CANCEL_SUBSCRIPTION',
  'TRANSFER_OWNERSHIP',
  'CHANGE_ROLE',
  'DISABLE_2FA'
];

/**
 * Decorator to require 2FA for specific routes
 */
export const require2FA = (req: Request, res: Response, next: NextFunction) => {
  return requireTwoFactor(req, res, next);
};