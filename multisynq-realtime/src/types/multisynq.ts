// Multisynq Real-time Canvas Types

export interface CursorData {
  x: number;
  y: number;
  userId: string;
  userName: string;
  color: string;
  timestamp: number;
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  strokeWidth: number;
  userId: string;
  timestamp: number;
}

export interface DrawingData {
  strokes: DrawingStroke[];
  lastUpdated: number;
}

export interface SessionState {
  activeCursors: Record<string, CursorData>;
  drawing: DrawingData;
  sessionId: string;
}

export interface WalletState {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  isConnecting: boolean;
  error?: string;
}

export interface MultisynqEvent {
  type: 'cursor-move' | 'drawing-start' | 'drawing-end' | 'stroke-add';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  userId: string;
  timestamp: number;
}

// Monad Testnet Configuration
export const MONAD_TESTNET = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet-explorer.monad.xyz',
    },
  },
  testnet: true,
} as const; 