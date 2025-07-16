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
  // Explicit class name to prevent minification issues
  static className = 'CanvasModel';
  
  // Instance properties
  pixels: Record<string, { color: string; owner: string; timestamp: number }> = {};
  lastUpdated: number = Date.now();
  totalPixels: number = 0;

  constructor() {
    super();
    // Ensure class name is preserved
    (this.constructor as any).className = 'CanvasModel';
  }

  init() {
    console.log('🎨 CanvasModel initialized with className:', (this.constructor as any).className);
    
    // Subscribe to pixel update events from views - GitHub example style
    this.subscribe('canvas', 'pixel-update', this.handlePixelUpdate.bind(this));
    this.subscribe('canvas', 'canvas-clear', this.handleCanvasClear.bind(this));
  }

  // Handle pixel update from any view
  handlePixelUpdate(pixelUpdate: PixelUpdate) {
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
    
    this.lastUpdated = this.now(); // Use synchronized time
    this.totalPixels = Object.keys(this.pixels).length;
    
    // Publish the update to all views
    this.publish('canvas', 'pixel-updated', pixelUpdate);
    this.publish('canvas', 'canvas-state-changed', this.getState());
  }

  // Handle canvas clear from any view
  handleCanvasClear(data: { timestamp: number }) {
    this.pixels = {};
    this.lastUpdated = this.now();
    this.totalPixels = 0;
    
    this.publish('canvas', 'canvas-cleared', { timestamp: this.now() });
    this.publish('canvas', 'canvas-state-changed', this.getState());
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

// Register the model class globally
if (typeof window !== 'undefined') {
  (window as any).CanvasModel = CanvasModel;
}

export function createInitialState(): CanvasMultisynqState {
  return {
    pixels: {},
    lastUpdated: 0, // Will be set by model
    totalPixels: 0
  };
} 