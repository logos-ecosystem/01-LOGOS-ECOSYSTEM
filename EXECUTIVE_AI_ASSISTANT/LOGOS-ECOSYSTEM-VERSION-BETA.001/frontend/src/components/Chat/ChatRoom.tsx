import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useWebSocketSubscription } from '../../hooks/useWebSocketSubscription';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  metadata?: any;
}

interface TypingUser {
  user_id: string;
  user_name: string;
}

interface ChatRoomProps {
  roomId: string;
  roomName?: string;
  participants?: Array<{
    id: string;
    name: string;
    avatar?: string;
    online?: boolean;
  }>;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, roomName, participants = [] }) => {
  const { user } = useAuth();
  const { sendMessage, joinRoom, leaveRoom, typingIndicator, connected } = useWebSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Join room on mount
  useEffect(() => {
    if (connected && roomId) {
      joinRoom(roomId);
      
      // Load room history
      sendMessage('get_room_history', { room_id: roomId, limit: 50 });
      
      return () => {
        leaveRoom(roomId);
      };
    }
  }, [roomId, connected, joinRoom, leaveRoom, sendMessage]);

  // Subscribe to chat messages
  useWebSocketSubscription('chat_message', (data: Message) => {
    if (data.room_id === roomId) {
      setMessages(prev => [...prev, data]);
      scrollToBottom();
    }
  }, [roomId]);

  // Subscribe to room history
  useWebSocketSubscription('room_history', (data: { room_id: string; messages: Message[] }) => {
    if (data.room_id === roomId) {
      setMessages(data.messages);
      scrollToBottom();
    }
  }, [roomId]);

  // Subscribe to typing indicators
  useWebSocketSubscription('user_typing', (data: { room_id: string; user: TypingUser; is_typing: boolean }) => {
    if (data.room_id === roomId && data.user.user_id !== user?.id) {
      setTypingUsers(prev => {
        if (data.is_typing) {
          // Add user if not already typing
          if (!prev.find(u => u.user_id === data.user.user_id)) {
            return [...prev, data.user];
          }
          return prev;
        } else {
          // Remove user from typing list
          return prev.filter(u => u.user_id !== data.user.user_id);
        }
      });
    }
  }, [roomId, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      typingIndicator(roomId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      typingIndicator(roomId, false);
    }, 2000);
  }, [isTyping, roomId, typingIndicator]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !connected) return;

    const message = {
      room_id: roomId,
      content: inputValue.trim(),
      type: 'text' as const,
    };

    sendMessage('send_message', message);
    setInputValue('');
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    typingIndicator(roomId, false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.user_id === user?.id;
    
    return (
      <ListItem
        key={message.id}
        sx={{
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          gap: 1,
          alignItems: 'flex-start',
          px: 2,
          py: 1,
        }}
      >
        <Avatar
          src={message.user_avatar}
          alt={message.user_name}
          sx={{ width: 32, height: 32 }}
        >
          {message.user_name[0]}
        </Avatar>
        
        <Box
          sx={{
            maxWidth: '70%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          }}
        >
          {!isOwnMessage && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
              {message.user_name}
            </Typography>
          )}
          
          <Paper
            elevation={1}
            sx={{
              px: 2,
              py: 1,
              bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
              color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
              borderRadius: 2,
              borderTopRightRadius: isOwnMessage ? 0 : 16,
              borderTopLeftRadius: isOwnMessage ? 16 : 0,
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          </Paper>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </Typography>
        </Box>
      </ListItem>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">{roomName || `Room ${roomId}`}</Typography>
            {participants.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {participants.filter(p => p.online).length} online
              </Typography>
            )}
          </Box>
          
          {!connected && (
            <Chip
              label="Disconnected"
              color="error"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'grey.100' }}>
          <Typography variant="caption" color="text.secondary">
            {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Typography>
        </Box>
      )}

      <Divider />

      {/* Input */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <IconButton size="small" disabled={!connected}>
            <AttachFileIcon />
          </IconButton>
          
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            disabled={!connected}
            size="small"
          />
          
          <IconButton size="small" disabled={!connected}>
            <EmojiIcon />
          </IconButton>
          
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !connected}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};