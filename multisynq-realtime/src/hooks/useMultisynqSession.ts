'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMultisynqClient, EVENTS } from '@/lib/multisynq-client';
import { PixelUpdate } from '@/types/pixelplace';

interface UseMultisynqSessionProps {
  sessionId: string;
  userId: string;
  walletAddress: string;
}

interface UseMultisynqSessionReturn {
  isConnected: boolean;
  publishPixelUpdate: (pixelUpdate: PixelUpdate) => Promise<void>;
  subscribeToPixelUpdates: (callback: (pixelUpdate: PixelUpdate) => void) => void;
  unsubscribeFromPixelUpdates: (callback: (pixelUpdate: PixelUpdate) => void) => void;
  subscribeToViewEvents: (callback: (eventType: string, data: unknown) => void) => void;
  sendPixelUpdateToModel: (pixelUpdate: PixelUpdate) => Promise<void>;
  getSessionInfo: () => { sessionId: string; isConnected: boolean };
  sessionInfo: { sessionId: string; isConnected: boolean };
  reconnect: () => Promise<void>;
}

export function useMultisynqSession({
  sessionId,
  userId,
  walletAddress
}: UseMultisynqSessionProps): UseMultisynqSessionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState({ sessionId: '', isConnected: false });
  const [client] = useState(() => getMultisynqClient());
  
  // Reconnection state
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds

  // Connect to session
  const connectToSession = useCallback(async () => {
    try {
      console.log('🔍 Connecting to session with params:', { sessionId, userId, walletAddress });
      
      // Multisynq handles session ID automatically via App.autoSession()
      await client.connect();
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      
      // Update session info
      const info = client.getSessionInfo();
      console.log('🔍 Client session info:', info);
      
      setSessionInfo({
        sessionId: info.sessionId,
        isConnected: info.isConnected
      });
      
      console.log('✅ Connected to Multisynq session');
    } catch (error) {
      console.error('❌ Failed to connect to session:', error);
      setIsConnected(false);
      setSessionInfo({ sessionId: '', isConnected: false });
      
      // Attempt to reconnect if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectToSession();
        }, reconnectDelay * reconnectAttemptsRef.current); // Exponential backoff
      } else {
        console.error('❌ Max reconnection attempts reached');
      }
    }
  }, [client, sessionId, userId, walletAddress]);

  // Manual reconnect function
  const reconnect = useCallback(async () => {
    console.log('🔄 Manual reconnect requested');
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;
    
    // Disconnect first
    try {
      await client.disconnect();
    } catch (error) {
      console.warn('Warning during disconnect:', error);
    }
    
    // Then reconnect
    await connectToSession();
  }, [client, connectToSession]);

  // Disconnect from session
  const disconnectFromSession = useCallback(async () => {
    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    try {
      await client.disconnect();
      setIsConnected(false);
      console.log('🔌 Disconnected from Multisynq session');
    } catch (error) {
      console.error('❌ Failed to disconnect from session:', error);
    }
  }, [client]);

  // Publish pixel update with retry mechanism
  const publishPixelUpdate = useCallback(async (pixelUpdate: PixelUpdate) => {
    if (!isConnected) {
      console.warn('Not connected to session, cannot publish pixel update');
      return;
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await client.publishPixelUpdate(pixelUpdate);
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error(`Failed to publish pixel update (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }
    
    console.error('Failed to publish pixel update after all retries');
  }, [client, isConnected]);

  // Subscribe to pixel updates
  const subscribeToPixelUpdates = useCallback((callback: (pixelUpdate: PixelUpdate) => void) => {
    client.subscribe(EVENTS.PIXEL_UPDATE, (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        callback(data as PixelUpdate);
      }
    });
  }, [client]);

  // Unsubscribe from pixel updates
  const unsubscribeFromPixelUpdates = useCallback((callback: (pixelUpdate: PixelUpdate) => void) => {
    client.unsubscribe(EVENTS.PIXEL_UPDATE, (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        callback(data as PixelUpdate);
      }
    });
  }, [client]);

  // Subscribe to Multisynq view events
  const subscribeToViewEvents = useCallback((callback: (eventType: string, data: unknown) => void) => {
    client.subscribeToViewEvents(callback);
  }, [client]);

  // Send pixel update to Multisynq model with retry
  const sendPixelUpdateToModel = useCallback(async (pixelUpdate: PixelUpdate) => {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await client.sendPixelUpdateToModel(pixelUpdate);
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error(`Failed to send pixel update to model (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }
    }
    
    console.error('Failed to send pixel update to model after all retries');
  }, [client]);

  // Get session info
  const getSessionInfo = useCallback(() => ({
    sessionId: client.getSessionId(),
    isConnected: client.getConnectionStatus()
  }), [client]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const currentStatus = client.getConnectionStatus();
      if (isConnected && !currentStatus) {
        console.warn('🔄 Connection lost, attempting to reconnect...');
        setIsConnected(false);
        reconnect();
      } else if (!isConnected && currentStatus) {
        console.log('✅ Connection restored');
        setIsConnected(true);
      }
    };

    // Check connection every 5 seconds
    const interval = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [isConnected, client, reconnect]);

  // Connect on mount
  useEffect(() => {
    connectToSession();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnectFromSession();
    };
  }, [connectToSession, disconnectFromSession]);

  return {
    isConnected,
    publishPixelUpdate,
    subscribeToPixelUpdates,
    unsubscribeFromPixelUpdates,
    subscribeToViewEvents,
    sendPixelUpdateToModel,
    getSessionInfo,
    sessionInfo,
    reconnect
  };
} 