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
    console.log('🎨 CanvasView initialized');
    console.log('🎨 CanvasView: Setting up event subscriptions...');
    
    // Listen for model events using session scope
    this.subscribe('session', 'pixel-updated', this.handlePixelUpdated);
    console.log('🎨 CanvasView: Subscribed to session:pixel-updated');
    
    this.subscribe('session', 'canvas-cleared', this.handleCanvasCleared);
    console.log('🎨 CanvasView: Subscribed to session:canvas-cleared');
    
    this.subscribe('session', 'canvas-state-changed', this.handleCanvasStateChanged);
    console.log('🎨 CanvasView: Subscribed to session:canvas-state-changed');
    
    console.log('🎨 CanvasView: All subscriptions set up successfully');
  }

  // Handle pixel updates from model
  handlePixelUpdated(pixelUpdate: PixelUpdate) {
    console.log('🎨 VIEW: Received pixel-updated event from model:', pixelUpdate);
    console.log('🎨 VIEW: Publishing to UI components...');
    // Publish to UI components
    this.publish('ui', 'ui-pixel-update', pixelUpdate);
    console.log('🎨 VIEW: UI event published successfully');
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

  // Send pixel update to model
  sendPixelUpdate(pixelUpdate: PixelUpdate) {
    console.log('🎨 VIEW: Sending pixel update to model:', pixelUpdate);
    console.log('🎨 VIEW: Using model scope for publish...');
    // Send to model using model scope
    this.publish('model', 'pixel-update', pixelUpdate);
    console.log('🎨 VIEW: Pixel update published to model successfully');
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