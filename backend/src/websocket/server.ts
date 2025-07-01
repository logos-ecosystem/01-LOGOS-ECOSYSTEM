import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

interface NotificationPayload {
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  category: 'system' | 'payment' | 'security' | 'bot' | 'support' | 'usage';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action?: {
    label: string;
    url: string;
  };
  metadata?: Record<string, any>;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private redis: any;
  private subClient: any;

  constructor(httpServer: HTTPServer) {
    // Initialize Socket.IO with CORS
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'https://logos-ecosystem.com',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Setup Redis adapter for scaling
    this.setupRedis();

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const userId = socket.handshake.auth.userId;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Attach user info to socket
        socket.userId = decoded.userId || userId;
        socket.userEmail = decoded.email;

        // Join user's personal room
        socket.join(`user:${socket.userId}`);

        logger.info(`User ${socket.userId} connected via WebSocket`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Setup event handlers
    this.setupEventHandlers();
  }

  private async setupRedis() {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.io.adapter(createAdapter(pubClient, subClient));
      this.redis = pubClient;
      this.subClient = subClient;

      logger.info('Redis adapter connected for WebSocket scaling');
    } catch (error) {
      logger.error('Redis connection error:', error);
      // Continue without Redis (single server mode)
    }
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      // Subscribe to notification preferences
      socket.on('subscribe', async (data: { category: string }) => {
        if (socket.userId) {
          socket.join(`category:${data.category}`);
          logger.info(`User ${socket.userId} subscribed to ${data.category}`);
        }
      });

      // Unsubscribe from category
      socket.on('unsubscribe', async (data: { category: string }) => {
        if (socket.userId) {
          socket.leave(`category:${data.category}`);
          logger.info(`User ${socket.userId} unsubscribed from ${data.category}`);
        }
      });

      // Mark notification as read
      socket.on('notification.read', async (data: { id: string }) => {
        if (socket.userId) {
          await this.markNotificationAsRead(socket.userId, data.id);
        }
      });

      // Mark all notifications as read
      socket.on('notification.readAll', async () => {
        if (socket.userId) {
          await this.markAllNotificationsAsRead(socket.userId);
        }
      });

      // Update notification preferences
      socket.on('notification.preferences', async (preferences: any) => {
        if (socket.userId) {
          await this.updateUserPreferences(socket.userId, preferences);
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`User ${socket.userId} disconnected from WebSocket`);
      });

      // Custom events for different services
      this.setupPaymentEvents(socket);
      this.setupBotEvents(socket);
      this.setupSupportEvents(socket);
      this.setupUsageEvents(socket);
    });
  }

  private setupPaymentEvents(socket: AuthenticatedSocket) {
    socket.on('payment.process', async (data: any) => {
      // Handle payment processing events
      logger.info(`Payment event from user ${socket.userId}:`, data);
    });
  }

  private setupBotEvents(socket: AuthenticatedSocket) {
    socket.on('bot.status', async (data: any) => {
      // Handle bot status updates
      logger.info(`Bot status update from user ${socket.userId}:`, data);
    });

    socket.on('bot.message', async (data: any) => {
      // Handle bot messages
      logger.info(`Bot message from user ${socket.userId}:`, data);
    });
  }

  private setupSupportEvents(socket: AuthenticatedSocket) {
    socket.on('support.message', async (data: any) => {
      // Handle support messages
      logger.info(`Support message from user ${socket.userId}:`, data);
    });

    socket.on('support.typing', async (data: any) => {
      // Broadcast typing indicator
      socket.to(`support:${data.ticketId}`).emit('support.typing', {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    });
  }

  private setupUsageEvents(socket: AuthenticatedSocket) {
    socket.on('usage.check', async () => {
      if (socket.userId) {
        const usage = await this.getUserUsage(socket.userId);
        socket.emit('usage.data', usage);
      }
    });
  }

  // Public methods for sending notifications
  public async sendNotification(userId: string, notification: NotificationPayload) {
    try {
      // Save to database
      const savedNotification = await prisma.notification.create({
        data: {
          userId,
          type: notification.type,
          category: notification.category,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          action: notification.action ? JSON.stringify(notification.action) : null,
          metadata: notification.metadata ? JSON.stringify(notification.metadata) : null,
          read: false
        }
      });

      // Emit to user's room
      const notificationData = {
        id: savedNotification.id,
        ...notification,
        timestamp: savedNotification.createdAt.toISOString(),
        read: false
      };

      this.io.to(`user:${userId}`).emit('notification', notificationData);

      // Also emit to category room if user is subscribed
      this.io.to(`category:${notification.category}`).emit('notification', notificationData);

      logger.info(`Notification sent to user ${userId}:`, notification.title);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  public async broadcastSystemNotification(notification: NotificationPayload) {
    try {
      // Save system notification for all users
      const users = await prisma.user.findMany({ select: { id: true } });
      
      for (const user of users) {
        await this.sendNotification(user.id, notification);
      }

      logger.info('System notification broadcasted:', notification.title);
    } catch (error) {
      logger.error('Error broadcasting system notification:', error);
    }
  }

  // Specific notification methods
  public async notifyPaymentSuccess(userId: string, amount: number, invoiceId: string) {
    await this.sendNotification(userId, {
      type: 'success',
      category: 'payment',
      title: 'Payment Successful',
      message: `Your payment of $${amount} has been processed successfully.`,
      priority: 'medium',
      action: {
        label: 'View Invoice',
        url: `/dashboard/billing?invoice=${invoiceId}`
      }
    });

    this.io.to(`user:${userId}`).emit('payment.success', { amount, invoiceId });
  }

  public async notifyPaymentFailed(userId: string, reason: string) {
    await this.sendNotification(userId, {
      type: 'error',
      category: 'payment',
      title: 'Payment Failed',
      message: `Payment failed: ${reason}. Please update your payment method.`,
      priority: 'high',
      action: {
        label: 'Update Payment',
        url: '/dashboard/billing'
      }
    });

    this.io.to(`user:${userId}`).emit('payment.failed', { reason });
  }

  public async notifyBotError(userId: string, botId: string, botName: string, error: string) {
    await this.sendNotification(userId, {
      type: 'error',
      category: 'bot',
      title: 'Bot Error',
      message: `Bot "${botName}" encountered an error: ${error}`,
      priority: 'high',
      action: {
        label: 'View Details',
        url: `/dashboard/bots?id=${botId}`
      }
    });

    this.io.to(`user:${userId}`).emit('bot.error', { botId, botName, error });
  }

  public async notifyBotStatus(userId: string, botId: string, status: string) {
    this.io.to(`user:${userId}`).emit('bot.status', { botId, status });
  }

  public async notifySupportUpdate(userId: string, ticketId: string, message: string) {
    await this.sendNotification(userId, {
      type: 'info',
      category: 'support',
      title: 'Ticket Update',
      message: `Your support ticket #${ticketId} has been updated: ${message}`,
      priority: 'medium',
      action: {
        label: 'View Ticket',
        url: `/dashboard/support?ticket=${ticketId}`
      }
    });

    this.io.to(`user:${userId}`).emit('support.ticket.update', { ticketId, message });
  }

  public async notifyUsageAlert(userId: string, resource: string, percentage: number) {
    const severity = percentage >= 90 ? 'critical' : 'warning';
    const priority = percentage >= 90 ? 'urgent' : 'high';

    await this.sendNotification(userId, {
      type: severity as any,
      category: 'usage',
      title: 'Usage Alert',
      message: `You've used ${percentage}% of your ${resource} limit.`,
      priority: priority as any,
      action: {
        label: 'Upgrade Plan',
        url: '/dashboard/billing?upgrade=true'
      }
    });

    this.io.to(`user:${userId}`).emit('usage.alert', { resource, percentage });
  }

  public async notifySecurityEvent(userId: string, event: string, details: string) {
    await this.sendNotification(userId, {
      type: 'warning',
      category: 'security',
      title: 'Security Alert',
      message: `${event}: ${details}`,
      priority: 'high',
      action: {
        label: 'Review Security',
        url: '/dashboard/settings?tab=security'
      }
    });
  }

  // Helper methods
  private async markNotificationAsRead(userId: string, notificationId: string) {
    try {
      await prisma.notification.update({
        where: { id: notificationId, userId },
        data: { read: true }
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  }

  private async markAllNotificationsAsRead(userId: string) {
    try {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  }

  private async updateUserPreferences(userId: string, preferences: any) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          notificationPreferences: JSON.stringify(preferences)
        }
      });
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
    }
  }

  private async getUserUsage(userId: string) {
    try {
      // Get user's current usage from database
      const usage = await prisma.usage.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      return usage || {
        apiCalls: { used: 0, limit: 1000 },
        storage: { used: 0, limit: 5000 },
        bandwidth: { used: 0, limit: 10000 },
        aiTokens: { used: 0, limit: 100000 }
      };
    } catch (error) {
      logger.error('Error getting user usage:', error);
      return null;
    }
  }

  // System monitoring
  public getConnectionCount(): number {
    return this.io.sockets.sockets.size;
  }

  public getRoomMembers(room: string): string[] {
    const members = this.io.sockets.adapter.rooms.get(room);
    return members ? Array.from(members) : [];
  }

  public async disconnect() {
    await this.io.close();
    if (this.redis) {
      await this.redis.quit();
      await this.subClient.quit();
    }
  }

  // Add missing methods for server.ts compatibility
  public close(): void {
    this.disconnect().catch(error => {
      logger.error('Error closing WebSocket server:', error);
    });
  }

  public isReady(): boolean {
    // Check if the Socket.IO server is ready and Redis is connected (if applicable)
    const ioReady = this.io && this.io.sockets && this.io.sockets.sockets.size >= 0;
    const redisReady = !this.redis || (this.redis && this.redis.isReady);
    return ioReady && redisReady;
  }
}

export default WebSocketServer;