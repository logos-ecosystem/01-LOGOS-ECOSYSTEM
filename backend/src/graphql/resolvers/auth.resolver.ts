import { AuthenticationError, UserInputError } from 'apollo-server-express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authService } from '../../services/auth.service';
import { emailService } from '../../services/email.service';
import { auditLogService } from '../../services/auditLog.service';
import { validateRegistration, validateLogin } from '../../utils/validation';

const prisma = new PrismaClient();

export default {
  Query: {
    me: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      return prisma.user.findUnique({
        where: { id: context.user.id },
        include: {
          subscriptions: true,
          invoices: true,
          tickets: true,
          bots: true,
        },
      });
    },
  },

  Mutation: {
    register: async (_: any, { input }: any) => {
      // Validate input
      const validation = validateRegistration(input);
      if (!validation.isValid) {
        throw new UserInputError('Validation failed', { errors: validation.errors });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (existingUser) {
        throw new UserInputError('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          language: input.language || 'en',
          timezone: input.timezone || 'UTC',
        },
      });

      // Generate tokens
      const token = authService.generateToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Send welcome email
      await emailService.sendWelcomeEmail(user);

      // Log registration
      await auditLogService.log({
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: user.id,
        metadata: { email: user.email },
      });

      return {
        user,
        token,
        refreshToken,
      };
    },

    login: async (_: any, { input }: any) => {
      // Validate input
      const validation = validateLogin(input);
      if (!validation.isValid) {
        throw new UserInputError('Validation failed', { errors: validation.errors });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Verify password
      const validPassword = await bcrypt.compare(input.password, user.password);
      if (!validPassword) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!input.twoFactorCode) {
          throw new UserInputError('Two-factor authentication code required');
        }

        const isValid2FA = await authService.verify2FACode(user.id, input.twoFactorCode);
        if (!isValid2FA) {
          throw new AuthenticationError('Invalid two-factor authentication code');
        }
      }

      // Check email verification
      if (!user.emailVerified) {
        throw new AuthenticationError('Email not verified');
      }

      // Generate tokens
      const token = authService.generateToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Log login
      await auditLogService.log({
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: user.id,
        metadata: { ip: context.ip, userAgent: context.userAgent },
      });

      return {
        user,
        token,
        refreshToken,
      };
    },

    logout: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Invalidate refresh token
      await authService.invalidateRefreshToken(context.user.id);

      // Log logout
      await auditLogService.log({
        userId: context.user.id,
        action: 'USER_LOGOUT',
        entityType: 'user',
        entityId: context.user.id,
      });

      return true;
    },

    refreshToken: async (_: any, { refreshToken }: any) => {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET!
        ) as any;

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user || !user.isActive) {
          throw new AuthenticationError('Invalid refresh token');
        }

        // Generate new tokens
        const newToken = authService.generateToken(user);
        const newRefreshToken = authService.generateRefreshToken(user);

        return {
          user,
          token: newToken,
          refreshToken: newRefreshToken,
        };
      } catch (error) {
        throw new AuthenticationError('Invalid refresh token');
      }
    },

    forgotPassword: async (_: any, { email }: any) => {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if user exists
        return true;
      }

      // Generate reset token
      const resetToken = await authService.generatePasswordResetToken(user.id);

      // Send reset email
      await emailService.sendPasswordResetEmail(user, resetToken);

      // Log password reset request
      await auditLogService.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'user',
        entityId: user.id,
      });

      return true;
    },

    resetPassword: async (_: any, { token, newPassword }: any) => {
      // Verify token
      const userId = await authService.verifyPasswordResetToken(token);
      if (!userId) {
        throw new UserInputError('Invalid or expired reset token');
      }

      // Validate password
      if (newPassword.length < 8) {
        throw new UserInputError('Password must be at least 8 characters');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Invalidate reset token
      await authService.invalidatePasswordResetToken(token);

      // Log password reset
      await auditLogService.log({
        userId,
        action: 'PASSWORD_RESET',
        entityType: 'user',
        entityId: userId,
      });

      return true;
    },

    verifyEmail: async (_: any, { token }: any) => {
      // Verify token
      const userId = await authService.verifyEmailToken(token);
      if (!userId) {
        throw new UserInputError('Invalid or expired verification token');
      }

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });

      // Log email verification
      await auditLogService.log({
        userId,
        action: 'EMAIL_VERIFIED',
        entityType: 'user',
        entityId: userId,
      });

      return true;
    },

    enable2FA: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Generate 2FA secret
      const { secret, qrCode, backupCodes } = await authService.generate2FASecret(
        context.user.id
      );

      // Log 2FA enablement
      await auditLogService.log({
        userId: context.user.id,
        action: '2FA_ENABLED',
        entityType: 'user',
        entityId: context.user.id,
      });

      return {
        secret,
        qrCode,
        backupCodes,
      };
    },

    verify2FA: async (_: any, { code }: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const isValid = await authService.verify2FACode(context.user.id, code);
      
      if (!isValid) {
        throw new UserInputError('Invalid verification code');
      }

      // Enable 2FA
      await prisma.user.update({
        where: { id: context.user.id },
        data: { twoFactorEnabled: true },
      });

      return true;
    },

    disable2FA: async (_: any, { code }: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const isValid = await authService.verify2FACode(context.user.id, code);
      
      if (!isValid) {
        throw new UserInputError('Invalid verification code');
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: context.user.id },
        data: { twoFactorEnabled: false },
      });

      // Log 2FA disablement
      await auditLogService.log({
        userId: context.user.id,
        action: '2FA_DISABLED',
        entityType: 'user',
        entityId: context.user.id,
      });

      return true;
    },
  },
};