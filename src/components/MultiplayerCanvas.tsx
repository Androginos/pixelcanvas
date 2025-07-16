import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CursorData, WalletState } from '../multisynq/types';
import { 
  generateUserId, 
  generateUserColor, 
  createCursorData, 
  throttle 
} from '../multisynq/client';

interface MultiplayerCanvasProps {
  wallet: WalletState;
  sessionId?: string;
}

interface OtherCursor {
  id: string;
  x: number;
  y: number;
  color: string;
  username?: string;
}

const MultiplayerCanvas: React.FC<MultiplayerCanvasProps> = ({ wallet, sessionId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [userId] = useState(() => generateUserId());
  const [userColor] = useState(() => generateUserColor());
  const [otherCursors, setOtherCursors] = useState<Record<string, OtherCursor>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Bağlanıyor...');

  // Mock Multisynq state management - gerçek implementasyon için update edilecek
  const [multisynqSession, setMultisynqSession] = useState<any>(null);

  // Initialize Multisynq session
  useEffect(() => {
    if (!wallet.isConnected) return;

    const initSession = async () => {
      try {
        setConnectionStatus('Multisynq oturumuna bağlanıyor...');
        
        // TODO: Real Multisynq initialization
        // const session = createMultisynqSession(sessionId);
        // await session.connect();
        // setMultisynqSession(session);
        
        // Mock connection for now
        setTimeout(() => {
          setIsConnected(true);
          setConnectionStatus('Bağlandı - Canvas\'ta cursor\'ınızı hareket ettirin!');
          console.log('Mock Multisynq session started');
        }, 1000);

      } catch (error) {
        console.error('Multisynq connection failed:', error);
        setConnectionStatus('Bağlantı hatası');
      }
    };

    initSession();

    return () => {
      // Cleanup session
      if (multisynqSession) {
        // multisynqSession.disconnect();
      }
    };
  }, [wallet.isConnected, sessionId]);

  // Handle mouse movement with throttling
  const handleMouseMove = useCallback(
    throttle((event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isConnected || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const cursorData = createCursorData(
        userId,
        x,
        y,
        userColor,
        wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : undefined
      );

      // TODO: Send to Multisynq
      // multisynqSession?.updateCursor(cursorData);
      
      console.log('Cursor update:', { x, y, userId, color: userColor });
    }, 16), // ~60 FPS
    [isConnected, userId, userColor, wallet.address]
  );

  // Render cursors on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 50;
    
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw other users' cursors
    Object.values(otherCursors).forEach(cursor => {
      // Draw cursor pointer
      ctx.fillStyle = cursor.color;
      ctx.beginPath();
      ctx.moveTo(cursor.x, cursor.y);
      ctx.lineTo(cursor.x + 12, cursor.y + 12);
      ctx.lineTo(cursor.x + 8, cursor.y + 16);
      ctx.lineTo(cursor.x + 4, cursor.y + 12);
      ctx.closePath();
      ctx.fill();

      // Draw username label
      if (cursor.username) {
        ctx.fillStyle = cursor.color;
        ctx.fillRect(cursor.x + 15, cursor.y - 25, ctx.measureText(cursor.username).width + 8, 20);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(cursor.username, cursor.x + 19, cursor.y - 10);
      }
    });
  }, [otherCursors]);

  // Resize canvas to full screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Mock incoming cursor data (for testing)
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      // Simulate other users moving cursors
      const mockCursor: OtherCursor = {
        id: 'mock_user_1',
        x: Math.random() * (window.innerWidth - 100),
        y: Math.random() * (window.innerHeight - 100),
        color: '#22c55e',
        username: 'Demo User'
      };

      setOtherCursors(prev => ({
        ...prev,
        [mockCursor.id]: mockCursor
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected]);

  if (!wallet.isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center p-8 bg-slate-800 rounded-lg border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            🔗 Cüzdan Bağlantısı Gerekli
          </h2>
          <p className="text-slate-300 mb-4">
            Canvas'a erişmek için Monad testnet cüzdanınızı bağlayın
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden">
      {/* Status bar */}
      <div className="absolute top-4 left-4 z-10 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-white text-sm font-medium">{connectionStatus}</span>
        </div>
      </div>

      {/* User info */}
      <div className="absolute top-4 right-4 z-10 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: userColor }}
          />
          <span className="text-white text-sm">
            {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Kullanıcı'}
          </span>
        </div>
      </div>

      {/* Connected users count */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
        <span className="text-white text-sm">
          👥 Aktif Kullanıcılar: {Object.keys(otherCursors).length + 1}
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        className="absolute inset-0 cursor-crosshair"
        style={{ background: 'transparent' }}
      />

      {/* Instructions */}
      {isConnected && (
        <div className="absolute bottom-4 right-4 z-10 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 max-w-sm">
          <p className="text-slate-300 text-sm">
            💡 Canvas üzerinde cursor'ınızı hareket ettirin. Diğer kullanıcıların cursor'larını gerçek zamanlı olarak görebilirsiniz!
          </p>
        </div>
      )}
    </div>
  );
};

export default MultiplayerCanvas; 