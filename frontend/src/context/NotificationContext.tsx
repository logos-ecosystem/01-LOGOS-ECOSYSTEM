import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import wsService, { Notification } from '@/services/websocket';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
  requestPermission: () => Promise<NotificationPermission>;
  hasPermission: boolean;
  preferences: NotificationPreferences;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
}

interface NotificationPreferences {
  email: boolean;
  browser: boolean;
  sound: boolean;
  categories: {
    system: boolean;
    payment: boolean;
    security: boolean;
    bot: boolean;
    support: boolean;
    usage: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const defaultPreferences: NotificationPreferences = {
  email: true,
  browser: true,
  sound: true,
  categories: {
    system: true,
    payment: true,
    security: true,
    bot: true,
    support: true,
    usage: true
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  // Load saved notifications and preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load notifications from localStorage
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        try {
          setNotifications(JSON.parse(savedNotifications));
        } catch (error) {
          console.error('Error loading saved notifications:', error);
        }
      }

      // Load preferences
      const savedPreferences = localStorage.getItem('notificationPreferences');
      if (savedPreferences) {
        try {
          setPreferences({ ...defaultPreferences, ...JSON.parse(savedPreferences) });
        } catch (error) {
          console.error('Error loading notification preferences:', error);
        }
      }

      // Check notification permission
      setHasPermission(wsService.hasNotificationPermission());
    }
  }, []);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user?.id) {
      wsService.connect(user.id)
        .then(() => {
          setIsConnected(true);
          console.log('✅ Connected to notification service');
        })
        .catch((error) => {
          console.error('❌ Failed to connect to notification service:', error);
          setIsConnected(false);
        });

      // Setup WebSocket event listeners
      const unsubscribers = [
        wsService.on('notification', handleNewNotification),
        wsService.on('disconnect', () => setIsConnected(false)),
        wsService.on('reconnect', () => setIsConnected(true)),
        wsService.on('payment.success', handlePaymentSuccess),
        wsService.on('payment.failed', handlePaymentFailed),
        wsService.on('bot.error', handleBotError),
        wsService.on('support.ticket.update', handleSupportUpdate),
        wsService.on('usage.alert', handleUsageAlert)
      ];

      return () => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
        wsService.disconnect();
      };
    }
  }, [user?.id]);

  const handleNewNotification = useCallback((notification: Notification) => {
    // Check if category is enabled
    if (!preferences.categories[notification.category]) {
      return;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled && isInQuietHours()) {
      return;
    }

    // Add notification
    setNotifications(prev => [notification, ...prev].slice(0, 100)); // Keep last 100

    // Play sound if enabled and not low priority
    if (preferences.sound && notification.priority !== 'low') {
      playNotificationSound(notification.type);
    }
  }, [preferences]);

  const handlePaymentSuccess = useCallback((data: any) => {
    addNotification({
      type: 'success',
      category: 'payment',
      title: 'Payment Successful',
      message: `Your payment of $${data.amount} has been processed successfully.`,
      priority: 'medium',
      action: {
        label: 'View Invoice',
        url: `/dashboard/billing?invoice=${data.invoiceId}`
      }
    });
  }, []);

  const handlePaymentFailed = useCallback((data: any) => {
    addNotification({
      type: 'error',
      category: 'payment',
      title: 'Payment Failed',
      message: `Payment failed: ${data.reason}. Please update your payment method.`,
      priority: 'high',
      action: {
        label: 'Update Payment',
        url: '/dashboard/billing'
      }
    });
  }, []);

  const handleBotError = useCallback((data: any) => {
    addNotification({
      type: 'error',
      category: 'bot',
      title: 'Bot Error',
      message: `Bot "${data.botName}" encountered an error: ${data.error}`,
      priority: 'high',
      action: {
        label: 'View Details',
        url: `/dashboard/bots?id=${data.botId}`
      }
    });
  }, []);

  const handleSupportUpdate = useCallback((data: any) => {
    addNotification({
      type: 'info',
      category: 'support',
      title: 'Ticket Update',
      message: `Your support ticket #${data.ticketId} has been updated.`,
      priority: 'medium',
      action: {
        label: 'View Ticket',
        url: `/dashboard/support?ticket=${data.ticketId}`
      }
    });
  }, []);

  const handleUsageAlert = useCallback((data: any) => {
    const severity = data.percentage >= 90 ? 'critical' : 'warning';
    addNotification({
      type: severity as any,
      category: 'usage',
      title: 'Usage Alert',
      message: `You've used ${data.percentage}% of your ${data.resource} limit.`,
      priority: data.percentage >= 90 ? 'urgent' : 'high',
      action: {
        label: 'Upgrade Plan',
        url: '/dashboard/billing?upgrade=true'
      }
    });
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    handleNewNotification(newNotification);
  }, [handleNewNotification]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    wsService.markAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    wsService.markAllAsRead();
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const requestPermission = useCallback(async () => {
    const permission = await wsService.requestNotificationPermission();
    setHasPermission(permission === 'granted');
    return permission;
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem('notificationPreferences', JSON.stringify(updated));
    wsService.updatePreferences({
      email: updated.email,
      browser: updated.browser,
      categories: updated.categories,
      quietHours: updated.quietHours.enabled ? updated.quietHours : undefined
    });
  }, [preferences]);

  const isInQuietHours = (): boolean => {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  };

  const playNotificationSound = (type: Notification['type']) => {
    try {
      const audio = new Audio(`/sounds/notification-${type}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(e => console.warn('Could not play notification sound:', e));
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    requestPermission,
    hasPermission,
    preferences,
    updatePreferences
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};