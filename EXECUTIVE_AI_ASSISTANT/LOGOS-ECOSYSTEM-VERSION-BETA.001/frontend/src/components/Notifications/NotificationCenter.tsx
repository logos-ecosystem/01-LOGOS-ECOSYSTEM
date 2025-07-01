import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  ShoppingCart as PurchaseIcon,
  AccountBalanceWallet as WalletIcon,
  Chat as ChatIcon,
  Star as ReviewIcon,
  TrendingUp as SalesIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocketSubscription } from '../../hooks/useWebSocketSubscription';
import { useRouter } from 'next/router';

interface Notification {
  id: string;
  type: 'purchase' | 'sale' | 'wallet' | 'chat' | 'review' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
}

export const NotificationCenter: React.FC = () => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe to notifications
  useWebSocketSubscription('notification', (data: Notification) => {
    setNotifications(prev => [data, ...prev].slice(0, 50)); // Keep last 50
    if (!data.read) {
      setUnreadCount(prev => prev + 1);
    }
  });

  // Load initial notifications
  useEffect(() => {
    // In a real app, this would fetch from API
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'purchase',
        title: 'New Purchase',
        message: 'John Doe purchased your AI Model',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/dashboard/sales',
      },
      {
        id: '2',
        type: 'wallet',
        title: 'Payment Received',
        message: '$49.99 added to your wallet',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        actionUrl: '/dashboard/wallet',
      },
    ];
    
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );
    
    if (!notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate if action URL exists
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      handleClose();
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'purchase':
        return <PurchaseIcon />;
      case 'sale':
        return <SalesIcon />;
      case 'wallet':
        return <WalletIcon />;
      case 'chat':
        return <ChatIcon />;
      case 'review':
        return <ReviewIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'purchase':
      case 'sale':
        return 'success';
      case 'wallet':
        return 'primary';
      case 'chat':
        return 'info';
      case 'review':
        return 'warning';
      default:
        return 'default';
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-describedby={id}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 360, maxHeight: 480 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: `${getNotificationColor(notification.type)}.light`,
                      color: `${getNotificationColor(notification.type)}.main`,
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                        })}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        
        <Divider />
        
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button
            fullWidth
            size="small"
            onClick={() => {
              router.push('/notifications');
              handleClose();
            }}
          >
            View All Notifications
          </Button>
        </Box>
      </Popover>
    </>
  );
};