// @ts-ignore - Multisynq types will be resolved later
const Multisynq = require('multisynq-client');
import { CursorData, SessionState } from './types';

// Multisynq React Hook imports (gerçek API)
// import { createMultisynqProvider, useMultiplayerState } from 'multisynq-react';

// Multisynq configuration
export const MULTISYNQ_CONFIG = {
  appName: 'MonadCanvas',
  sessionName: 'shared-canvas',
  modelClass: 'CanvasModel',
  viewClass: 'CanvasView',
  // API anahtarını environment variable'dan alacağız
  apiKey: (import.meta as any).env?.VITE_MULTISYNQ_API_KEY || 'demo-key',
  synchronizerUrl: 'wss://sync.multisynq.io', // Multisynq synchronizer URL
};

// Create Multisynq Provider (gerçek API)
export const MultisynqProvider = null; // Placeholder - gerçek implementation için
// export const MultisynqProvider = createMultisynqProvider(MULTISYNQ_CONFIG);

// Mock Multisynq session (geçici)
export const createMultisynqSession = (sessionId?: string) => {
  console.log('Creating mock Multisynq session:', sessionId);
  return {
    connect: async () => console.log('Mock session connected'),
    disconnect: () => console.log('Mock session disconnected'),
    updateCursor: (data: CursorData) => console.log('Mock cursor update:', data),
  };
};

// Generate random user color
export const generateUserColor = (): string => {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange  
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Generate unique user ID
export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create cursor data
export const createCursorData = (
  id: string,
  x: number,
  y: number,
  color: string,
  username?: string
): CursorData => ({
  id,
  x,
  y,
  color,
  username,
  timestamp: Date.now(),
});

// Throttle function for cursor updates
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

/**
 * GERÇEK MULTISYNQ REACT HOOK API KULLANIMI:
 * 
 * 1. Provider ile app'i sarmalayın
 * 2. useMultiplayerState Hook'u ile state senkronizasyonu
 * 3. useMultiplayerValue Hook'u tek değer için
 * 4. useCollaborators Hook'u kullanıcı listesi için
 * 5. useMultiplayerEvents Hook'u özel event'ler için
 * 
 * Detaylı örnekler için README.md dosyasına bakın.
 */ 