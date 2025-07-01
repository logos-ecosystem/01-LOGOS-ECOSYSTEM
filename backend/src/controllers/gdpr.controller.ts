import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { logInfo, logError } from '../utils/logger';
import { createAuditLog } from '../middleware/security.middleware';
import { emailService } from '../services/email.service';
import { storageService } from '../services/storage.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const gdprController = {
  // Request data export
  async requestDataExport(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      // Check if there's a recent export request
      const recentExport = await prisma.dataExportRequest.findFirst({
        where: {
          userId,
          status: { in: ['pending', 'processing'] },
          createdAt: { gte: addDays(new Date(), -1) }
        }
      });

      if (recentExport) {
        return res.status(429).json({
          error: 'A data export request is already in progress. Please wait 24 hours.'
        });
      }

      // Create export request
      const exportRequest = await prisma.dataExportRequest.create({
        data: {
          id: uuidv4(),
          userId,
          status: 'pending',
          requestedAt: new Date()
        }
      });

      // Queue export job (in production, use a job queue like Bull)
      setTimeout(() => {
        processDataExport(exportRequest.id).catch(err => 
          logError(err, { exportRequestId: exportRequest.id })
        );
      }, 0);

      // Send confirmation email
      await emailService.sendDataExportRequestConfirmation(req.user!.email);

      // Create audit log
      await createAuditLog({
        action: 'DATA_EXPORT_REQUESTED',
        resource: 'user_data',
        resourceId: userId,
        result: 'SUCCESS',
        req
      });

      res.json({
        message: 'Data export requested. You will receive an email within 48 hours.',
        exportId: exportRequest.id
      });
    } catch (error) {
      logError(error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to request data export' });
    }
  },

  // Download exported data
  async downloadDataExport(req: Request, res: Response) {
    try {
      const { exportId } = req.params;
      const userId = req.user!.id;

      const exportRequest = await prisma.dataExportRequest.findFirst({
        where: {
          id: exportId,
          userId,
          status: 'completed'
        }
      });

      if (!exportRequest || !exportRequest.fileUrl) {
        return res.status(404).json({ error: 'Export not found or not ready' });
      }

      // Check if export is expired (7 days)
      if (exportRequest.completedAt && exportRequest.completedAt < addDays(new Date(), -7)) {
        return res.status(410).json({ error: 'Export has expired' });
      }

      // Generate signed URL for download
      const downloadUrl = await storageService.getSignedUrl(exportRequest.fileUrl);

      res.json({ downloadUrl });
    } catch (error) {
      logError(error as Error, { exportId: req.params.exportId });
      res.status(500).json({ error: 'Failed to get export download' });
    }
  },

  // Update privacy preferences
  async updatePrivacyPreferences(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const preferences = req.body;

      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            upsert: {
              create: preferences,
              update: preferences
            }
          }
        }
      });

      // Create audit log
      await createAuditLog({
        action: 'PRIVACY_PREFERENCES_UPDATED',
        resource: 'user_preferences',
        resourceId: userId,
        details: preferences,
        result: 'SUCCESS',
        req
      });

      res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
      logError(error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  },

  // Get privacy preferences
  async getPrivacyPreferences(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preferences: true }
      });

      res.json({
        preferences: user?.preferences || {
          marketingEmails: false,
          productUpdates: true,
          usageAnalytics: true,
          thirdPartySharing: false
        }
      });
    } catch (error) {
      logError(error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get preferences' });
    }
  },

  // Delete account and all data
  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { password } = req.body;

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Start transaction to delete all user data
      await prisma.$transaction(async (tx) => {
        // Delete related data in order
        await tx.apiKey.deleteMany({ where: { userId } });
        await tx.apiUsage.deleteMany({ 
          where: { apiKey: { userId } } 
        });
        await tx.product.deleteMany({ where: { userId } });
        await tx.subscription.deleteMany({ where: { userId } });
        await tx.supportTicket.deleteMany({ where: { userId } });
        await tx.auditLog.deleteMany({ where: { userId } });
        await tx.passwordReset.deleteMany({ where: { userId } });
        await tx.dataExportRequest.deleteMany({ where: { userId } });
        await tx.userPreferences.deleteMany({ where: { userId } });
        await tx.userConsent.deleteMany({ where: { userId } });
        
        // Finally delete the user
        await tx.user.delete({ where: { id: userId } });
      });

      // Send confirmation email
      await emailService.sendAccountDeletionConfirmation(user.email);

      // Create final audit log
      await createAuditLog({
        action: 'ACCOUNT_DELETED',
        resource: 'user',
        resourceId: userId,
        result: 'SUCCESS',
        req
      });

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      logError(error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to delete account' });
    }
  },

  // Get data processing activities
  async getProcessingActivities(req: Request, res: Response) {
    res.json({
      activities: [
        {
          purpose: 'Authentication and Security',
          dataTypes: ['Email', 'Password (hashed)', 'IP Address'],
          legalBasis: 'Contract',
          retention: '3 years after account deletion',
          required: true
        },
        {
          purpose: 'Payment Processing',
          dataTypes: ['Name', 'Billing Address', 'Payment Method (tokenized)'],
          legalBasis: 'Contract',
          retention: '7 years for tax purposes',
          required: true,
          processor: 'Stripe'
        },
        {
          purpose: 'Analytics and Improvement',
          dataTypes: ['Usage Data', 'Device Information', 'Location (country)'],
          legalBasis: 'Legitimate Interest',
          retention: '2 years',
          required: false
        },
        {
          purpose: 'Marketing Communications',
          dataTypes: ['Email', 'Name', 'Preferences'],
          legalBasis: 'Consent',
          retention: 'Until consent withdrawn',
          required: false
        },
        {
          purpose: 'Customer Support',
          dataTypes: ['Name', 'Email', 'Support Messages'],
          legalBasis: 'Contract',
          retention: '3 years after ticket closure',
          required: true
        }
      ]
    });
  },

  // Update consent
  async updateConsent(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { type, granted } = req.body;

      await prisma.userConsent.upsert({
        where: {
          userId_type: { userId, type }
        },
        update: {
          granted,
          updatedAt: new Date()
        },
        create: {
          userId,
          type,
          granted,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        }
      });

      // Create audit log
      await createAuditLog({
        action: 'CONSENT_UPDATED',
        resource: 'user_consent',
        resourceId: userId,
        details: { type, granted },
        result: 'SUCCESS',
        req
      });

      res.json({ message: 'Consent updated successfully' });
    } catch (error) {
      logError(error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to update consent' });
    }
  },

  // Get consent status
  async getConsent(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const consents = await prisma.userConsent.findMany({
        where: { userId }
      });

      res.json({ consents });
    } catch (error) {
      logError(error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get consent' });
    }
  },

  // Request data rectification
  async requestDataRectification(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { field, value, reason } = req.body;

      // Create rectification request
      await prisma.dataRectificationRequest.create({
        data: {
          userId,
          field,
          oldValue: '', // Would fetch current value in production
          newValue: value,
          reason,
          status: 'pending'
        }
      });

      // Notify admin team
      await emailService.notifyAdminOfRectificationRequest(userId, field);

      res.json({ message: 'Rectification request submitted' });
    } catch (error) {
      logError(error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to submit rectification request' });
    }
  },

  // Export data as JSON (immediate)
  async exportDataAsJSON(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      const userData = await collectUserData(userId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
      res.json(userData);

      // Create audit log
      await createAuditLog({
        action: 'DATA_EXPORTED_JSON',
        resource: 'user_data',
        resourceId: userId,
        result: 'SUCCESS',
        req
      });
    } catch (error) {
      logError(error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to export data' });
    }
  },

  // Get privacy notice
  async getPrivacyNotice(req: Request, res: Response) {
    res.json({
      version: '2.0',
      lastUpdated: '2024-01-01',
      controller: {
        name: 'LOGOS AI Inc.',
        email: 'privacy@logos-ecosystem.com',
        address: '123 AI Street, Tech City, TC 12345'
      },
      dataProtectionOfficer: {
        name: 'Jane Doe',
        email: 'dpo@logos-ecosystem.com'
      },
      rights: [
        'Right to access your personal data',
        'Right to rectification of inaccurate data',
        'Right to erasure (right to be forgotten)',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object to processing',
        'Right to withdraw consent',
        'Right to lodge a complaint with supervisory authority'
      ],
      categories: [
        'Identity Data: name, username, title',
        'Contact Data: email, phone, address',
        'Financial Data: payment card details (tokenized)',
        'Transaction Data: purchases, payment history',
        'Technical Data: IP address, browser type, device info',
        'Profile Data: preferences, feedback, survey responses',
        'Usage Data: how you use our services',
        'Marketing Data: preferences for receiving marketing'
      ]
    });
  },

  // Get data retention info
  async getDataRetentionInfo(req: Request, res: Response) {
    res.json({
      policies: [
        {
          dataType: 'Account Information',
          retention: '3 years after account deletion',
          reason: 'Legal compliance and dispute resolution'
        },
        {
          dataType: 'Transaction Records',
          retention: '7 years',
          reason: 'Tax and financial regulations'
        },
        {
          dataType: 'Support Tickets',
          retention: '3 years after closure',
          reason: 'Service improvement and dispute resolution'
        },
        {
          dataType: 'Usage Analytics',
          retention: '2 years',
          reason: 'Service improvement and performance monitoring'
        },
        {
          dataType: 'Marketing Preferences',
          retention: 'Until consent withdrawn',
          reason: 'Respect user preferences'
        },
        {
          dataType: 'Security Logs',
          retention: '1 year',
          reason: 'Security monitoring and incident response'
        }
      ]
    });
  }
};

