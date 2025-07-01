import { prisma } from '../config/database';
import { Request } from 'express';

export interface AuditLogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: any;
  success?: boolean;
  errorMessage?: string;
}

export class AuditLogService {
  /**
   * Create audit log entry
   */
  static async create(data: AuditLogData, req?: Request): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          ...data,
          ipAddress: req ? this.getIpAddress(req) : undefined,
          userAgent: req ? req.headers['user-agent'] : undefined,
          changes: data.changes ? JSON.stringify(data.changes) : undefined,
          success: data.success !== undefined ? data.success : true
        }
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the application
    }
  }

  /**
   * Get audit logs with filtering
   */
  static async getLogs(filters: {
    userId?: string;
    action?: string;
    entity?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.success !== undefined) where.success = filters.success;
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs: logs.map(log => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes as string) : null
      })),
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0
    };
  }

  /**
   * Get user activity summary
   */
  static async getUserActivity(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: { action: true }
    });

    return logs.map(log => ({
      action: log.action,
      count: log._count.action
    }));
  }

  /**
   * Get security events
   */
  static async getSecurityEvents(hours: number = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const securityActions = [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 
      'PASSWORD_CHANGED', 'EMAIL_CHANGED',
      'ENABLE_2FA', 'DISABLE_2FA', 'USE_BACKUP_CODE',
      'API_KEY_CREATED', 'API_KEY_DELETED',
      'ROLE_CHANGED', 'ACCOUNT_LOCKED'
    ];

    return await prisma.auditLog.findMany({
      where: {
        action: { in: securityActions },
        createdAt: { gte: startDate }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Clean old audit logs
   */
  static async cleanOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  /**
   * Get IP address from request
   */
  private static getIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Common audit log actions
   */
  static readonly Actions = {
    // Authentication
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
    
    // User management
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DELETED: 'USER_DELETED',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
    EMAIL_CHANGED: 'EMAIL_CHANGED',
    ROLE_CHANGED: 'ROLE_CHANGED',
    
    // 2FA
    ENABLE_2FA: 'ENABLE_2FA',
    DISABLE_2FA: 'DISABLE_2FA',
    USE_BACKUP_CODE: 'USE_BACKUP_CODE',
    REGENERATE_BACKUP_CODES: 'REGENERATE_BACKUP_CODES',
    
    // API Keys
    API_KEY_CREATED: 'API_KEY_CREATED',
    API_KEY_DELETED: 'API_KEY_DELETED',
    API_KEY_USED: 'API_KEY_USED',
    
    // Products
    PRODUCT_CREATED: 'PRODUCT_CREATED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    PRODUCT_DELETED: 'PRODUCT_DELETED',
    PRODUCT_ACTIVATED: 'PRODUCT_ACTIVATED',
    PRODUCT_DEACTIVATED: 'PRODUCT_DEACTIVATED',
    
    // Subscriptions
    SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
    SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
    SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
    
    // Support
    TICKET_CREATED: 'TICKET_CREATED',
    TICKET_UPDATED: 'TICKET_UPDATED',
    TICKET_CLOSED: 'TICKET_CLOSED',
    
    // Security
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    
    // Admin actions
    ADMIN_ACCESS: 'ADMIN_ACCESS',
    CONFIG_CHANGED: 'CONFIG_CHANGED',
    DATA_EXPORT: 'DATA_EXPORT',
    DATA_IMPORT: 'DATA_IMPORT'
  };
}