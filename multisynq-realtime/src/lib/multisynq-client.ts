'use client';

// Multisynq Client Configuration
import { PixelUpdate } from '@/types/pixelplace';

// Import model and view classes at the top level
import { CanvasModel } from './multisynq-model';
import { CanvasView } from './multisynq-view';

// Multisynq configuration
export const MULTISYNQ_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_MULTISYNQ_API_KEY || '',
  appId: process.env.NEXT_PUBLIC_MULTISYNQ_PROJECT_ID || 'com.monadplace.pixelcanvas',
  useMock: !process.env.NEXT_PUBLIC_MULTISYNQ_API_KEY || process.env.NEXT_PUBLIC_MULTISYNQ_API_KEY === 'demo-key'
};

// Event types
export const EVENTS = {
  PIXEL_UPDATE: 'pixel-update',
  CANVAS_CLEAR: 'canvas-clear',
  CURSOR_UPDATE: 'cursor-update',
  USER_JOIN: 'user-join',
  USER_LEAVE: 'user-leave'
} as const;

// Multisynq handles URL management automatically via App.autoSession() and App.autoPassword()

// Mock Multisynq classes for development
class MockModel {
  pixels: Record<string, { color: string; owner: string; timestamp: number }> = {};
  lastUpdated: number = Date.now();
  totalPixels: number = 0;

  updatePixel(pixelUpdate: PixelUpdate) {
    const key = `${pixelUpdate.x}_${pixelUpdate.y}`;
    
    if (pixelUpdate.color === 'transparent') {
      delete this.pixels[key];
    } else {
      this.pixels[key] = {
        color: pixelUpdate.color,
        owner: pixelUpdate.owner,
        timestamp: pixelUpdate.timestamp
      };
    }
    
    this.lastUpdated = Date.now();
    this.totalPixels = Object.keys(this.pixels).length;
  }

  getState() {
    return {
      pixels: this.pixels,
      lastUpdated: this.lastUpdated,
      totalPixels: this.totalPixels
    };
  }
}

class MockView {
  selectedColor: string = '#FF0000';
  hoverPixel: [number, number] | null = null;
  scale: number = 10;
  offset: { x: number; y: number } = { x: 0, y: 0 };
  isConnected: boolean = false;
  currentTool: 'draw' | 'erase' = 'draw';
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  subscribe(scope: string, event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  publish(scope: string, event: string, data: unknown) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  getState() {
    return {
      selectedColor: this.selectedColor,
      hoverPixel: this.hoverPixel,
      scale: this.scale,
      offset: this.offset,
      isConnected: this.isConnected,
      currentTool: this.currentTool
    };
  }
}

// Multisynq session wrapper
export class MultisynqCanvasClient {
  // Session tipi hem gerçek hem mock Multisynq için esnek
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private session: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private view: any = null;
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();
  private isConnected: boolean = false;
  private sessionId: string = '';

  constructor() {
    console.log('🔧 MultisynqCanvasClient created');
  }

  // Initialize and connect to session
  async connect(sessionId?: string): Promise<void> {
    // Multisynq handles session ID automatically via App.autoSession()
    this.sessionId = sessionId || 'auto-session';
    
    try {
      if (!MULTISYNQ_CONFIG.useMock && typeof window !== 'undefined') {
        // SSR koruması - sadece client-side'da çalıştır
        const { Session, App } = await import('@multisynq/client');

        // Use Multisynq's auto session management
        const sessionParams = {
          apiKey: MULTISYNQ_CONFIG.apiKey,
          appId: MULTISYNQ_CONFIG.appId,
          // Use auto session management for URL-based sharing
          name: App.autoSession(),
          password: App.autoPassword(),
          // Both model and view classes are needed
          model: CanvasModel,
          view: CanvasView
        };

        console.log('🔧 Attempting to connect with params:', {
          apiKey: MULTISYNQ_CONFIG.apiKey.substring(0, 10) + '...',
          appId: MULTISYNQ_CONFIG.appId,
          name: sessionParams.name,
          password: sessionParams.password,
          modelClass: CanvasModel.name,
          viewClass: CanvasView.name
        });
        
        this.session = await Session.join(sessionParams);
        this.model = this.session?.model || null;
        this.view = this.session?.view || null;
        
        // Set up view event listeners
        this.setupViewListeners();
        
        console.log('🔗 Connected to real Multisynq session:', sessionParams.name);
      } else {
        // Use mock classes
        this.model = new MockModel();
        this.view = new MockView();
        console.log('🔧 Using mock Multisynq client for session:', sessionId);
      }
      
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Multisynq session:', error);
      // Fallback to mock mode
      this.model = new MockModel();
      this.view = new MockView();
      this.isConnected = true;
      console.log('🔧 Fallback to mock mode');
    }
  }

  // Set up view event listeners
  private setupViewListeners() {
    if (!this.view) return;

    // Listen for UI events from view
    this.view.subscribe('ui', 'pixel-update', (data: unknown) => {
      this.broadcastToListeners(EVENTS.PIXEL_UPDATE, data);
    });

    this.view.subscribe('ui', 'canvas-clear', (data: unknown) => {
      this.broadcastToListeners(EVENTS.CANVAS_CLEAR, data);
    });
  }

  // Disconnect from session
  async disconnect(): Promise<void> {
    if (this.session && typeof this.session.leave === 'function') {
      await this.session.leave();
      this.session = null;
    }
    
    this.model = null;
    this.view = null;
    this.isConnected = false;
    console.log('🔌 Disconnected from Multisynq session');
  }

  // Publish pixel update
  async publishPixelUpdate(pixelUpdate: PixelUpdate): Promise<void> {
    if (!this.isConnected) return;

    try {
      if (this.model) {
        // Send to model for synchronization
        this.model.updatePixel(pixelUpdate);
        
        // Broadcast to local listeners (for mock mode)
        this.broadcastToListeners(EVENTS.PIXEL_UPDATE, pixelUpdate);
      }
    } catch (error) {
      console.error('Failed to publish pixel update:', error);
    }
  }

  // Subscribe to events
  async subscribe(eventType: string, callback: (data: unknown) => void): Promise<void> {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  // Unsubscribe from events
  async unsubscribe(eventType: string, callback: (data: unknown) => void): Promise<void> {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Broadcast to local listeners (mock mode)
  private broadcastToListeners(eventType: string, data: unknown): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in listener:', error);
        }
      });
    }
  }

  // Get current model state
  getModelState() {
    return this.model?.getState() || null;
  }

  // Get current view state
  getViewState() {
    return this.view?.getState() || null;
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }
}

// Global client instance
let globalClient: MultisynqCanvasClient | null = null;

// Get or create client instance
export function getMultisynqClient(): MultisynqCanvasClient {
  if (!globalClient) {
    globalClient = new MultisynqCanvasClient();
  }
  return globalClient;
}

// Initialize global client
export async function initializeMultisynq(): Promise<MultisynqCanvasClient> {
  const client = getMultisynqClient();
  return client;
} 