import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    hasPermission,
    requestPermission
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const getNotificationIcon = (type: string) => {
    const icons = {
      info: 'fas fa-info-circle',
      success: 'fas fa-check-circle',
      warning: 'fas fa-exclamation-triangle',
      error: 'fas fa-times-circle',
      critical: 'fas fa-exclamation-circle'
    };
    return icons[type as keyof typeof icons] || icons.info;
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      info: 'text-blue-400',
      success: 'text-green-400',
      warning: 'text-yellow-400',
      error: 'text-red-400',
      critical: 'text-red-600'
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      system: 'fas fa-cog',
      payment: 'fas fa-credit-card',
      security: 'fas fa-shield-alt',
      bot: 'fas fa-robot',
      support: 'fas fa-life-ring',
      usage: 'fas fa-chart-line'
    };
    return icons[category as keyof typeof icons] || 'fas fa-bell';
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.action?.url) {
      window.location.href = notification.action.url;
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <i className="fas fa-bell text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute bottom-0 right-0 h-2 w-2 bg-yellow-400 rounded-full"></span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 glass-effect rounded-xl shadow-2xl border border-cyan-500/20 overflow-hidden z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 px-4 py-3 border-b border-cyan-500/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {!isConnected && (
                  <span className="text-xs text-yellow-400">
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    Offline
                  </span>
                )}
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </button>
              </div>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  filter === 'all' 
                    ? 'bg-cyan-500/20 text-cyan-300' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  filter === 'unread' 
                    ? 'bg-cyan-500/20 text-cyan-300' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Permission Request */}
          {!hasPermission && (
            <div className="px-4 py-3 bg-yellow-900/20 border-b border-yellow-500/20">
              <p className="text-sm text-yellow-300 mb-2">
                <i className="fas fa-info-circle mr-2"></i>
                Enable browser notifications to stay updated
              </p>
              <button
                onClick={requestPermission}
                className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs hover:bg-yellow-500/30 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <i className="fas fa-bell-slash text-3xl mb-2"></i>
                <p className="text-sm">No {filter === 'unread' ? 'unread ' : ''}notifications</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-800 hover:bg-gray-900/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-cyan-900/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                        <i className={getNotificationIcon(notification.type)}></i>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-white mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="ml-2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">
                          <i className={`${getCategoryIcon(notification.category)} mr-1`}></i>
                          {notification.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </span>
                        {notification.action && (
                          <span className="text-xs text-cyan-400 hover:text-cyan-300">
                            {notification.action.label}
                            <i className="fas fa-chevron-right ml-1 text-xs"></i>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => window.location.href = '/dashboard/notifications'}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  View all notifications
                </button>
                <button
                  onClick={clearAll}
                  className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;