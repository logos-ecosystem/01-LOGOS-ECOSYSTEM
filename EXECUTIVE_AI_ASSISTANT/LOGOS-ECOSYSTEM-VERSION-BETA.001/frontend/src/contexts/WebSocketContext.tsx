import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketContextType {
  connected: boolean;
  sendMessage: (type: string, data: any) => void;
  subscribe: (type: string, handler: (data: any) => void) => () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  typingIndicator: (roomId: string, isTyping: boolean) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) return;

    try {
      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle system messages
          if (message.type === 'error') {
            console.error('WebSocket error:', message.data);
            return;
          }

          // Notify all handlers for this message type
          const typeHandlers = handlers.current.get(message.type);
          if (typeHandlers) {
            typeHandlers.forEach(handler => handler(message.data));
          }

          // Also notify wildcard handlers
          const wildcardHandlers = handlers.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => handler(message));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        ws.current = null;

        // Attempt to reconnect if authenticated
        if (isAuthenticated && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current - 1);
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [isAuthenticated, token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    ws.current.send(JSON.stringify(message));
  }, []);

  const subscribe = useCallback((type: string, handler: (data: any) => void) => {
    if (!handlers.current.has(type)) {
      handlers.current.set(type, new Set());
    }
    
    handlers.current.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const typeHandlers = handlers.current.get(type);
      if (typeHandlers) {
        typeHandlers.delete(handler);
        if (typeHandlers.size === 0) {
          handlers.current.delete(type);
        }
      }
    };
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    sendMessage('join_room', { room_id: roomId });
  }, [sendMessage]);

  const leaveRoom = useCallback((roomId: string) => {
    sendMessage('leave_room', { room_id: roomId });
  }, [sendMessage]);

  const typingIndicator = useCallback((roomId: string, isTyping: boolean) => {
    sendMessage('typing_indicator', { room_id: roomId, is_typing: isTyping });
  }, [sendMessage]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: WebSocketContextType = {
    connected,
    sendMessage,
    subscribe,
    joinRoom,
    leaveRoom,
    typingIndicator
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};