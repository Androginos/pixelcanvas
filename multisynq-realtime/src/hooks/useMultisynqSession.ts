'use client';

import { useState, useEffect, useCallback } from 'react';
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
  getSessionInfo: () => { sessionId: string; isConnected: boolean };
  sessionInfo: { sessionId: string; isConnected: boolean };
}

export function useMultisynqSession({
  sessionId,
  userId,
  walletAddress
}: UseMultisynqSessionProps): UseMultisynqSessionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState({ sessionId: '', isConnected: false });
  const [client] = useState(() => getMultisynqClient());

  // Connect to session
  const connectToSession = useCallback(async () => {
    try {
      // Multisynq handles session ID automatically via App.autoSession()
      await client.connect();
      setIsConnected(true);
      
      // Update session info
      const info = client.getSessionInfo();
      setSessionInfo({
        sessionId: info.sessionId,
        isConnected: info.isConnected
      });
      
      console.log('✅ Connected to Multisynq session');
    } catch (error) {
      console.error('❌ Failed to connect to session:', error);
      setIsConnected(false);
      setSessionInfo({ sessionId: '', isConnected: false });
    }
  }, [client]);

  // Disconnect from session
  const disconnectFromSession = useCallback(async () => {
    try {
      await client.disconnect();
      setIsConnected(false);
      console.log('🔌 Disconnected from Multisynq session');
    } catch (error) {
      console.error('❌ Failed to disconnect from session:', error);
    }
  }, [client]);

  // Publish pixel update
  const publishPixelUpdate = useCallback(async (pixelUpdate: PixelUpdate) => {
    if (!isConnected) {
      console.warn('Not connected to session, cannot publish pixel update');
      return;
    }

    try {
      await client.publishPixelUpdate(pixelUpdate);
    } catch (error) {
      console.error('Failed to publish pixel update:', error);
    }
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

  // Get session info
  const getSessionInfo = useCallback(() => ({
    sessionId: client.getSessionId(),
    isConnected: client.getConnectionStatus()
  }), [client]);

  // Connect on mount
  useEffect(() => {
    connectToSession();

    // Cleanup on unmount
    return () => {
      disconnectFromSession();
    };
  }, [connectToSession, disconnectFromSession]);

  return {
    isConnected,
    publishPixelUpdate,
    subscribeToPixelUpdates,
    unsubscribeFromPixelUpdates,
    getSessionInfo,
    sessionInfo
  };
} 