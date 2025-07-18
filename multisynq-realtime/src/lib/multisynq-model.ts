// Multisynq Model for Pixel Canvas
import { Model } from '@multisynq/client';
import { PixelUpdate } from '@/types/pixelplace';

export interface CanvasMultisynqState {
  pixels: Record<string, {
    color: string;
    owner: string;
    timestamp: number;
  }>;
  lastUpdated: number;
  totalPixels: number;
}

export class CanvasModel extends Model {
  // Instance properties
  pixels: Record<string, { color: string; owner: string; timestamp: number }> = {};
  lastUpdated: number = 0; // Will be set in init()
  totalPixels: number = 0;

  init() {
    console.log('🎨 CanvasModel initialized');
    
    // Initialize timestamp using synchronized time
    this.lastUpdated = this.now();
    
    // Subscribe to pixel update events from views using model scope
    this.subscribe('model', 'pixel-update', this.handlePixelUpdate);
    this.subscribe('model', 'canvas-clear', this.handleCanvasClear);
  }

  // Handle pixel update from any view - OPTIMIZED FOR FAST SYNC
  handlePixelUpdate(pixelUpdate: any) {
    console.log('🎯 MODEL: Received pixel update event:', pixelUpdate);
    
    const key = `${pixelUpdate.x}_${pixelUpdate.y}`;
    
    if (pixelUpdate.color === 'transparent') {
      // Remove pixel
      delete this.pixels[key];
    } else {
      // Add/update pixel
      this.pixels[key] = {
        color: pixelUpdate.color,
        owner: pixelUpdate.owner,
        timestamp: pixelUpdate.timestamp
      };
    }
    
    this.lastUpdated = this.now();
    this.totalPixels = Object.keys(this.pixels).length;
    
    // FAST SYNC: Publish to ALL devices instantly
    this.publish('view', 'pixel-updated', pixelUpdate);
    this.publish('view', 'canvas-state-changed', this.getState());
  }

  // Handle canvas clear from any view
  handleCanvasClear(data: { timestamp: number }) {
    this.pixels = {};
    this.lastUpdated = this.now();
    this.totalPixels = 0;
    
    this.publish('view', 'canvas-cleared', { timestamp: this.now() });
    this.publish('view', 'canvas-state-changed', this.getState());
  }

  // Get current state
  getState(): CanvasMultisynqState {
    return {
      pixels: this.pixels,
      lastUpdated: this.lastUpdated,
      totalPixels: this.totalPixels
    };
  }

  // Clear all pixels (can be called from model)
  clearCanvas() {
    this.handleCanvasClear({ timestamp: this.now() });
  }

  // Generate deterministic random ID using this.random()
  generatePixelId(): string {
    return `pixel_${Math.floor(this.random() * 1000000)}`;
  }

  // Get random color from palette using this.random()
  getRandomColor(): string {
    const colors = [
      '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
      '#FFA500', '#800080', '#008000', '#FFC0CB', '#A52A2A', '#808080'
    ];
    return colors[Math.floor(this.random() * colors.length)];
  }
}

// REQUIRED: Register the model class
CanvasModel.register("CanvasModel");

export function createInitialState(): CanvasMultisynqState {
  return {
    pixels: {},
    lastUpdated: 0, // Will be set by model
    totalPixels: 0
  };
} 