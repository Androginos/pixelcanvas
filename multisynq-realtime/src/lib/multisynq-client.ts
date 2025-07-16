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
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  constructor() {
    console.log('🎯 MockModel initialized');
    console.log('🎯 MockModel: Setting up event subscriptions...');
    
    // Subscribe to pixel update events from views using model scope
    this.subscribe('model', 'pixel-update', this.handlePixelUpdate.bind(this));
    console.log('🎯 MockModel: Subscribed to model:pixel-update');
    
    this.subscribe('model', 'canvas-clear', this.handleCanvasClear.bind(this));
    console.log('🎯 MockModel: Subscribed to model:canvas-clear');
    
    console.log('🎯 MockModel: All subscriptions set up successfully');
  }

  // Handle pixel update from any view
  handlePixelUpdate(data: unknown) {
    const pixelUpdate = data as PixelUpdate;
    console.log('🎯 MockModel: Received pixel update event:', pixelUpdate);
    console.log('🎯 MockModel: Current pixels count:', Object.keys(this.pixels).length);
    
    const key = `${pixelUpdate.x}_${pixelUpdate.y}`;
    
    if (pixelUpdate.color === 'transparent') {
      // Remove pixel
      delete this.pixels[key];
      console.log('🎯 MockModel: Removed pixel at', key);
    } else {
      // Add/update pixel
      this.pixels[key] = {
        color: pixelUpdate.color,
        owner: pixelUpdate.owner,
        timestamp: pixelUpdate.timestamp
      };
      console.log('🎯 MockModel: Added/updated pixel at', key, 'with color', pixelUpdate.color);
    }
    
    this.lastUpdated = Date.now();
    this.totalPixels = Object.keys(this.pixels).length;
    
    // Publish the update to all views using session scope
    console.log('🎯 MockModel: Publishing pixel-updated to session scope');
    console.log('🎯 MockModel: Publishing event with data:', pixelUpdate);
    this.publish('session', 'pixel-updated', pixelUpdate);
    console.log('🎯 MockModel: pixel-updated event published successfully');
    
    console.log('🎯 MockModel: Publishing canvas-state-changed to session scope');
    this.publish('session', 'canvas-state-changed', this.getState());
    console.log('🎯 MockModel: canvas-state-changed event published successfully');
  }

  // Handle canvas clear from any view
  handleCanvasClear(data: unknown) {
    const clearData = data as { timestamp: number };
    this.pixels = {};
    this.lastUpdated = Date.now();
    this.totalPixels = 0;
    
    this.publish('session', 'canvas-cleared', { timestamp: Date.now() });
    this.publish('session', 'canvas-state-changed', this.getState());
  }

  updatePixel(pixelUpdate: PixelUpdate) {
    // Legacy method for backward compatibility
    this.handlePixelUpdate(pixelUpdate);
  }

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

  constructor() {
    console.log('🎨 MockView initialized');
    console.log('🎨 MockView: Setting up event subscriptions...');
    
    // Simulate the same subscriptions as real CanvasView
    this.subscribe('session', 'pixel-updated', this.handlePixelUpdated.bind(this));
    console.log('🎨 MockView: Subscribed to session:pixel-updated');
    
    this.subscribe('session', 'canvas-cleared', this.handleCanvasCleared.bind(this));
    console.log('🎨 MockView: Subscribed to session:canvas-cleared');
    
    this.subscribe('session', 'canvas-state-changed', this.handleCanvasStateChanged.bind(this));
    console.log('🎨 MockView: Subscribed to session:canvas-state-changed');
    
    console.log('🎨 MockView: All subscriptions set up successfully');
  }

  // Mock event handlers
  handlePixelUpdated(data: unknown) {
    const pixelUpdate = data as any;
    console.log('🎨 MockView: Received pixel-updated event from model:', pixelUpdate);
    console.log('🎨 MockView: Publishing to UI components...');
    this.publish('ui', 'ui-pixel-update', pixelUpdate);
    console.log('🎨 MockView: UI event published successfully');
  }

  handleCanvasCleared(data: unknown) {
    console.log('🎨 MockView: Received canvas-cleared event from model:', data);
    this.publish('ui', 'ui-canvas-clear', data);
  }

  handleCanvasStateChanged(data: unknown) {
    console.log('🎨 MockView: Received canvas-state-changed event from model:', data);
    this.publish('ui', 'ui-canvas-state-changed', data);
  }

  // Send pixel update to model (mock implementation)
  sendPixelUpdate(pixelUpdate: any) {
    console.log('🎨 MockView: Sending pixel update to model:', pixelUpdate);
    console.log('🎨 MockView: Using model scope for publish...');
    this.publish('model', 'pixel-update', pixelUpdate);
    console.log('🎨 MockView: Pixel update published to model successfully');
  }

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
        
        console.log('🔧 Calling Session.join with params:', sessionParams);
        this.session = await Session.join(sessionParams);
        console.log('🔧 Session.join completed, session object:', this.session);
        
        this.model = this.session?.model || null;
        this.view = this.session?.view || null;
        
        console.log('🔍 Session object:', this.session);
        console.log('🔍 Model object:', this.model);
        console.log('🔍 View object:', this.view);
        console.log('🔍 View object type:', typeof this.view);
        console.log('🔍 View object constructor:', this.view?.constructor?.name);
        
        if (this.view) {
          console.log('🔍 View object has init method:', typeof this.view.init);
          console.log('🔍 View object has subscribe method:', typeof this.view.subscribe);
          console.log('🔍 View object has publish method:', typeof this.view.publish);
        }
        
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

  // Subscribe to Multisynq view events
  async subscribeToViewEvents(callback: (eventType: string, data: unknown) => void): Promise<void> {
    if (!this.view) return;

    // Listen to UI events from view
    this.view.subscribe('ui', 'ui-pixel-update', (data: unknown) => {
      console.log('🔧 CLIENT: Received ui-pixel-update from view:', data);
      callback('pixel-update', data);
    });

    this.view.subscribe('ui', 'ui-canvas-clear', (data: unknown) => {
      console.log('🔧 CLIENT: Received ui-canvas-clear from view:', data);
      callback('canvas-clear', data);
    });

    this.view.subscribe('ui', 'ui-canvas-state-changed', (data: unknown) => {
      console.log('🔧 CLIENT: Received ui-canvas-state-changed from view:', data);
      callback('canvas-state-changed', data);
    });
  }

  // Send pixel update to Multisynq model
  async sendPixelUpdateToModel(pixelUpdate: PixelUpdate): Promise<void> {
    if (!this.view) return;

    // Send to model via view
    this.view.sendPixelUpdate(pixelUpdate);
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

  // Get detailed session info
  getSessionInfo() {
    // Get real session ID from Multisynq session object
    const realSessionId = this.session?.name || this.sessionId;
    const realSessionName = this.session?.sessionName || this.sessionId;
    
    console.log('🔍 Real session details:', {
      sessionObject: this.session,
      sessionName: realSessionName,
      sessionId: realSessionId,
      isConnected: this.isConnected
    });
    
    return {
      sessionId: realSessionId,
      sessionName: realSessionName,
      isConnected: this.isConnected,
      modelState: this.model?.getState() || null,
      viewState: this.view?.getState() || null
    };
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