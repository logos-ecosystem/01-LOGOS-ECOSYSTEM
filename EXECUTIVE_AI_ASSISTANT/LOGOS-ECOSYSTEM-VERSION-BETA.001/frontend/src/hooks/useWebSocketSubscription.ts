import { useEffect, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

/**
 * Custom hook for subscribing to WebSocket messages
 * Automatically handles subscription/unsubscription on mount/unmount
 */
export function useWebSocketSubscription(
  messageType: string,
  handler: (data: any) => void,
  deps: React.DependencyList = []
) {
  const { subscribe } = useWebSocket();
  const handlerRef = useRef(handler);

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Subscribe with a stable handler that calls the current handler ref
    const unsubscribe = subscribe(messageType, (data) => {
      handlerRef.current(data);
    });

    return unsubscribe;
  }, [messageType, subscribe, ...deps]);
}