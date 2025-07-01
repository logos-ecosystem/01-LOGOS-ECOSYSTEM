import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import { AuditLogService } from '../services/auditLog.service';

export class UserController {
  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          twoFactorEnabled: true,
          stripeCustomerId: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { username, email } = req.body;
      const updateData: any = {};

      if (username) updateData.username = username;
      if (email) updateData.email = email;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          isVerified: true,
          updatedAt: true
        }
      });

      await AuditLogService.create({
        userId,
        action: AuditLogService.Actions.USER_UPDATED,
        entity: 'User',
        entityId: userId,
        changes: updateData
      }, req);

      res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      if (!user || !await bcrypt.compare(currentPassword, user.password)) {
        await AuditLogService.create({
          userId,
          action: AuditLogService.Actions.PASSWORD_CHANGED,
          entity: 'User',
          entityId: userId,
          success: false,
          errorMessage: 'Invalid current password'
        }, req);

        return res.status(400).json({ error: 'Invalid current password' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      await AuditLogService.create({
        userId,
        action: AuditLogService.Actions.PASSWORD_CHANGED,
        entity: 'User',
        entityId: userId,
        success: true
      }, req);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete account (GDPR compliance)
   */
  static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { password } = req.body;

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(400).json({ error: 'Invalid password' });
      }

      // Soft delete (mark as inactive)
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted_${userId}@deleted.com`,
          username: `deleted_${userId}`
        }
      });

      await AuditLogService.create({
        userId,
        action: AuditLogService.Actions.USER_DELETED,
        entity: 'User',
        entityId: userId,
        success: true
      }, req);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}