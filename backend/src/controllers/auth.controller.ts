import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { emailService } from '../services/email.service';
import { AuditLogService } from '../services/auditLog.service';
import { TwoFactorAuthService } from '../services/twoFactorAuth.service';

const prisma = new PrismaClient();

class AuthController {
  // Register new user
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username, password } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: existingUser.email === email 
            ? 'Email already registered' 
            : 'Username already taken'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          verificationToken,
          isVerified: false
        },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true
        }
      });

      // Send verification email
      await emailService.sendVerificationEmail(email, verificationToken);

      // Generate tokens
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      res.status(201).json({
        user,
        token,
        refreshToken,
        message: 'Registration successful. Please verify your email.'
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  // Login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, twoFactorToken } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        await AuditLogService.create({
          action: AuditLogService.Actions.LOGIN_FAILED,
          entity: 'User',
          success: false,
          errorMessage: 'User not found'
        }, req);

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        await AuditLogService.create({
          userId: user.id,
          action: AuditLogService.Actions.LOGIN_FAILED,
          entity: 'User',
          entityId: user.id,
          success: false,
          errorMessage: 'Invalid password'
        }, req);

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        await AuditLogService.create({
          userId: user.id,
          action: AuditLogService.Actions.LOGIN_FAILED,
          entity: 'User',
          entityId: user.id,
          success: false,
          errorMessage: 'Account disabled'
        }, req);

        return res.status(403).json({
          error: 'Account disabled',
          message: 'Your account has been disabled'
        });
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!twoFactorToken) {
          return res.status(200).json({
            requiresTwoFactor: true,
            message: 'Please provide your 2FA code'
          });
        }

        // Verify 2FA token
        const isValidToken = TwoFactorAuthService.verifyToken(user.twoFactorSecret!, twoFactorToken);
        const isValidBackupCode = !isValidToken && await TwoFactorAuthService.verifyBackupCode(user.id, twoFactorToken);

        if (!isValidToken && !isValidBackupCode) {
          await AuditLogService.create({
            userId: user.id,
            action: '2FA_VERIFICATION_FAILED',
            entity: 'User',
            entityId: user.id,
            success: false,
            errorMessage: 'Invalid 2FA token'
          }, req);

          return res.status(401).json({
            error: 'Invalid 2FA code',
            message: 'The provided 2FA code is invalid'
          });
        }
      }

      // Generate tokens
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // Create session
      await prisma.session.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      // Create audit log
      await AuditLogService.create({
        userId: user.id,
        action: AuditLogService.Actions.LOGIN,
        entity: 'User',
        entityId: user.id,
        success: true
      }, req);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isVerified: user.isVerified,
          twoFactorEnabled: user.twoFactorEnabled
        },
        token,
        refreshToken
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  // Refresh token
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as any;

      // Check if session exists
      const session = await prisma.session.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          expiresAt: { gt: new Date() }
        }
      });

      if (!session) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Refresh token is invalid or expired'
        });
      }

      // Generate new access token
      const token = this.generateToken(decoded.userId);

      res.json({ token });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        error: 'Invalid token',
        message: 'Refresh token is invalid'
      });
    }
  }

  // Logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      // Delete session
      await prisma.session.deleteMany({
        where: {
          userId: req.user.id,
          token
        }
      });

      res.json({ message: 'Logout successful' });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  // Verify email
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      const user = await prisma.user.findFirst({
        where: { verificationToken: token }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid token',
          message: 'Verification token is invalid'
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null
        }
      });

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      logger.error('Email verification error:', error);
      next(error);
    }
  }

  // Forgot password
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if user exists
        return res.json({
          message: 'If the email exists, a reset link will be sent'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires
        }
      });

      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetToken);

      res.json({
        message: 'If the email exists, a reset link will be sent'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      next(error);
    }
  }

  // Reset password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid token',
          message: 'Reset token is invalid or expired'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      logger.error('Reset password error:', error);
      next(error);
    }
  }

  // Get current user
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isVerified: true,
          createdAt: true
        }
      });

      res.json(user);
    } catch (error) {
      logger.error('Get current user error:', error);
      next(error);
    }
  }

  // Update profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email } = req.body;
      const userId = req.user.id;

      // Check if username/email already taken
      if (username || email) {
        const existing = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: userId } },
              {
                OR: [
                  username ? { username } : {},
                  email ? { email } : {}
                ]
              }
            ]
          }
        });

        if (existing) {
          return res.status(409).json({
            error: 'Already exists',
            message: existing.username === username 
              ? 'Username already taken' 
              : 'Email already in use'
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(username && { username }),
          ...(email && { email, isVerified: false })
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isVerified: true
        }
      });

      res.json(updatedUser);
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  }

  // Change password
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Change password error:', error);
      next(error);
    }
  }

  // Helper methods
  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '30d' }
    );
  }
}

export default new AuthController();