// Helper function to collect all user data
async function collectUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      preferences: true,
      consents: true,
      products: true,
      subscriptions: {
        include: { plan: true }
      },
      apiKeys: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastUsedAt: true,
          // Don't include the actual key
        }
      },
      supportTickets: {
        include: { comments: true }
      }
    }
  });

  // Remove sensitive data
  if (user) {
    delete (user as any).password;
    delete (user as any).twoFactorSecret;
  }

  return {
    exportDate: new Date().toISOString(),
    userData: user,
    metadata: {
      accountCreated: user?.createdAt,
      lastLogin: user?.lastLoginAt,
      totalProducts: user?.products.length || 0,
      totalApiKeys: user?.apiKeys.length || 0,
      totalSupportTickets: user?.supportTickets.length || 0
    }
  };
}

// Process data export (async job)
async function processDataExport(exportRequestId: string) {
  try {
    const exportRequest = await prisma.dataExportRequest.findUnique({
      where: { id: exportRequestId },
      include: { user: true }
    });

    if (!exportRequest) return;

    // Update status
    await prisma.dataExportRequest.update({
      where: { id: exportRequestId },
      data: { status: 'processing' }
    });

    // Collect all user data
    const userData = await collectUserData(exportRequest.userId);

    // Create ZIP file with data
    const fileName = `user-data-export-${exportRequest.userId}-${Date.now()}.json`;
    const fileContent = JSON.stringify(userData, null, 2);
    
    // Encrypt the data
    const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key');
    const encrypted = Buffer.concat([cipher.update(fileContent), cipher.final()]);

    // Upload to storage
    const fileUrl = await storageService.uploadFile(
      `gdpr-exports/${fileName}`,
      encrypted,
      'application/octet-stream'
    );

    // Update export request
    await prisma.dataExportRequest.update({
      where: { id: exportRequestId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        fileUrl
      }
    });

    // Send email with download link
    await emailService.sendDataExportReady(
      exportRequest.user.email,
      exportRequestId
    );

    logInfo('Data export completed', { exportRequestId, userId: exportRequest.userId });
  } catch (error) {
    logError(error as Error, { exportRequestId });
    
    // Update status to failed
    await prisma.dataExportRequest.update({
      where: { id: exportRequestId },
      data: { status: 'failed' }
    });
  }
}