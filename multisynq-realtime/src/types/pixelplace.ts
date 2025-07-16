// PixelPlace.io Style Canvas Types

export interface PixelData {
  color: string;
  owner: string;
  timestamp: number;
  blockNumber?: number; // For on-chain storage
}

export interface PixelState {
  [key: string]: PixelData; // key format: "x_y" (e.g., "23_54")
}

export interface CanvasState {
  pixels: PixelState;
  lastUpdated: number;
  totalPixels: number;
  canvasSize: {
    width: number;
    height: number;
  };
}

export interface PixelUpdate {
  x: number;
  y: number;
  color: string;
  owner: string;
  timestamp: number;
}

export interface UserCooldown {
  userId: string;
  lastPixelTime: number;
  cooldownDuration: number; // milliseconds
}

export interface CanvasConfig {
  width: number;
  height: number;
  pixelSize: number; // CSS pixels per canvas pixel
  maxZoom: number;
  minZoom: number;
  defaultZoom: number;
  cooldownMs: number;
  maxPixelsPerUser: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface PixelPlaceEvent {
  type: 'pixel-update' | 'canvas-reset' | 'user-join' | 'user-leave' | 'cooldown-update';
  data: PixelUpdate | CanvasState | UserCooldown;
  userId: string;
  timestamp: number;
}

// Default Canvas Configuration
export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  width: 1280,
  height: 720,
  pixelSize: 1, // 1 CSS pixel = 1 canvas pixel
  maxZoom: 10,
  minZoom: 0.1,
  defaultZoom: 1,
  cooldownMs: 1000, // 1 second
  maxPixelsPerUser: 1000
};

// Color Palette (Popular colors)
export const COLOR_PALETTE = [
  '#FFFFFF', '#E4E4E4', '#C8C8C8', '#ADADAD', '#919191', '#757575', '#595959', '#3D3D3D', '#212121', '#000000',
  '#FF0000', '#FF4500', '#FF8C00', '#FFA500', '#FFD700', '#FFFF00', '#ADFF2F', '#7FFF00', '#32CD32', '#00FF00',
  '#00FA9A', '#00FFFF', '#00BFFF', '#0080FF', '#0000FF', '#4B0082', '#8A2BE2', '#9370DB', '#DDA0DD', '#FF69B4',
  '#FF1493', '#DC143C', '#B22222', '#8B0000', '#800000', '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F5DEB3'
];

// Utility Functions
export const pixelKey = (x: number, y: number): string => `${x}_${y}`;

export const parsePixelKey = (key: string): { x: number; y: number } => {
  const [x, y] = key.split('_').map(Number);
  return { x, y };
};

export const isValidPixel = (x: number, y: number, config: CanvasConfig): boolean => {
  return x >= 0 && x < config.width && y >= 0 && y < config.height;
};

export const isUserOnCooldown = (userId: string, cooldowns: Map<string, UserCooldown>, config: CanvasConfig): boolean => {
  const cooldown = cooldowns.get(userId);
  if (!cooldown) return false;
  
  const timeSinceLastPixel = Date.now() - cooldown.lastPixelTime;
  return timeSinceLastPixel < config.cooldownMs;
};

export const getRemainingCooldown = (userId: string, cooldowns: Map<string, UserCooldown>, config: CanvasConfig): number => {
  const cooldown = cooldowns.get(userId);
  if (!cooldown) return 0;
  
  const timeSinceLastPixel = Date.now() - cooldown.lastPixelTime;
  const remaining = config.cooldownMs - timeSinceLastPixel;
  return Math.max(0, remaining);
}; 