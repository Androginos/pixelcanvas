// Multisynq Client for Real-time Collaboration
// Supports both real Multisynq API and mock implementation for development

import { PixelPlaceEvent, PixelUpdate, CanvasState, UserCooldown } from '@/types/pixelplace';

// Types
export interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface DrawingStroke {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  userId: string;
  timestamp: number;
}

export interface MultisynqEvent {
  type: string;
  data: any;
  userId: string;
  timestamp: number;
}

// Mock implementation for development
class MockMultisynqClient {
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private cursors: Map<string, CursorPosition> = new Map();
  private strokes: DrawingStroke[] = [];
  private pixelUpdates: PixelUpdate[] = [];

  constructor() {
    console.log('🔧 Using Mock Multisynq Client for development');
  }

  async connect(sessionId: string): Promise<void> {
    console.log(`🔗 Mock connected to session: ${sessionId}`);
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Mock disconnected');
    return Promise.resolve();
  }

  async publish(event: MultisynqEvent | PixelPlaceEvent): Promise<void> {
    console.log('📡 Mock publishing event:', event);
    
    // Simulate network delay
    setTimeout(() => {
      this.broadcastToListeners(event.type, event.data);
    }, 50);
    
    return Promise.resolve();
  }

  async subscribe(eventType: string, callback: (data: any) => void): Promise<void> {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
    // console.log(`📡 Mock subscribed to: ${eventType}`);
    return Promise.resolve();
  }

  async unsubscribe(eventType: string, callback: (data: any) => void): Promise<void> {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return Promise.resolve();
  }

  broadcastToListeners(eventType: string, data: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in mock listener:', error);
        }
      });
    }
  }

  // Cursor management
  updateCursor(userId: string, position: Omit<CursorPosition, 'userId' | 'timestamp'>): void {
    this.cursors.set(userId, {
      ...position,
      userId,
      timestamp: Date.now()
    });
  }

  getCursors(): CursorPosition[] {
    return Array.from(this.cursors.values());
  }

  removeCursor(userId: string): void {
    this.cursors.delete(userId);
  }

  // Drawing management
  addStroke(stroke: DrawingStroke): void {
    this.strokes.push(stroke);
  }

  getStrokes(): DrawingStroke[] {
    return this.strokes;
  }

  // Pixel management
  addPixelUpdate(pixelUpdate: PixelUpdate): void {
    this.pixelUpdates.push(pixelUpdate);
  }

  getPixelUpdates(): PixelUpdate[] {
    return this.pixelUpdates;
  }
}

// Global mock client instance
let mockClient: MockMultisynqClient | null = null;

// Utility functions
export function generateUserId(): string {
  return `user_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateSessionId(): string {
  return `session_${Math.random().toString(36).substr(2, 9)}`;
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

// Cursor synchronization
export const syncCursor = throttle((sessionId: string, userId: string, userName: string, x: number, y: number) => {
  if (!mockClient) return;
  
  mockClient.updateCursor(userId, { x, y, userName });
  
  publishEvent(sessionId, {
    type: 'cursor-update',
    data: { x, y, userName },
    userId,
    timestamp: Date.now()
  });
}, 50);

// Drawing synchronization
export const syncDrawing = throttle((sessionId: string, userId: string, stroke: Omit<DrawingStroke, 'userId' | 'timestamp'>) => {
  if (!mockClient) return;
  
  const fullStroke: DrawingStroke = {
    ...stroke,
    userId,
    timestamp: Date.now()
  };
  
  mockClient.addStroke(fullStroke);
  
  publishEvent(sessionId, {
    type: 'drawing-stroke',
    data: fullStroke,
    userId,
    timestamp: Date.now()
  });
}, 16); // ~60fps

// Pixel update synchronization
export const syncPixelUpdate = (sessionId: string, userId: string, pixelUpdate: Omit<PixelUpdate, 'timestamp'>) => {
  if (!mockClient) return;
  
  const fullPixelUpdate: PixelUpdate = {
    ...pixelUpdate,
    timestamp: Date.now()
  };
  
  mockClient.addPixelUpdate(fullPixelUpdate);
  
  publishEvent(sessionId, {
    type: 'pixel-update',
    data: fullPixelUpdate,
    userId,
    timestamp: Date.now()
  });
};

// Event publishing
export async function publishEvent(sessionId: string, event: MultisynqEvent | PixelPlaceEvent): Promise<void> {
  // Use mock implementation for browser compatibility
  if (!mockClient) {
    mockClient = new MockMultisynqClient();
  }
  
  await mockClient.publish(event);
}

// Event subscription
export async function subscribeToEvent(
  sessionId: string, 
  eventType: string, 
  callback: (data: any) => void
): Promise<void> {
  // Use mock implementation for browser compatibility
  if (!mockClient) {
    mockClient = new MockMultisynqClient();
  }
  
  await mockClient.subscribe(eventType, callback);
}

// Mock-specific functions for development
export function addMockListener(eventType: string, callback: (data: any) => void): void {
  if (!mockClient) {
    mockClient = new MockMultisynqClient();
  }
  mockClient.subscribe(eventType, callback);
}

export function removeMockListener(eventType: string, callback: (data: any) => void): void {
  if (mockClient) {
    mockClient.unsubscribe(eventType, callback);
  }
}

export function mockBroadcast(eventType: string, data: any): void {
  if (mockClient) {
    mockClient.broadcastToListeners(eventType, data);
  }
}

export function getMockCursors(): CursorPosition[] {
  return mockClient ? mockClient.getCursors() : [];
}

export function getMockStrokes(): DrawingStroke[] {
  return mockClient ? mockClient.getStrokes() : [];
}

export function getMockPixelUpdates(): PixelUpdate[] {
  return mockClient ? mockClient.getPixelUpdates() : [];
}

// Session management
export async function joinSession(sessionId: string): Promise<void> {
  if (!mockClient) {
    mockClient = new MockMultisynqClient();
  }
  await mockClient.connect(sessionId);
}

export async function leaveSession(): Promise<void> {
  if (mockClient) {
    await mockClient.disconnect();
  }
}

// Initialize mock client on module load
if (typeof window !== 'undefined') {
  mockClient = new MockMultisynqClient();
} 