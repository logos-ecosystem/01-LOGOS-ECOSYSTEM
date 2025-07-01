import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export class NotificationService {
  async create(data: {
    userId: string;
    type: string;
    category: string;
    title: string;
    message: string;
    priority?: string;
    action?: any;
    actionUrl?: string;
    metadata?: any;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          category: data.category,
          title: data.title,
          message: data.message,
          priority: data.priority || 'low',
          action: data.action ? JSON.stringify(data.action) : null,
          actionUrl: data.actionUrl,
          metadata: data.metadata
        }
      });

      // You could emit a websocket event here if needed
      // websocketService.emit(data.userId, 'notification', notification);

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      return await prisma.notification.update({
        where: {
          id: notificationId,
          userId // Ensure user owns the notification
        },
        data: {
          read: true
        }
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      return await prisma.notification.updateMany({
        where: {
          userId,
          read: false
        },
        data: {
          read: true
        }
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string) {
    try {
      return await prisma.notification.count({
        where: {
          userId,
          read: false
        }
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  async getUserNotifications(userId: string, options?: {
    category?: string;
    read?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = { userId };
      
      if (options?.category) {
        where.category = options.category;
      }
      
      if (options?.read !== undefined) {
        where.read = options.read;
      }

      return await prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: options?.limit || 20,
        skip: options?.offset || 0
      });
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async delete(notificationId: string, userId: string) {
    try {
      return await prisma.notification.delete({
        where: {
          id: notificationId,
          userId // Ensure user owns the notification
        }
      });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  async deleteOldNotifications(daysToKeep: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          read: true // Only delete read notifications
        }
      });

      logger.info(`Deleted ${result.count} old notifications`);
      return result;
    } catch (error) {
      logger.error('Error deleting old notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();