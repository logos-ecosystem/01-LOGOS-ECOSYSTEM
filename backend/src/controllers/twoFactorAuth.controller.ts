import { Request, Response, NextFunction } from 'express';
import { TwoFactorAuthService } from '../services/twoFactorAuth.service';
import { AuditLogService } from '../services/auditLog.service';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

export class TwoFactorAuthController {
  /**
   * Generate 2FA secret and QR code
   */
  static async generateSecret(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await TwoFactorAuthService.generateSecret(userId);

      await AuditLogService.create({
        userId,
        action: 'GENERATE_2FA_SECRET',
        entity: 'User',
        entityId: userId
      }, req);

      res.json({
        success: true,
        data: {
          secret: result.secret,
          qrCode: result.qrCode
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable 2FA
   */
  static async enable(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { token, password } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      if (!user || !await bcrypt.compare(password, user.password)) {
        await AuditLogService.create({
          userId,
          action: 'ENABLE_2FA_FAILED',
          entity: 'User',
          entityId: userId,
          success: false,
          errorMessage: 'Invalid password'
        }, req);

        return res.status(400).json({ error: 'Invalid password' });
      }

      // Enable 2FA
      const backupCodes = await TwoFactorAuthService.verifyAndEnable(userId, token);

      res.json({
        success: true,
        data: {
          backupCodes,
          message: '2FA has been enabled successfully. Please save your backup codes in a secure location.'
        }
      });
    } catch (error: any) {
      await AuditLogService.create({
        userId: req.user?.id,
        action: 'ENABLE_2FA_FAILED',
        entity: 'User',
        entityId: req.user?.id,
        success: false,
        errorMessage: error.message
      }, req);

      next(error);
    }
  }

  /**
   * Disable 2FA
   */
  static async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { password, token } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, twoFactorSecret: true, twoFactorEnabled: true }
      });

      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ error: '2FA is not enabled' });
      }

      if (!await bcrypt.compare(password, user.password)) {
        await AuditLogService.create({
          userId,
          action: 'DISABLE_2FA_FAILED',
          entity: 'User',
          entityId: userId,
          success: false,
          errorMessage: 'Invalid password'
        }, req);

        return res.status(400).json({ error: 'Invalid password' });
      }

      // Verify 2FA token
      if (!TwoFactorAuthService.verifyToken(user.twoFactorSecret!, token)) {
        await AuditLogService.create({
          userId,
          action: 'DISABLE_2FA_FAILED',
          entity: 'User',
          entityId: userId,
          success: false,
          errorMessage: 'Invalid 2FA token'
        }, req);

        return res.status(400).json({ error: 'Invalid 2FA token' });
      }

      await TwoFactorAuthService.disable(userId, password);

      res.json({
        success: true,
        message: '2FA has been disabled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { password, token } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, twoFactorSecret: true, twoFactorEnabled: true }
      });

      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ error: '2FA is not enabled' });
      }

      if (!await bcrypt.compare(password, user.password)) {
        await AuditLogService.create({
          userId,
          action: 'REGENERATE_BACKUP_CODES_FAILED',
          entity: 'User',
          entityId: userId,
          success: false,
          errorMessage: 'Invalid password'
        }, req);

        return res.status(400).json({ error: 'Invalid password' });
      }

      // Verify 2FA token
      if (!TwoFactorAuthService.verifyToken(user.twoFactorSecret!, token)) {
        await AuditLogService.create({
          userId,
          action: 'REGENERATE_BACKUP_CODES_FAILED',
          entity: 'User',
          entityId: userId,
          success: false,
          errorMessage: 'Invalid 2FA token'
        }, req);

        return res.status(400).json({ error: 'Invalid 2FA token' });
      }

      const backupCodes = await TwoFactorAuthService.regenerateBackupCodes(userId);

      res.json({
        success: true,
        data: {
          backupCodes,
          message: 'Backup codes have been regenerated. Please save them in a secure location.'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get 2FA status
   */
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          twoFactorVerified: true,
          twoFactorBackupCodes: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        data: {
          enabled: user.twoFactorEnabled,
          verifiedAt: user.twoFactorVerified,
          backupCodesRemaining: user.twoFactorBackupCodes.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}