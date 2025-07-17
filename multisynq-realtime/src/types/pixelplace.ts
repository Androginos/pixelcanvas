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
  pixelCount: number; // Number of pixels placed in current session
  cooldownStartTime?: number; // When cooldown started
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
  maxPixelsPerCooldown: number; // Maximum pixels before cooldown
  cooldownDurationMs: number; // Cooldown duration in milliseconds
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
  maxPixelsPerUser: 1000,
  maxPixelsPerCooldown: 100, // 100 pixels before cooldown
  cooldownDurationMs: 15000 // 15 seconds cooldown
};

// Color Palette (10 Essential Colors)
export const COLOR_PALETTE = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080'  // Purple
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

// Spam protection utility functions
export const isUserOnSpamCooldown = (userId: string, cooldowns: Map<string, UserCooldown>, config: CanvasConfig): boolean => {
  const cooldown = cooldowns.get(userId);
  if (!cooldown || !cooldown.cooldownStartTime) return false;
  
  const timeSinceCooldownStart = Date.now() - cooldown.cooldownStartTime;
  return timeSinceCooldownStart < config.cooldownDurationMs;
};

export const getRemainingSpamCooldown = (userId: string, cooldowns: Map<string, UserCooldown>, config: CanvasConfig): number => {
  const cooldown = cooldowns.get(userId);
  if (!cooldown || !cooldown.cooldownStartTime) return 0;
  
  const timeSinceCooldownStart = Date.now() - cooldown.cooldownStartTime;
  const remaining = config.cooldownDurationMs - timeSinceCooldownStart;
  return Math.max(0, remaining);
};

export const shouldStartSpamCooldown = (userId: string, cooldowns: Map<string, UserCooldown>, config: CanvasConfig): boolean => {
  const cooldown = cooldowns.get(userId);
  if (!cooldown) return false;
  
  return cooldown.pixelCount >= config.maxPixelsPerCooldown;
};

export const incrementPixelCount = (userId: string, cooldowns: Map<string, UserCooldown>): Map<string, UserCooldown> => {
  const newCooldowns = new Map(cooldowns);
  const existing = newCooldowns.get(userId);
  
  if (existing) {
    newCooldowns.set(userId, {
      ...existing,
      pixelCount: existing.pixelCount + 1,
      lastPixelTime: Date.now()
    });
  } else {
    newCooldowns.set(userId, {
      userId,
      lastPixelTime: Date.now(),
      cooldownDuration: 0,
      pixelCount: 1
    });
  }
  
  return newCooldowns;
};

export const startSpamCooldown = (userId: string, cooldowns: Map<string, UserCooldown>): Map<string, UserCooldown> => {
  const newCooldowns = new Map(cooldowns);
  const existing = newCooldowns.get(userId);
  
  if (existing) {
    newCooldowns.set(userId, {
      ...existing,
      cooldownStartTime: Date.now()
    });
  }
  
  return newCooldowns;
};

export const resetPixelCount = (userId: string, cooldowns: Map<string, UserCooldown>): Map<string, UserCooldown> => {
  const newCooldowns = new Map(cooldowns);
  const existing = newCooldowns.get(userId);
  
  if (existing) {
    newCooldowns.set(userId, {
      ...existing,
      pixelCount: 0,
      cooldownStartTime: undefined
    });
  }
  
  return newCooldowns;
}; 