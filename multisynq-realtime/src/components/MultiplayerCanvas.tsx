'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PixelUpdate } from '@/types/pixelplace';
import { getMultisynqClient } from '@/lib/multisynq-client';

interface MultiplayerCanvasProps {
  sessionId: string;
  userId: string;
  userName: string;
}

export default function MultiplayerCanvas({ 
  sessionId, 
  userId, 
  userName 
}: MultiplayerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixels, setPixels] = useState<Record<string, { color: string; owner: string; timestamp: number }>>({});
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [currentTool, setCurrentTool] = useState<'draw' | 'erase'>('draw');
  const [scale, setScale] = useState(10);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [lastPixelUpdate, setLastPixelUpdate] = useState(0);
  const [hoverPixel, setHoverPixel] = useState<[number, number] | null>(null);
  
  const clientRef = useRef(getMultisynqClient());
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });

  // Canvas boyutları
  const canvasWidth = 1280;
  const canvasHeight = 720;
  const pixelSize = 1;

  // Connect to Multisynq session
  useEffect(() => {
    const connectToSession = async () => {
      try {
        await clientRef.current.connect(sessionId);
        setIsConnected(true);
        
        // Subscribe to pixel updates
        await clientRef.current.subscribe('pixel-update', (data: unknown) => {
          const pixelUpdate = data as PixelUpdate;
          setPixels(prev => {
            const key = `${pixelUpdate.x}_${pixelUpdate.y}`;
            if (pixelUpdate.color === 'transparent') {
              const newPixels = { ...prev };
              delete newPixels[key];
              return newPixels;
            } else {
              return {
                ...prev,
                [key]: {
                  color: pixelUpdate.color,
                  owner: pixelUpdate.owner,
                  timestamp: pixelUpdate.timestamp
                }
              };
            }
          });
        });

        // Subscribe to canvas clear events
        await clientRef.current.subscribe('canvas-clear', () => {
          setPixels({});
        });

        console.log('✅ Connected to Multisynq session:', sessionId);
      } catch (error) {
        console.error('❌ Failed to connect to session:', error);
        setIsConnected(false);
      }
    };

    connectToSession();

    return () => {
      clientRef.current.disconnect();
    };
  }, [sessionId]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate pixel coordinates
    const pixelX = Math.floor((mouseX - offset.x) / (pixelSize * scale));
    const pixelY = Math.floor((mouseY - offset.y) / (pixelSize * scale));

    // Update hover pixel
    if (pixelX >= 0 && pixelX < canvasWidth && pixelY >= 0 && pixelY < canvasHeight) {
      setHoverPixel([pixelX, pixelY]);
    } else {
      setHoverPixel(null);
    }

    // Handle panning
    if (isPanningRef.current) {
      const deltaX = mouseX - lastPanPointRef.current.x;
      const deltaY = mouseY - lastPanPointRef.current.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      lastPanPointRef.current = { x: mouseX, y: mouseY };
    }
  }, [offset, scale]);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate pixel coordinates
    const pixelX = Math.floor((mouseX - offset.x) / (pixelSize * scale));
    const pixelY = Math.floor((mouseY - offset.y) / (pixelSize * scale));

    // Check if pixel is within bounds
    if (pixelX < 0 || pixelX >= canvasWidth || pixelY < 0 || pixelY >= canvasHeight) {
      return;
    }

    // Handle right click for panning
    if (e.button === 2) {
      isPanningRef.current = true;
      lastPanPointRef.current = { x: mouseX, y: mouseY };
      return;
    }

    // Handle left click for drawing/erasing
    if (e.button === 0) {
      const now = Date.now();
      const cooldown = 300; // 0.3 seconds

      if (now - lastPixelUpdate < cooldown) {
        return; // Cooldown active
      }

      const pixelUpdate: PixelUpdate = {
        x: pixelX,
        y: pixelY,
        color: currentTool === 'erase' ? 'transparent' : selectedColor,
        owner: userId,
        timestamp: now
      };

      // Send pixel update to Multisynq
      clientRef.current.publishPixelUpdate(pixelUpdate);
      setLastPixelUpdate(now);
    }
  }, [offset, scale, currentTool, selectedColor, userId, lastPixelUpdate]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Context menu prevention
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 50));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 1));
  }, []);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transform
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw background grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1 / scale;
    
    for (let x = 0; x <= canvasWidth; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvasHeight; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Draw pixels
    Object.entries(pixels).forEach(([key, pixel]) => {
      const [x, y] = key.split('_').map(Number);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, pixelSize, pixelSize);
    });

    // Draw hover preview
    if (hoverPixel && !isPanningRef.current) {
      const [x, y] = hoverPixel;
      ctx.strokeStyle = currentTool === 'erase' ? '#ff0000' : selectedColor;
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(x, y, pixelSize, pixelSize);
    }

    ctx.restore();
  }, [pixels, hoverPixel, offset, scale, selectedColor, currentTool]);

  // Render canvas when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Color palette
  const colors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FFA500', '#800080', '#008000', '#FFC0CB', '#A52A2A', '#808080'
  ];

  return (
    <div className="relative w-full h-full bg-black">
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute top-0 left-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />

      {/* Connection status */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
        <div className="text-sm font-medium text-gray-700">
          Session: {sessionId.substring(0, 8)}...
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <div className="text-xs text-gray-500">
          Position: {hoverPixel ? `${hoverPixel[0]}, ${hoverPixel[1]}` : 'N/A'}
        </div>
      </div>

      {/* Tools and colors */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm flex items-center space-x-3">
        {/* Tool buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentTool('draw')}
            className={`w-8 h-8 rounded ${currentTool === 'draw' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            title="Draw"
          >
            ✏️
          </button>
          <button
            onClick={() => setCurrentTool('erase')}
            className={`w-8 h-8 rounded ${currentTool === 'erase' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
            title="Erase"
          >
            🧽
          </button>
        </div>

        {/* Color palette */}
        <div className="flex space-x-1">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded border-2 ${selectedColor === color ? 'border-black' : 'border-gray-300'}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm flex space-x-2">
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
          title="Zoom Out"
        >
          ➖
        </button>
        <span className="px-2 py-1 text-sm font-medium text-gray-700">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
          title="Zoom In"
        >
          ➕
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
        <div className="text-xs text-gray-600">
          Left click: Draw/Erase<br/>
          Right click + drag: Pan<br/>
          Mouse wheel: Zoom
        </div>
      </div>
    </div>
  );
} 