import React, { useRef, useEffect } from 'react';
import { CursorData, WalletState } from '../multisynq/types';
import { generateUserId, generateUserColor } from '../multisynq/client';

/**
 * GERÇEKTEKİ MULTISYNQ REACT HOOK API KULLANIMI
 * 
 * Bu component gerçek Multisynq React Hook API'sinin nasıl kullanılacağını gösterir.
 * Şu anda multisynq-react paketi yüklü olmadığı için mock implementation kullanıyoruz.
 */

// Gerçek importlar (multisynq-react paketinden):
// import { useMultiplayerState, useCollaborators, useMultiplayerEvents } from 'multisynq-react';

interface MultisynqHookExampleProps {
  wallet: WalletState;
  sessionId?: string;
}

const MultisynqHookExample: React.FC<MultisynqHookExampleProps> = ({ 
  wallet, 
  sessionId = 'monad-canvas-session' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ============================================
  // GERÇEKTEKİ MULTISYNQ REACT HOOK KULLANIMI:
  // ============================================

  /*
  // 1. useMultiplayerState Hook'u - Cursor senkronizasyonu
  const [myCursor, setMyCursor, otherCursors] = useMultiplayerState<CursorData>({
    key: 'cursor',
    defaultValue: {
      id: generateUserId(),
      x: 0,
      y: 0,
      color: generateUserColor(),
      username: wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Anonymous',
      timestamp: Date.now()
    },
    // Senkronizasyon ayarları
    syncMode: 'realtime', // 'realtime' | 'onchange' | 'manual'
    debounceMs: 16, // 60 FPS için throttling
  });

  // 2. useMultiplayerState Hook'u - Drawing data senkronizasyonu
  const [drawings, setDrawings, othersDrawings] = useMultiplayerState({
    key: 'drawings',
    defaultValue: [],
    merge: (local, remote) => {
      // Custom merge logic for drawing data
      const allDrawings = [...local, ...remote];
      return allDrawings.sort((a, b) => a.timestamp - b.timestamp);
    }
  });

  // 3. useCollaborators Hook'u - Aktif kullanıcı listesi
  const collaborators = useCollaborators();
  // Returns: Array<{ id: string, presence: any, cursor?: CursorData }>

  // 4. useMultiplayerEvents Hook'u - Custom events
  const { sendEvent, events } = useMultiplayerEvents();

  // Event listener
  useEffect(() => {
    const unsubscribe = events.subscribe('user-action', (data) => {
      console.log('User action received:', data);
    });
    return unsubscribe;
  }, [events]);

  // 5. Mouse movement handler
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Cursor position'ını güncelle - otomatik senkronize edilir
    setMyCursor(prev => ({
      ...prev,
      x,
      y,
      timestamp: Date.now()
    }));
  };

  // 6. Canvas click handler - drawing
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newDrawing = {
      id: `drawing_${Date.now()}`,
      type: 'circle',
      x,
      y,
      width: 20,
      height: 20,
      color: myCursor.color,
      userId: myCursor.id,
      timestamp: Date.now()
    };

    // Drawing'i ekle - tüm kullanıcılara senkronize edilir
    setDrawings(prev => [...prev, newDrawing]);

    // Custom event gönder
    sendEvent('user-action', {
      type: 'drawing-added',
      userId: myCursor.id,
      drawing: newDrawing
    });
  };

  // 7. Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all drawings from all users
    const allDrawings = [...drawings, ...Object.values(othersDrawings).flat()];
    allDrawings.forEach(drawing => {
      ctx.fillStyle = drawing.color;
      ctx.beginPath();
      ctx.arc(drawing.x, drawing.y, drawing.width / 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw all cursors
    const allCursors = [myCursor, ...Object.values(otherCursors)];
    allCursors.forEach(cursor => {
      if (cursor.x > 0 && cursor.y > 0) {
        // Draw cursor
        ctx.fillStyle = cursor.color;
        ctx.beginPath();
        ctx.moveTo(cursor.x, cursor.y);
        ctx.lineTo(cursor.x + 12, cursor.y + 12);
        ctx.lineTo(cursor.x + 8, cursor.y + 16);
        ctx.lineTo(cursor.x + 4, cursor.y + 12);
        ctx.closePath();
        ctx.fill();

        // Draw username
        if (cursor.username) {
          ctx.fillStyle = cursor.color;
          ctx.font = '12px Arial';
          ctx.fillText(cursor.username, cursor.x + 15, cursor.y - 5);
        }
      }
    });
  }, [myCursor, otherCursors, drawings, othersDrawings]);
  */

  // ============================================
  // MOCK IMPLEMENTATION (geçici):
  // ============================================

  const mockCursor = {
    id: generateUserId(),
    x: 0,
    y: 0,
    color: generateUserColor(),
    username: wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Anonymous',
    timestamp: Date.now()
  };

  return (
    <div className="relative w-full h-full">
      {/* Hook API Bilgi Paneli */}
      <div className="absolute top-4 left-4 z-20 bg-blue-900/90 backdrop-blur rounded-lg p-4 border border-blue-600 max-w-md">
        <h3 className="text-blue-200 font-bold mb-2">🚀 Multisynq React Hook API</h3>
        <div className="text-blue-100 text-sm space-y-2">
          <div>📍 <code>useMultiplayerState</code> - State senkronizasyonu</div>
          <div>👥 <code>useCollaborators</code> - Aktif kullanıcılar</div>
          <div>⚡ <code>useMultiplayerEvents</code> - Custom events</div>
          <div>🎯 <code>useMultiplayerValue</code> - Tek değer sync</div>
        </div>
      </div>

      {/* Gerçek Hook API Özellikleri */}
      <div className="absolute top-4 right-4 z-20 bg-green-900/90 backdrop-blur rounded-lg p-4 border border-green-600">
        <h4 className="text-green-200 font-bold mb-2">✨ Hook API Avantajları</h4>
        <ul className="text-green-100 text-sm space-y-1">
          <li>• Otomatik state senkronizasyonu</li>
          <li>• Built-in conflict resolution</li>
          <li>• Real-time collaboration</li>
          <li>• TypeScript tip güvenliği</li>
          <li>• Custom merge logic</li>
          <li>• Event-based communication</li>
        </ul>
      </div>

      {/* Mock Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-slate-600 bg-slate-900 cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Hook API Kullanım Örneği */}
      <div className="absolute bottom-4 left-4 z-20 bg-purple-900/90 backdrop-blur rounded-lg p-4 border border-purple-600 max-w-lg">
        <h4 className="text-purple-200 font-bold mb-2">📝 Hook API Kullanımı</h4>
        <pre className="text-purple-100 text-xs bg-purple-950/50 p-2 rounded overflow-x-auto">
{`const [cursor, setCursor, others] = useMultiplayerState({
  key: 'cursor',
  defaultValue: { x: 0, y: 0, color: '#red' }
});

const collaborators = useCollaborators();
const { sendEvent } = useMultiplayerEvents();`}
        </pre>
      </div>

      {/* Implementation Status */}
      <div className="absolute bottom-4 right-4 z-20 bg-amber-900/90 backdrop-blur rounded-lg p-4 border border-amber-600">
        <h4 className="text-amber-200 font-bold mb-2">⚠️ Implementation Status</h4>
        <div className="text-amber-100 text-sm space-y-1">
          <div>🔄 multisynq-react paketi bekleniyor</div>
          <div>📦 Şu anda mock implementation</div>
          <div>🚀 API key ile gerçek senkronizasyon</div>
        </div>
      </div>
    </div>
  );
};

export default MultisynqHookExample; 