// Cursor position and user data types
export interface CursorData {
  id: string;
  x: number;
  y: number;
  color: string;
  username?: string;
  timestamp: number;
}

// Canvas drawing data for future use
export interface DrawingData {
  id: string;
  type: 'line' | 'circle' | 'rect';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  userId: string;
  timestamp: number;
}

// Multisynq session state
export interface SessionState {
  cursors: Record<string, CursorData>;
  drawings: DrawingData[];
  connectedUsers: string[];
}

// User session info
export interface UserSession {
  id: string;
  address?: string;
  username: string;
  joinedAt: number;
}

// Wallet connection state
export interface WalletState {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  isConnecting: boolean;
  error?: string;
} 