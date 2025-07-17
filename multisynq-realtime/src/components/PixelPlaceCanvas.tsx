'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CanvasConfig, 
  CanvasState, 
  PixelUpdate, 
  UserCooldown, 
  DEFAULT_CANVAS_CONFIG,
  COLOR_PALETTE,
  pixelKey,
  isValidPixel,
  isUserOnCooldown,
  getRemainingCooldown
} from '@/types/pixelplace';
import { useMultisynqSession } from '@/hooks/useMultisynqSession';

interface PixelPlaceCanvasProps {
  sessionId: string;
  userId: string;
  walletAddress: string;
  config?: Partial<CanvasConfig>;
}

const CANVAS_SIZE = 1000;
const PIXEL_SIZE = 1;
const GRID_BACKGROUND = '#F0F0F0';

type Tool = 'draw' | 'erase';

export default function PixelPlaceCanvas({ 
  sessionId, 
  userId, 
  
  walletAddress,
  config = {} 
}: PixelPlaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  
  // Merge default config with props
  const canvasConfig: CanvasConfig = { ...DEFAULT_CANVAS_CONFIG, ...config };
  
  // State
  const [canvasState, setCanvasState] = useState<CanvasState>({
    pixels: {},
    lastUpdated: Date.now(),
    totalPixels: 0,
    canvasSize: { width: canvasConfig.width, height: canvasConfig.height }
  });
  
  const [selectedColor, setSelectedColor] = useState<string>('#FF0000');
  const [userCooldowns, setUserCooldowns] = useState<Map<string, UserCooldown>>(new Map());
  const [hoverPixel, setHoverPixel] = useState<[number, number] | null>(null);
  const [scale, setScale] = useState(10); // zoom seviyesi
  const [offset, setOffset] = useState(() => {
    // Initialize offset to center the canvas
    const canvasWidth = canvasConfig.width * 10;
    const canvasHeight = canvasConfig.height * 10;
    return {
      x: (window.innerWidth - canvasWidth) / 2,
      y: (window.innerHeight - canvasHeight) / 2
    };
  }); // pan
  const [dragging, setDragging] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('draw');
  const [hasMoved, setHasMoved] = useState(false);

  // Multisynq session hook
  const {
    isConnected: multisynqConnected,
    publishPixelUpdate,
    subscribeToPixelUpdates,
    unsubscribeFromPixelUpdates,
    subscribeToViewEvents,
    sendPixelUpdateToModel,
    sessionInfo
  } = useMultisynqSession({
    sessionId,
    userId,
    walletAddress
  });
  
  const dragStart = useRef<{ x: number, y: number } | null>(null);
  const lastMousePos = useRef<{ x: number, y: number } | null>(null);

  // Calculate center offset to keep canvas centered
  const getCenteredOffset = useCallback((currentScale: number) => {
    const canvasWidth = canvasConfig.width * currentScale;
    const canvasHeight = canvasConfig.height * currentScale;
    return {
      x: (window.innerWidth - canvasWidth) / 2,
      y: (window.innerHeight - canvasHeight) / 2
    };
  }, [canvasConfig.width, canvasConfig.height]);

  // Initialize canvas and Multisynq
  useEffect(() => {
    const initializeCanvas = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to full screen
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      setIsConnected(true);
    };

    initializeCanvas();
  }, [sessionId]);

  // Render function with requestAnimationFrame
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill background
    ctx.fillStyle = GRID_BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (optional, for development)
    if (scale > 4) {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      
      // Calculate grid start and end positions
      const startX = Math.floor(-offset.x / scale) * scale;
      const startY = Math.floor(-offset.y / scale) * scale;
      const endX = startX + canvas.width + scale;
      const endY = startY + canvas.height + scale;
      
      for (let x = startX; x <= endX; x += scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw all pixels
    Object.entries(canvasState.pixels).forEach(([key, pixelData]) => {
      const { x, y } = parsePixelKey(key);
      const screenX = x * scale + offset.x;
      const screenY = y * scale + offset.y;
      
      ctx.fillStyle = pixelData.color;
      ctx.fillRect(screenX, screenY, scale, scale);
    });

    // Draw canvas border (1280x720 area)
    const canvasBorderX = offset.x;
    const canvasBorderY = offset.y;
    const canvasBorderWidth = canvasConfig.width * scale;
    const canvasBorderHeight = canvasConfig.height * scale;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(canvasBorderX, canvasBorderY, canvasBorderWidth, canvasBorderHeight);

    // Draw hover pixel preview
    if (hoverPixel) {
      const [hx, hy] = hoverPixel;
      const screenX = hx * scale + offset.x;
      const screenY = hy * scale + offset.y;
      
      // Draw preview border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, scale, scale);
      
      // Draw semi-transparent preview
      ctx.fillStyle = selectedColor + '80'; // 50% opacity
      ctx.fillRect(screenX, screenY, scale, scale);
    }

    requestAnimationFrame(render);
  }, [canvasState.pixels, hoverPixel, scale, offset, selectedColor, canvasConfig.width, canvasConfig.height]);

  // Mini-map render function
  const renderMinimap = useCallback(() => {
    const minimap = minimapRef.current;
    if (!minimap) return;
    
    const ctx = minimap.getContext('2d');
    if (!ctx) return;

    // Set minimap size
    const minimapSize = 150;
    minimap.width = minimapSize;
    minimap.height = minimapSize;

    // Clear minimap
    ctx.clearRect(0, 0, minimapSize, minimapSize);
    
    // Fill background
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, minimapSize, minimapSize);

    // Calculate scale for minimap (fit 1280x720 canvas in 150x150 minimap)
    const minimapScale = minimapSize / Math.max(canvasConfig.width, canvasConfig.height);
    const canvasWidth = canvasConfig.width * minimapScale;
    const canvasHeight = canvasConfig.height * minimapScale;
    const canvasX = (minimapSize - canvasWidth) / 2;
    const canvasY = (minimapSize - canvasHeight) / 2;

    // Draw canvas border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);

    // Draw all pixels on minimap
    Object.entries(canvasState.pixels).forEach(([key, pixelData]) => {
      const { x, y } = parsePixelKey(key);
      const minimapX = canvasX + x * minimapScale;
      const minimapY = canvasY + y * minimapScale;
      
      ctx.fillStyle = pixelData.color;
      ctx.fillRect(minimapX, minimapY, Math.max(1, minimapScale), Math.max(1, minimapScale));
    });

    // Draw viewport rectangle
    const viewportWidth = (window.innerWidth / scale) * minimapScale;
    const viewportHeight = (window.innerHeight / scale) * minimapScale;
    const viewportX = canvasX + (-offset.x / scale) * minimapScale;
    const viewportY = canvasY + (-offset.y / scale) * minimapScale;

    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);

    // Draw center point
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(viewportX + viewportWidth / 2 - 2, viewportY + viewportHeight / 2 - 2, 4, 4);

  }, [canvasState.pixels, scale, offset, canvasConfig.width, canvasConfig.height]);

  // Handle minimap click
  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    const minimap = minimapRef.current;
    if (!minimap) return;

    const rect = minimap.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const minimapSize = 150;
    const minimapScale = minimapSize / Math.max(canvasConfig.width, canvasConfig.height);
    const canvasWidth = canvasConfig.width * minimapScale;
    const canvasHeight = canvasConfig.height * minimapScale;
    const canvasX = (minimapSize - canvasWidth) / 2;
    const canvasY = (minimapSize - canvasHeight) / 2;

    // Check if click is within canvas bounds
    if (clickX >= canvasX && clickX <= canvasX + canvasWidth &&
        clickY >= canvasY && clickY <= canvasY + canvasHeight) {
      
      // Convert minimap coordinates to canvas coordinates
      const canvasClickX = (clickX - canvasX) / minimapScale;
      const canvasClickY = (clickY - canvasY) / minimapScale;
      
      // Center viewport on clicked position while keeping canvas generally centered
      const canvasWidth = canvasConfig.width * scale;
      const canvasHeight = canvasConfig.height * scale;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const newOffsetX = centerX - (canvasClickX * scale + canvasWidth / 2);
      const newOffsetY = centerY - (canvasClickY * scale + canvasHeight / 2);
      
      // Apply the same pan limits as mouse movement
      const maxOffsetX = window.innerWidth * 0.8;
      const maxOffsetY = window.innerHeight * 0.8;
      const minOffsetX = window.innerWidth * 0.2 - canvasWidth;
      const minOffsetY = window.innerHeight * 0.2 - canvasHeight;
      
      setOffset({
        x: Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX)),
        y: Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY))
      });
    }
  }, [scale, canvasConfig.width, canvasConfig.height]);

  // Start render loop
  useEffect(() => {
    if (isConnected) {
      render();
      renderMinimap();
    }
  }, [isConnected, render, renderMinimap]);

  // Get pixel coordinates from mouse position
  const getPixelCoord = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - offset.x) / scale);
    const y = Math.floor((e.clientY - rect.top - offset.y) / scale);
    return [x, y] as [number, number];
  }, [offset, scale]);

  // Update single pixel
  const updatePixel = useCallback((x: number, y: number, color: string, owner: string) => {
    const key = pixelKey(x, y);
    
    setCanvasState(prev => {
      const newPixels = { ...prev.pixels };
      newPixels[key] = {
        color,
        owner,
        timestamp: Date.now()
      };
      
      return {
        ...prev,
        pixels: newPixels,
        lastUpdated: Date.now(),
        totalPixels: Object.keys(newPixels).length
      };
    });
  }, []);

  // Handle pixel click
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    if (!isConnected || !walletAddress) return;

    // Don't place pixel if we were dragging (panning)
    if (hasMoved) {
      setHasMoved(false);
      return;
    }

    // Check cooldown
    if (isUserOnCooldown(userId, userCooldowns, canvasConfig)) {
      console.log('User is on cooldown');
      return;
    }

    const [x, y] = getPixelCoord(e);

    // Validate pixel coordinates
    if (!isValidPixel(x, y, canvasConfig)) return;

    if (currentTool === 'draw') {
      // Update pixel locally
      updatePixel(x, y, selectedColor, walletAddress);

      // Update cooldown
      setUserCooldowns(prev => {
        const newCooldowns = new Map(prev);
        newCooldowns.set(userId, {
          userId,
          lastPixelTime: Date.now(),
          cooldownDuration: canvasConfig.cooldownMs
        });
        return newCooldowns;
      });

      // Broadcast to other users via Multisynq
      const pixelUpdate: PixelUpdate = {
        x,
        y,
        color: selectedColor,
        owner: walletAddress,
        timestamp: Date.now()
      };

      // Send via Multisynq model
      try {
        console.log('🎨 CANVAS: Sending pixel update to Multisynq model:', pixelUpdate);
        await sendPixelUpdateToModel(pixelUpdate);
        console.log('🎨 CANVAS: Successfully sent pixel update to model');
      } catch (error) {
        console.error('Failed to send pixel update to model:', error);
      }
    } else if (currentTool === 'erase') {
      // Remove pixel locally
      setCanvasState(prev => {
        const newPixels = { ...prev.pixels };
        const key = pixelKey(x, y);
        delete newPixels[key];
        
        return {
          ...prev,
          pixels: newPixels,
          lastUpdated: Date.now(),
          totalPixels: Object.keys(newPixels).length
        };
      });

      // Broadcast pixel removal via Multisynq
      const pixelUpdate: PixelUpdate = {
        x,
        y,
        color: 'transparent', // Special value to indicate removal
        owner: walletAddress,
        timestamp: Date.now()
      };

      try {
        await sendPixelUpdateToModel(pixelUpdate);
      } catch (error) {
        console.error('Failed to send pixel removal to model:', error);
      }
    }
  }, [isConnected, walletAddress, userId, userCooldowns, canvasConfig, selectedColor, currentTool, hasMoved, sessionId, updatePixel, getPixelCoord]);

  // Handle mouse events
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging && dragStart.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      // Check if we've moved enough to consider it a drag
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setHasMoved(true);
      }
      
      // Update offset in the direction of mouse movement (natural pan)
      setOffset(prev => {
        const newOffset = { x: prev.x + dx, y: prev.y + dy };
        
        // Keep canvas generally centered but allow some movement
        const canvasWidth = canvasConfig.width * scale;
        const canvasHeight = canvasConfig.height * scale;
        
        // Allow more movement but keep canvas mostly visible
        const maxOffsetX = window.innerWidth * 0.8;
        const maxOffsetY = window.innerHeight * 0.8;
        const minOffsetX = window.innerWidth * 0.2 - canvasWidth;
        const minOffsetY = window.innerHeight * 0.2 - canvasHeight;
        
        return {
          x: Math.max(minOffsetX, Math.min(maxOffsetX, newOffset.x)),
          y: Math.max(minOffsetY, Math.min(maxOffsetY, newOffset.y))
        };
      });
      dragStart.current = { x: e.clientX, y: e.clientY };
    } else {
      setHoverPixel(getPixelCoord(e));
    }
  }, [dragging, getPixelCoord, scale, canvasConfig.width, canvasConfig.height]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) return; // Middle click
    if (e.button === 2) { // Right click - erase
      setCurrentTool('erase');
      return;
    }
    setDragging(true);
    setHasMoved(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setDragging(false);
    dragStart.current = null;
    // Reset hasMoved after a short delay to allow for click detection
    setTimeout(() => setHasMoved(false), 100);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Reduce zoom sensitivity - smaller increments
    const zoomFactor = 0.2;
    const zoom = e.deltaY > 0 ? -zoomFactor : zoomFactor;
    
    // Allow zooming out enough to see the entire canvas
    const maxScale = Math.max(50, Math.min(window.innerWidth / canvasConfig.width, window.innerHeight / canvasConfig.height));
    const newScale = Math.max(0.1, Math.min(maxScale, scale + zoom));
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom center point
    const zoomCenterX = (mouseX - offset.x) / scale;
    const zoomCenterY = (mouseY - offset.y) / scale;
    
    // Calculate new offset to keep zoom center point under mouse
    const newOffsetX = mouseX - zoomCenterX * newScale;
    const newOffsetY = mouseY - zoomCenterY * newScale;
    
    // Apply pan limits
    const canvasWidth = canvasConfig.width * newScale;
    const canvasHeight = canvasConfig.height * newScale;
    const maxOffsetX = window.innerWidth * 0.8;
    const maxOffsetY = window.innerHeight * 0.8;
    const minOffsetX = window.innerWidth * 0.2 - canvasWidth;
    const minOffsetY = window.innerHeight * 0.2 - canvasHeight;
    
    setScale(newScale);
    setOffset({
      x: Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX)),
      y: Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY))
    });
  }, [scale, offset, canvasConfig.width, canvasConfig.height]);

  // Listen for pixel updates from other users via Multisynq
  useEffect(() => {
    const handleViewEvent = (eventType: string, data: unknown) => {
      console.log('🎨 CANVAS: Multisynq view event received:', eventType, data);
      
      if (eventType === 'pixel-update') {
        const pixelUpdate = data as PixelUpdate;
        console.log('🎨 CANVAS: Processing pixel update:', pixelUpdate);
        
        if (pixelUpdate.owner === walletAddress) {
          console.log('🎨 CANVAS: Skipping own pixel update');
          return; // Don't update own pixels
        }
        
        if (pixelUpdate.color === 'transparent') {
          // Handle pixel removal
          console.log('🎨 CANVAS: Removing pixel at', pixelUpdate.x, pixelUpdate.y);
          setCanvasState(prev => {
            const newPixels = { ...prev.pixels };
            const key = pixelKey(pixelUpdate.x, pixelUpdate.y);
            delete newPixels[key];
            
            return {
              ...prev,
              pixels: newPixels,
              lastUpdated: Date.now(),
              totalPixels: Object.keys(newPixels).length
            };
          });
        } else {
          console.log('🎨 CANVAS: Adding pixel at', pixelUpdate.x, pixelUpdate.y, 'with color', pixelUpdate.color);
          updatePixel(pixelUpdate.x, pixelUpdate.y, pixelUpdate.color, pixelUpdate.owner);
        }
      } else if (eventType === 'canvas-state-changed') {
        const state = data as CanvasState;
        console.log('🎨 CANVAS: Updating canvas state:', state);
        setCanvasState(state);
      }
    };

    console.log('🎨 CANVAS: Subscribing to Multisynq view events');
    // Subscribe to Multisynq view events
    subscribeToViewEvents(handleViewEvent);

    return () => {
      console.log('🎨 CANVAS: Unsubscribing from Multisynq view events');
      // Cleanup is handled by Multisynq
    };
  }, [walletAddress, updatePixel, subscribeToViewEvents]);

  // Auto-update cooldown timer every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingCooldown(userId, userCooldowns, canvasConfig);
      setCooldownTimer(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [userId, userCooldowns, canvasConfig]);

  // Add non-passive event listeners to prevent preventDefault errors
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMoveNonPassive = (e: MouseEvent) => {
      e.preventDefault();
      handleMouseMove(e as any);
    };

    const handleMouseDownNonPassive = (e: MouseEvent) => {
      e.preventDefault();
      handleMouseDown(e as any);
    };

    const handleMouseUpNonPassive = (e: MouseEvent) => {
      e.preventDefault();
      handleMouseUp(e as any);
    };

    const handleWheelNonPassive = (e: WheelEvent) => {
      e.preventDefault();
      handleWheel(e as any);
    };

    const handleTouchStartNonPassive = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleTouchMoveNonPassive = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleTouchEndNonPassive = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add non-passive event listeners
    canvas.addEventListener('mousemove', handleMouseMoveNonPassive, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDownNonPassive, { passive: false });
    canvas.addEventListener('mouseup', handleMouseUpNonPassive, { passive: false });
    canvas.addEventListener('wheel', handleWheelNonPassive, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStartNonPassive, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMoveNonPassive, { passive: false });
    canvas.addEventListener('touchend', handleTouchEndNonPassive, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMoveNonPassive);
      canvas.removeEventListener('mousedown', handleMouseDownNonPassive);
      canvas.removeEventListener('mouseup', handleMouseUpNonPassive);
      canvas.removeEventListener('wheel', handleWheelNonPassive);
      canvas.removeEventListener('touchstart', handleTouchStartNonPassive);
      canvas.removeEventListener('touchmove', handleTouchMoveNonPassive);
      canvas.removeEventListener('touchend', handleTouchEndNonPassive);
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp, handleWheel]);

  return (
    <div className="relative w-full h-full">
      {/* Full Screen Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        className="block cursor-crosshair select-none"
        style={{
          background: GRID_BACKGROUND,
          width: '100vw',
          height: '100vh'
        }}
      />

      {/* Left Side Controls */}
      <div className="fixed left-4 top-4 flex flex-col space-y-4">
        {/* Zoom Controls */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => {
              const maxScale = Math.max(50, Math.min(window.innerWidth / canvasConfig.width, window.innerHeight / canvasConfig.height));
              const newScale = Math.min(maxScale, scale + 0.5);
              const newOffset = getCenteredOffset(newScale);
              setScale(newScale);
              setOffset(newOffset);
            }}
            className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full border-2 border-gray-300 hover:border-gray-500 shadow-lg flex items-center justify-center transition-all hover:scale-110"
            title="Zoom In"
          >
            <span className="text-gray-700 font-bold text-lg">+</span>
          </button>
          <button
            onClick={() => {
              const maxScale = Math.max(50, Math.min(window.innerWidth / canvasConfig.width, window.innerHeight / canvasConfig.height));
              const newScale = Math.max(0.1, scale - 0.5);
              const newOffset = getCenteredOffset(newScale);
              setScale(newScale);
              setOffset(newOffset);
            }}
            className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full border-2 border-gray-300 hover:border-gray-500 shadow-lg flex items-center justify-center transition-all hover:scale-110"
            title="Zoom Out"
          >
            <span className="text-gray-700 font-bold text-lg">−</span>
          </button>
        </div>

        {/* Color Palette and Tools */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex space-x-2">
            {/* Color Palette */}
            <div className="grid grid-cols-2 gap-1">
              {COLOR_PALETTE.map((color, index) => (
                <button
                  key={index}
                  className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                    selectedColor === color ? 'border-blue-400 scale-110 shadow-md' : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setSelectedColor(color);
                    setCurrentTool('draw');
                  }}
                  title={color}
                />
              ))}
            </div>
            
            {/* Tool Selection */}
            <div className="flex flex-col space-y-1">
              <button
                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-xs ${
                  currentTool === 'draw' 
                    ? 'bg-blue-500 text-white border-blue-600 shadow-md' 
                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                }`}
                onClick={() => setCurrentTool('draw')}
                title="Draw Tool (Left Click)"
              >
                ✏️
              </button>
              <button
                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-xs ${
                  currentTool === 'erase' 
                    ? 'bg-red-500 text-white border-red-600 shadow-md' 
                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                }`}
                onClick={() => setCurrentTool('erase')}
                title="Erase Tool (Right Click)"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Panel */}
      <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg min-w-[280px]">
        <div className="text-sm font-medium text-gray-700 mb-2">
          🎨 Session: {sessionId.substring(0, 30)}...
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            // Show a small notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-3 py-1 rounded text-sm z-50';
            notification.textContent = 'URL copied!';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
          }}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors mb-2"
        >
          Copy URL
        </button>
        <div className="text-xs text-gray-500 mt-1">
          Pixels: {canvasState.totalPixels.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">
          Zoom: {scale.toFixed(1)}x
        </div>
        <div className="text-xs text-gray-500">
          Cooldown: {cooldownTimer > 0 
            ? `${(cooldownTimer / 1000).toFixed(1)}s`
            : 'Ready'
          }
        </div>
        <div className="text-xs text-gray-500">
          Tool: {currentTool === 'draw' ? '✏️ Draw' : '🗑️ Erase'}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Multisynq: {multisynqConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        
        {/* Reset View Button */}
        <button
          onClick={() => {
            const newScale = 10;
            const newOffset = getCenteredOffset(newScale);
            setScale(newScale);
            setOffset(newOffset);
          }}
          className="mt-2 w-full bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold transition-colors py-1"
          title="Reset View"
        >
          Reset View
        </button>
      </div>

      {/* Position Info - Next to Color Palette */}
      {hoverPixel && (
        <div className="fixed left-4 bottom-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs text-gray-600">
            <div className="font-medium mb-1">Position</div>
            <div>({hoverPixel[0]}, {hoverPixel[1]})</div>
            <div className="mt-2 font-medium">Color</div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: selectedColor }}
              />
              <span>{selectedColor}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini-map */}
      <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <div className="text-xs text-gray-700 mb-1 text-center">Map</div>
        <canvas
          ref={minimapRef}
          onClick={handleMinimapClick}
          className="block border border-gray-300 rounded cursor-pointer"
          style={{
            width: '150px',
            height: '150px'
          }}
        />
      </div>

      {/* Cooldown Warning */}
      {cooldownTimer > 0 && (
        <div className="fixed inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg">
            Cooldown: {(cooldownTimer / 1000).toFixed(1)}s
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to parse pixel key
function parsePixelKey(key: string): { x: number; y: number } {
  const parts = key.split('_');
  if (parts.length !== 2) {
    console.warn('Invalid pixel key format:', key);
    return { x: 0, y: 0 };
  }
  
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  
  if (isNaN(x) || isNaN(y)) {
    console.warn('Invalid pixel coordinates in key:', key);
    return { x: 0, y: 0 };
  }
  
  return { x, y };
} 