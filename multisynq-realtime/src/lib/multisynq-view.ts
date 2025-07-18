// Multisynq View for Pixel Canvas
import { View } from '@multisynq/client';
import { PixelUpdate } from '@/types/pixelplace';

export interface CanvasViewState {
  selectedColor: string;
  hoverPixel: [number, number] | null;
  scale: number;
  offset: { x: number; y: number };
  isConnected: boolean;
  currentTool: 'draw' | 'erase';
}

export class CanvasView extends View {
  // Instance properties
  selectedColor: string = '#FF0000';
  hoverPixel: [number, number] | null = null;
  scale: number = 10;
  offset: { x: number; y: number } = { x: 0, y: 0 };
  isConnected: boolean = false;
  currentTool: 'draw' | 'erase' = 'draw';

  init() {
    try {
      console.log('🎨 CanvasView initialized');
      console.log('🎨 CanvasView: this.viewId =', this.viewId);
      console.log('🎨 CanvasView: Setting up event subscriptions...');
      
      // Listen for model events using view scope
      this.subscribe('view', 'pixel-updated', this.handlePixelUpdated.bind(this));
      console.log('🎨 CanvasView: Subscribed to view:pixel-updated');
      
      this.subscribe('view', 'canvas-cleared', this.handleCanvasCleared.bind(this));
      console.log('🎨 CanvasView: Subscribed to view:canvas-cleared');
      
      this.subscribe('view', 'canvas-state-changed', this.handleCanvasStateChanged.bind(this));
      console.log('🎨 CanvasView: Subscribed to view:canvas-state-changed');
      
      console.log('🎨 CanvasView: All subscriptions set up successfully');
      console.log('🎨 CanvasView: init() method completed');
    } catch (error) {
      console.error('🎨 CanvasView: Error in init() method:', error);
    }
  }

  // Handle pixel updates from model - FAST SYNC
  handlePixelUpdated(pixelUpdate: any) {
    // Check if this event came from this view (prevent self-reception)
    if (pixelUpdate.sourceViewId === this.viewId) {
      return; // Skip own updates silently
    }
    
    // FAST SYNC: Immediately publish to UI components
    const { sourceViewId, ...cleanPixelUpdate } = pixelUpdate;
    this.publish('ui', 'ui-pixel-update', cleanPixelUpdate);
  }

  // Handle canvas clear from model
  handleCanvasCleared(data: { timestamp: number }) {
    // Publish to UI components
    this.publish('ui', 'ui-canvas-clear', data);
  }

  // Handle canvas state changes from model
  handleCanvasStateChanged(state: Record<string, unknown>) {
    // Publish to UI components
    this.publish('ui', 'ui-canvas-state-changed', state);
  }

  // Send pixel update to model - FAST SYNC
  sendPixelUpdate(pixelUpdate: PixelUpdate) {
    // FAST SYNC: Send to model immediately
    const eventData = {
      ...pixelUpdate,
      sourceViewId: this.viewId
    };
    this.publish('model', 'pixel-update', eventData);
  }

  // Send canvas clear to model
  sendCanvasClear() {
    this.publish('model', 'canvas-clear', { timestamp: Date.now() });
  }

  // Update selected color
  setSelectedColor(color: string) {
    this.selectedColor = color;
    this.publish('ui', 'color-change', { color });
  }

  // Update hover pixel
  setHoverPixel(pixel: [number, number] | null) {
    this.hoverPixel = pixel;
    this.publish('ui', 'hover-pixel', { pixel });
  }

  // Update scale
  setScale(scale: number) {
    this.scale = scale;
    this.publish('ui', 'scale-change', { scale });
  }

  // Update offset
  setOffset(offset: { x: number; y: number }) {
    this.offset = offset;
    this.publish('ui', 'offset-change', { offset });
  }

  // Update tool
  setCurrentTool(tool: 'draw' | 'erase') {
    this.currentTool = tool;
    this.publish('ui', 'tool-change', { tool });
  }

  // Update connection status
  setConnectionStatus(connected: boolean) {
    this.isConnected = connected;
    this.publish('ui', 'connection-change', { connected });
  }

  // Get current state
  getState(): CanvasViewState {
    return {
      selectedColor: this.selectedColor,
      hoverPixel: this.hoverPixel,
      scale: this.scale,
      offset: this.offset,
      isConnected: this.isConnected,
      currentTool: this.currentTool
    };
  }

  // Reset view
  resetView() {
    this.scale = 10;
    this.offset = { x: 0, y: 0 };
    this.publish('ui', 'view-reset', { scale: this.scale, offset: this.offset });
  }

  // Schedule future UI update using this.future()
  scheduleUIUpdate(delayMs: number, callback: () => void) {
    const futureTime = this.future(delayMs);
    // Note: In real implementation, this would be handled by the framework
    // For now, we'll use setTimeout but in a deterministic way
    setTimeout(callback, delayMs);
  }

  // Get future timestamp for cooldown calculations
  getFutureTimestamp(delayMs: number): number {
    return Date.now() + delayMs; // Fallback to current time + delay
  }
}

export function createInitialViewState(): CanvasViewState {
  return {
    selectedColor: '#FF0000',
    hoverPixel: null,
    scale: 10,
    offset: { x: 0, y: 0 },
    isConnected: false,
    currentTool: 'draw'
  };
}