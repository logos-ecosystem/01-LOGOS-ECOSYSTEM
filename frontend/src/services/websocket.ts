// WebSocket Service for Real-time Notifications
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  category: 'system' | 'payment' | 'security' | 'bot' | 'support' | 'usage';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
  metadata?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface WebSocketConfig {
  url: string;
  options: {
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    timeout: number;
  };
}

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private authToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('authToken');
    }
  }

  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://ws.logos-ecosystem.com';
        
        this.socket = io(wsUrl, {
          auth: {
            token: this.authToken,
            userId: userId
          },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          timeout: 20000
        });

        this.setupEventHandlers();
        
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('🟢 WebSocket connected');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Notification events
    this.socket.on('notification', (notification: Notification) => {
      this.emit('notification', notification);
      
      // Show browser notification if permitted
      if (this.hasNotificationPermission() && notification.priority !== 'low') {
        this.showBrowserNotification(notification);
      }
    });

    // System events
    this.socket.on('system.update', (data) => {
      this.emit('system.update', data);
    });

    // Payment events
    this.socket.on('payment.success', (data) => {
      this.emit('payment.success', data);
    });

    this.socket.on('payment.failed', (data) => {
      this.emit('payment.failed', data);
    });

    // Bot events
    this.socket.on('bot.status', (data) => {
      this.emit('bot.status', data);
    });

    this.socket.on('bot.error', (data) => {
      this.emit('bot.error', data);
    });

    // Support events
    this.socket.on('support.ticket.update', (data) => {
      this.emit('support.ticket.update', data);
    });

    this.socket.on('support.message', (data) => {
      this.emit('support.message', data);
    });

    // Usage alerts
    this.socket.on('usage.alert', (data) => {
      this.emit('usage.alert', data);
    });

    // Connection events
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.warn('🔴 WebSocket disconnected:', reason);
      this.emit('disconnect', { reason });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.isConnected = true;
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
      this.emit('reconnect', { attemptNumber });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 WebSocket reconnect attempt', attemptNumber);
      this.emit('reconnect_attempt', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnect error:', error);
      this.emit('reconnect_error', { error });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnect failed');
      this.emit('reconnect_failed', {});
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  off(event: string, callback?: (data: any) => void) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    }
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for event ${event}:`, error);
        }
      });
    }
  }

  sendMessage(event: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  // Browser Notification Methods
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  hasNotificationPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  showBrowserNotification(notification: Notification) {
    if (!this.hasNotificationPermission()) return;

    const icon = this.getNotificationIcon(notification.type);
    const badge = '/logos-badge.png';

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: icon,
      badge: badge,
      tag: notification.id,
      timestamp: new Date(notification.timestamp).getTime(),
      requireInteraction: notification.priority === 'urgent',
      silent: notification.priority === 'low',
      data: notification
    });

    browserNotification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      
      if (notification.action?.url) {
        window.location.href = notification.action.url;
      }
      
      browserNotification.close();
    };

    // Auto-close non-urgent notifications after 10 seconds
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        browserNotification.close();
      }, 10000);
    }
  }

  private getNotificationIcon(type: Notification['type']): string {
    const icons = {
      info: '/icons/info-notification.png',
      success: '/icons/success-notification.png',
      warning: '/icons/warning-notification.png',
      error: '/icons/error-notification.png',
      critical: '/icons/critical-notification.png'
    };
    return icons[type] || icons.info;
  }

  // Connection Status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Subscribe to specific notification categories
  subscribeToCategory(category: Notification['category']) {
    this.sendMessage('subscribe', { category });
  }

  unsubscribeFromCategory(category: Notification['category']) {
    this.sendMessage('unsubscribe', { category });
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    this.sendMessage('notification.read', { id: notificationId });
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.sendMessage('notification.readAll', {});
  }

  // Update notification preferences
  updatePreferences(preferences: {
    email: boolean;
    browser: boolean;
    categories: Record<Notification['category'], boolean>;
    quietHours?: { start: string; end: string };
  }) {
    this.sendMessage('notification.preferences', preferences);
  }
}

// Singleton instance
const wsService = new WebSocketService();

export default wsService;