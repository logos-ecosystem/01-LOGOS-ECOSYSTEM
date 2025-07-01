import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import Redis from 'redis';

const prisma = new PrismaClient();
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export class WebSocketService {
  private io: Server;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(io: Server) {
    this.io = io;
    this.setupRedis();
  }

  private async setupRedis() {
    try {
      await redisClient.connect();
      logger.info('Redis connected for WebSocket service');

      // Subscribe to Redis channels for cross-server communication
      const subscriber = redisClient.duplicate();
      await subscriber.connect();

      subscriber.subscribe('notifications', (message) => {
        const data = JSON.parse(message);
        this.sendToUser(data.userId, 'notification', data.notification);
      });

      subscriber.subscribe('ticket-updates', (message) => {
        const data = JSON.parse(message);
        this.sendToUser(data.userId, 'ticket-update', data.ticket);
      });

      subscriber.subscribe('product-updates', (message) => {
        const data = JSON.parse(message);
        this.sendToUser(data.userId, 'product-update', data.product);
      });
    } catch (error) {
      logger.error('Redis connection error:', error);
    }
  }

  public initialize() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication failed'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            username: true,
            role: true
          }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User ${socket.userId} connected via WebSocket`);

      // Add to connected users
      if (socket.userId) {
        if (!this.connectedUsers.has(socket.userId)) {
          this.connectedUsers.set(socket.userId, new Set());
        }
        this.connectedUsers.get(socket.userId)!.add(socket.id);

        // Join user's room
        socket.join(`user:${socket.userId}`);

        // Join role-based rooms
        if (socket.user?.role) {
          socket.join(`role:${socket.user.role}`);
        }
      }

      // Handle events
      this.setupEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`User ${socket.userId} disconnected`);
        
        if (socket.userId && this.connectedUsers.has(socket.userId)) {
          this.connectedUsers.get(socket.userId)!.delete(socket.id);
          
          if (this.connectedUsers.get(socket.userId)!.size === 0) {
            this.connectedUsers.delete(socket.userId);
          }
        }
      });
    });
  }

  private setupEventHandlers(socket: AuthenticatedSocket) {
    // Subscribe to specific channels
    socket.on('subscribe', (channel: string) => {
      const allowedChannels = ['tickets', 'products', 'notifications', 'metrics'];
      
      if (allowedChannels.includes(channel)) {
        socket.join(`${channel}:${socket.userId}`);
        logger.info(`User ${socket.userId} subscribed to ${channel}`);
      }
    });

    // Unsubscribe from channels
    socket.on('unsubscribe', (channel: string) => {
      socket.leave(`${channel}:${socket.userId}`);
      logger.info(`User ${socket.userId} unsubscribed from ${channel}`);
    });

    // Mark notification as read
    socket.on('notification:read', async (notificationId: string) => {
      try {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { read: true }
        });
        
        socket.emit('notification:read:success', notificationId);
      } catch (error) {
        logger.error('Error marking notification as read:', error);
        socket.emit('notification:read:error', 'Failed to mark notification as read');
      }
    });

    // Real-time chat for support
    socket.on('support:message', async (data: { ticketId: string; message: string }) => {
      try {
        // Create message in database
        const message = await prisma.ticketMessage.create({
          data: {
            ticketId: data.ticketId,
            userId: socket.userId!,
            message: data.message,
            isInternal: false
          }
        });

        // Get ticket details
        const ticket = await prisma.supportTicket.findUnique({
          where: { id: data.ticketId }
        });

        if (ticket) {
          // Send to ticket participants
          this.io.to(`ticket:${data.ticketId}`).emit('support:message:new', {
            ticketId: data.ticketId,
            message
          });

          // Notify assigned support agent
          if (ticket.assignedTo) {
            this.sendToUser(ticket.assignedTo, 'support:message:notification', {
              ticketId: data.ticketId,
              from: socket.user?.username,
              message: data.message
            });
          }
        }
      } catch (error) {
        logger.error('Error sending support message:', error);
        socket.emit('support:message:error', 'Failed to send message');
      }
    });

    // Join ticket room for real-time updates
    socket.on('support:join', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
      logger.info(`User ${socket.userId} joined ticket ${ticketId}`);
    });

    // Leave ticket room
    socket.on('support:leave', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
      logger.info(`User ${socket.userId} left ticket ${ticketId}`);
    });

    // Product metrics real-time updates
    socket.on('metrics:subscribe', (productId: string) => {
      socket.join(`metrics:${productId}`);
      
      // Send initial metrics
      this.sendProductMetrics(socket, productId);
      
      // Set up interval for periodic updates
      const interval = setInterval(() => {
        if (socket.connected) {
          this.sendProductMetrics(socket, productId);
        } else {
          clearInterval(interval);
        }
      }, 5000); // Update every 5 seconds
    });
  }

  private async sendProductMetrics(socket: Socket, productId: string) {
    try {
      const metrics = await prisma.productMetric.findFirst({
        where: { productId },
        orderBy: { date: 'desc' }
      });

      if (metrics) {
        socket.emit('metrics:update', {
          productId,
          metrics: {
            requests: metrics.requests,
            successRate: metrics.successfulRequests / (metrics.requests || 1) * 100,
            avgResponseTime: metrics.averageResponseTime,
            timestamp: new Date()
          }
        });
      }
    } catch (error) {
      logger.error('Error sending product metrics:', error);
    }
  }

  // Public methods for sending notifications
  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public sendToRole(role: string, event: string, data: any) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  public broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }

  public async createNotification(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    try {
      // Save to database
      const dbNotification = await prisma.notification.create({
        data: {
          userId,
          ...notification
        }
      });

      // Send real-time notification
      this.sendToUser(userId, 'notification:new', dbNotification);

      // Publish to Redis for cross-server communication
      await redisClient.publish('notifications', JSON.stringify({
        userId,
        notification: dbNotification
      }));

      return dbNotification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get online users count
  public getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

// Singleton instance
let wsService: WebSocketService;

export const initializeWebSocket = (io: Server) => {
  wsService = new WebSocketService(io);
  wsService.initialize();
  return wsService;
};

export const getWebSocketService = () => {
  if (!wsService) {
    throw new Error('WebSocket service not initialized');
  }
  return wsService;
};