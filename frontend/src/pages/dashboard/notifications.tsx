import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import withAuth from '@/components/Auth/withAuth';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import dynamic from 'next/dynamic';

// Dynamic imports for charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

interface NotificationStats {
  total: number;
  unread: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  lastWeek: number[];
}

const NotificationsPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'preferences' | 'history'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    hasPermission,
    requestPermission,
    preferences,
    updatePreferences
  } = useNotifications();

  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byCategory: {},
    byType: {},
    lastWeek: []
  });

  // Calculate stats
  useEffect(() => {
    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};
    
    notifications.forEach(n => {
      byCategory[n.category] = (byCategory[n.category] || 0) + 1;
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    // Generate last week data
    const lastWeek = Array(7).fill(0);
    const now = new Date();
    notifications.forEach(n => {
      const date = new Date(n.timestamp);
      const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 7) {
        lastWeek[6 - daysAgo]++;
      }
    });

    setStats({
      total: notifications.length,
      unread: unreadCount,
      byCategory,
      byType,
      lastWeek
    });
  }, [notifications, unreadCount]);

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-500',
      medium: 'bg-blue-500',
      high: 'bg-yellow-500',
      urgent: 'bg-red-500'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.action?.url) {
      router.push(notification.action.url);
    }
  };

  const sendTestNotification = (type: string, category: string) => {
    const testMessages = {
      system: 'System maintenance scheduled for tonight',
      payment: 'Payment of $99.99 processed successfully',
      security: 'New login detected from Chrome on MacOS',
      bot: 'Bot "Customer Support AI" completed training',
      support: 'Your ticket #1234 has been updated',
      usage: 'API usage reached 80% of monthly limit'
    };

    // This would normally send through WebSocket
    console.log('Test notification:', { type, category, message: testMessages[category as keyof typeof testMessages] });
    setShowTestModal(false);
  };

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Notifications',
      data: stats.lastWeek,
      borderColor: 'rgb(34, 211, 238)',
      backgroundColor: 'rgba(34, 211, 238, 0.1)',
      tension: 0.4
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgb(34, 211, 238)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Notification Center</h1>
          <p className="text-gray-400">Manage your notifications and preferences</p>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <i className="fas fa-exclamation-triangle text-yellow-400"></i>
              <div>
                <p className="text-yellow-300 font-medium">Not connected to notification service</p>
                <p className="text-yellow-200 text-sm">Real-time notifications are unavailable</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-bell text-2xl text-cyan-400"></i>
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400 mt-1">All notifications</p>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-envelope text-2xl text-blue-400"></i>
              <span className="text-xs text-gray-400">Unread</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.unread}</p>
            <p className="text-sm text-gray-400 mt-1">Pending review</p>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-check-circle text-2xl text-green-400"></i>
              <span className="text-xs text-gray-400">Browser</span>
            </div>
            <p className="text-3xl font-bold text-white">{hasPermission ? 'ON' : 'OFF'}</p>
            <p className="text-sm text-gray-400 mt-1">Push notifications</p>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-chart-line text-2xl text-purple-400"></i>
              <span className="text-xs text-gray-400">This Week</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.lastWeek.reduce((a, b) => a + b, 0)}</p>
            <p className="text-sm text-gray-400 mt-1">Weekly total</p>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-effect rounded-xl p-6 border border-cyan-500/20 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Last 7 Days Activity</h3>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                : 'glass-effect text-gray-300 hover:text-white'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'preferences'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                : 'glass-effect text-gray-300 hover:text-white'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                : 'glass-effect text-gray-300 hover:text-white'
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        {activeTab === 'all' && (
          <div className="glass-effect rounded-xl border border-cyan-500/20">
            {/* Filters */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="system">System</option>
                  <option value="payment">Payment</option>
                  <option value="security">Security</option>
                  <option value="bot">Bot</option>
                  <option value="support">Support</option>
                  <option value="usage">Usage</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 bg-gray-800 text-cyan-400 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={unreadCount === 0}
                  >
                    Mark All Read
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-4 py-2 bg-gray-800 text-red-400 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={notifications.length === 0}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[600px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <i className="fas fa-bell-slash text-5xl text-gray-600 mb-4"></i>
                  <p className="text-gray-400">No notifications found</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-cyan-900/10' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                          <i className={`${getNotificationIcon(notification.type)} text-xl`}></i>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-white font-medium mb-1">
                              {notification.title}
                              {!notification.read && (
                                <span className="ml-2 inline-block w-2 h-2 bg-cyan-400 rounded-full"></span>
                              )}
                            </h4>
                            <p className="text-gray-400 text-sm mb-2">{notification.message}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                <i className={`${getCategoryIcon(notification.category)} mr-1`}></i>
                                {notification.category}
                              </span>
                              <span>
                                <i className="fas fa-clock mr-1"></i>
                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                              </span>
                              <span className={`px-2 py-1 rounded-full ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                        {notification.action && (
                          <button className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm">
                            {notification.action.label}
                            <i className="fas fa-arrow-right ml-1"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Preferences */}
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <h3 className="text-xl font-semibold text-white mb-6">General Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-gray-300">Email Notifications</span>
                  <button
                    onClick={() => updatePreferences({ email: !preferences.email })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.email ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.email ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-gray-300">Browser Notifications</span>
                  <button
                    onClick={() => {
                      if (!hasPermission) {
                        requestPermission();
                      } else {
                        updatePreferences({ browser: !preferences.browser });
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.browser && hasPermission ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.browser && hasPermission ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-gray-300">Sound Alerts</span>
                  <button
                    onClick={() => updatePreferences({ sound: !preferences.sound })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.sound ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.sound ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </label>

                <div className="pt-4 border-t border-gray-800">
                  <label className="flex items-center justify-between mb-4">
                    <span className="text-gray-300">Quiet Hours</span>
                    <button
                      onClick={() => updatePreferences({ 
                        quietHours: { 
                          ...preferences.quietHours, 
                          enabled: !preferences.quietHours.enabled 
                        } 
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.quietHours.enabled ? 'bg-cyan-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </label>

                  {preferences.quietHours.enabled && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={preferences.quietHours.start}
                        onChange={(e) => updatePreferences({
                          quietHours: { ...preferences.quietHours, start: e.target.value }
                        })}
                        className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={preferences.quietHours.end}
                        onChange={(e) => updatePreferences({
                          quietHours: { ...preferences.quietHours, end: e.target.value }
                        })}
                        className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Preferences */}
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <h3 className="text-xl font-semibold text-white mb-6">Notification Categories</h3>
              
              <div className="space-y-4">
                {Object.entries(preferences.categories).map(([category, enabled]) => (
                  <label key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <i className={`${getCategoryIcon(category)} text-gray-400`}></i>
                      <span className="text-gray-300 capitalize">{category}</span>
                    </div>
                    <button
                      onClick={() => updatePreferences({
                        categories: { ...preferences.categories, [category]: !enabled }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        enabled ? 'bg-cyan-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </label>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <button
                  onClick={() => setShowTestModal(true)}
                  className="w-full px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors"
                >
                  <i className="fas fa-bell mr-2"></i>
                  Send Test Notification
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <i className={`${getCategoryIcon(category)} text-gray-400`}></i>
                    <span className="text-gray-300 capitalize">{category}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="bg-gray-800 rounded-lg p-4">
                  <div className={`flex items-center gap-2 mb-2 ${getNotificationColor(type)}`}>
                    <i className={getNotificationIcon(type)}></i>
                    <span className="capitalize">{type}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Test Notification Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Send Test Notification</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Type</label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Category</label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="system">System</option>
                  <option value="payment">Payment</option>
                  <option value="security">Security</option>
                  <option value="bot">Bot</option>
                  <option value="support">Support</option>
                  <option value="usage">Usage</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => sendTestNotification('info', 'system')}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Send Test
              </button>
              <button
                onClick={() => setShowTestModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(NotificationsPage);