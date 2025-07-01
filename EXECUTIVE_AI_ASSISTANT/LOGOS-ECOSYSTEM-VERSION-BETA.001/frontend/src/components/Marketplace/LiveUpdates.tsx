import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Fade,
  LinearProgress,
  IconButton,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  Collapse,
} from '@mui/material';
import {
  TrendingUp as TrendingIcon,
  NewReleases as NewIcon,
  LocalOffer as SaleIcon,
  Star as ReviewIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocketSubscription } from '../../hooks/useWebSocketSubscription';
import { TransitionGroup } from 'react-transition-group';

interface MarketplaceUpdate {
  id: string;
  type: 'new_item' | 'sale' | 'price_update' | 'review' | 'trending';
  item_id: string;
  item_title: string;
  item_thumbnail?: string;
  seller_name?: string;
  buyer_name?: string;
  price?: number;
  old_price?: number;
  rating?: number;
  message: string;
  timestamp: string;
  category?: string;
  discount_percentage?: number;
}

export const LiveUpdates: React.FC = () => {
  const [updates, setUpdates] = useState<MarketplaceUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Subscribe to marketplace updates
  useWebSocketSubscription('marketplace_update', (data: MarketplaceUpdate) => {
    if (!filterType || data.type === filterType) {
      setUpdates(prev => {
        const newUpdates = [data, ...prev].slice(0, 50); // Keep last 50 updates
        return newUpdates;
      });
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      
      // Scroll to top if auto-refresh is enabled
      if (autoRefresh && listRef.current) {
        listRef.current.scrollTop = 0;
      }
    }
  });

  // Simulate initial data load with more diverse updates
  useEffect(() => {
    setTimeout(() => {
      const mockUpdates: MarketplaceUpdate[] = [
        {
          id: '1',
          type: 'new_item',
          item_id: '1',
          item_title: 'GPT-4 Fine-tuned Model',
          seller_name: 'AI Labs',
          message: 'New AI model listed by AI Labs',
          timestamp: new Date().toISOString(),
          category: 'AI Models',
        },
        {
          id: '2',
          type: 'sale',
          item_id: '2',
          item_title: 'Data Analysis Toolkit',
          buyer_name: 'John Doe',
          price: 99.99,
          message: 'John Doe purchased Data Analysis Toolkit',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          category: 'Tools',
        },
        {
          id: '3',
          type: 'review',
          item_id: '3',
          item_title: 'Machine Learning Course',
          rating: 5,
          message: 'New 5-star review for Machine Learning Course',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          category: 'Education',
        },
        {
          id: '4',
          type: 'price_update',
          item_id: '4',
          item_title: 'Advanced Analytics Dashboard',
          price: 149.99,
          old_price: 199.99,
          discount_percentage: 25,
          message: '25% off on Advanced Analytics Dashboard',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          category: 'Templates',
        },
        {
          id: '5',
          type: 'trending',
          item_id: '5',
          item_title: 'ChatGPT Plugin Development Kit',
          message: 'ChatGPT Plugin Development Kit is trending',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          category: 'Development',
        },
      ];
      setUpdates(mockUpdates);
      setLoading(false);
    }, 1000);
  }, []);

  // Clear unread count when component gains focus
  useEffect(() => {
    const handleFocus = () => setUnreadCount(0);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const getUpdateIcon = (type: MarketplaceUpdate['type']) => {
    switch (type) {
      case 'new_item':
        return <NewIcon />;
      case 'sale':
        return <SaleIcon />;
      case 'price_update':
        return <TrendingIcon />;
      case 'review':
        return <ReviewIcon />;
      case 'trending':
        return <TrendingIcon />;
    }
  };

  const getUpdateColor = (type: MarketplaceUpdate['type']) => {
    switch (type) {
      case 'new_item':
        return 'primary';
      case 'sale':
        return 'success';
      case 'price_update':
        return 'warning';
      case 'review':
        return 'info';
      case 'trending':
        return 'secondary';
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate fetching new updates
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const filteredUpdates = filterType 
    ? updates.filter(update => update.type === filterType)
    : updates;

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Badge badgeContent={unreadCount} color="error">
            <TrendingIcon sx={{ mr: 1, color: 'primary.main' }} />
          </Badge>
          <Typography variant="h6">Live Marketplace Activity</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={soundEnabled ? "Disable sound" : "Enable sound"}>
            <IconButton size="small" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <NotificationsActiveIcon /> : <NotificationsIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Controls */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              size="small"
            />
          }
          label="Auto-refresh"
        />
        
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Chip
            label="All"
            size="small"
            onClick={() => setFilterType(null)}
            color={!filterType ? 'primary' : 'default'}
            variant={!filterType ? 'filled' : 'outlined'}
          />
          {['new_item', 'sale', 'price_update', 'review', 'trending'].map((type) => (
            <Chip
              key={type}
              label={type.replace('_', ' ')}
              size="small"
              onClick={() => setFilterType(type)}
              color={filterType === type ? 'primary' : 'default'}
              variant={filterType === type ? 'filled' : 'outlined'}
              sx={{ textTransform: 'capitalize' }}
            />
          ))}
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <List ref={listRef} sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TransitionGroup>
          {filteredUpdates.map((update, index) => (
            <Collapse key={update.id} timeout={600}>
              <ListItem
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: `${getUpdateColor(update.type)}.main`,
                  },
                  transition: 'all 0.2s',
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: `${getUpdateColor(update.type)}.light`,
                      color: `${getUpdateColor(update.type)}.main`,
                    }}
                  >
                    {getUpdateIcon(update.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {update.message}
                      </Typography>
                      {update.discount_percentage && (
                        <Chip
                          label={`-${update.discount_percentage}%`}
                          size="small"
                          color="error"
                          variant="filled"
                        />
                      )}
                      {update.price && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {update.old_price && (
                            <Typography
                              variant="caption"
                              sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                            >
                              ${update.old_price}
                            </Typography>
                          )}
                          <Chip
                            label={`$${update.price}`}
                            size="small"
                            color={getUpdateColor(update.type)}
                            variant="outlined"
                          />
                        </Box>
                      )}
                      {update.rating && (
                        <Chip
                          icon={<ReviewIcon sx={{ fontSize: 16 }} />}
                          label={update.rating}
                          size="small"
                          color="warning"
                          variant="filled"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                      </Typography>
                      {update.category && (
                        <>
                          <Typography variant="caption" color="text.secondary">•</Typography>
                          <Chip
                            label={update.category}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20 }}
                          />
                        </>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            </Collapse>
          ))}
        </TransitionGroup>
        
        {filteredUpdates.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {filterType 
                ? `No ${filterType.replace('_', ' ')} updates`
                : 'No recent activity'
              }
            </Typography>
          </Box>
        )}
      </List>
      
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} src="/notification.mp3" />
    </Paper>
  );
};