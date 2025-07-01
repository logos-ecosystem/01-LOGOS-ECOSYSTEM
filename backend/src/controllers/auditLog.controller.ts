import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/auditLog.service';

export class AuditLogController {
  /**
   * Get audit logs
   */
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Parse query parameters
      const filters: any = {
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0
      };

      // Admin can see all logs, users can only see their own
      if (userRole !== 'ADMIN') {
        filters.userId = userId;
      } else if (req.query.userId) {
        filters.userId = req.query.userId as string;
      }

      // Add other filters
      if (req.query.action) filters.action = req.query.action as string;
      if (req.query.entity) filters.entity = req.query.entity as string;
      if (req.query.entityId) filters.entityId = req.query.entityId as string;
      if (req.query.success !== undefined) filters.success = req.query.success === 'true';

      // Date filters
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const result = await AuditLogService.getLogs(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity summary
   */
  static async getUserActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const targetUserId = req.params.userId || userId;

      // Check permissions
      if (userRole !== 'ADMIN' && targetUserId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const days = parseInt(req.query.days as string) || 30;
      const activity = await AuditLogService.getUserActivity(targetUserId!, days);

      res.json({
        success: true,
        data: {
          userId: targetUserId,
          days,
          activity
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security events (Admin only)
   */
  static async getSecurityEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const hours = parseInt(req.query.hours as string) || 24;
      const events = await AuditLogService.getSecurityEvents(hours);

      res.json({
        success: true,
        data: {
          hours,
          events
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export audit logs (Admin only)
   */
  static async exportLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Create audit log for export action
      await AuditLogService.create({
        userId: req.user?.id,
        action: AuditLogService.Actions.DATA_EXPORT,
        entity: 'AuditLog',
        entityId: 'all'
      }, req);

      const filters: any = {};

      // Add filters from query
      if (req.query.userId) filters.userId = req.query.userId as string;
      if (req.query.action) filters.action = req.query.action as string;
      if (req.query.entity) filters.entity = req.query.entity as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      // Get all logs matching filters (no pagination for export)
      const result = await AuditLogService.getLogs({
        ...filters,
        limit: 10000 // Set a reasonable max limit
      });

      // Convert to CSV
      const csv = this.convertToCSV(result.logs);

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);

      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert logs to CSV format
   */
  private static convertToCSV(logs: any[]): string {
    if (logs.length === 0) return '';

    // Define headers
    const headers = [
      'Date',
      'User',
      'Action',
      'Entity',
      'Entity ID',
      'Success',
      'IP Address',
      'User Agent',
      'Error Message'
    ];

    // Create CSV rows
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.user ? `${log.user.email} (${log.user.username})` : 'System',
      log.action,
      log.entity,
      log.entityId || '',
      log.success ? 'Yes' : 'No',
      log.ipAddress || '',
      log.userAgent || '',
      log.errorMessage || ''
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Get audit log statistics (Admin only)
   */
  static async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get various statistics
      const [totalLogs, failedActions, topActions, topUsers] = await Promise.all([
        // Total logs
        prisma.auditLog.count({
          where: { createdAt: { gte: startDate } }
        }),
        
        // Failed actions
        prisma.auditLog.count({
          where: {
            createdAt: { gte: startDate },
            success: false
          }
        }),
        
        // Top actions
        prisma.auditLog.groupBy({
          by: ['action'],
          where: { createdAt: { gte: startDate } },
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10
        }),
        
        // Top users
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: startDate },
            userId: { not: null }
          },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          period: { days, startDate },
          statistics: {
            totalLogs,
            failedActions,
            successRate: totalLogs > 0 ? ((totalLogs - failedActions) / totalLogs * 100).toFixed(2) + '%' : '100%',
            topActions: topActions.map(a => ({
              action: a.action,
              count: a._count.action
            })),
            topUsers: topUsers.map(u => ({
              userId: u.userId,
              count: u._count.userId
            }))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

// Import prisma here to avoid circular dependency
import { prisma } from '../config/database';