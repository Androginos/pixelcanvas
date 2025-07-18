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
  isUserOnSpamCooldown,
  getRemainingSpamCooldown,
  shouldStartSpamCooldown,
  incrementPixelCount,
  startSpamCooldown,
  resetPixelCount
} from '@/types/pixelplace';
import { useMultisynqSession } from '@/hooks/useMultisynqSession';

interface PixelPlaceCanvasProps {
  sessionId: string;
  userId: string;
  walletAddress: string;
  config?: Partial<CanvasConfig>;
  onBackToMenu?: () => void;
  onDisconnect?: () => void;
}

const CANVAS_SIZE = 1000;
const PIXEL_SIZE = 50;
const GRID_BACKGROUND = '#171717';

type Tool = 'draw' | 'erase' | 'move';

export default function PixelPlaceCanvas({ 
  sessionId, 
  userId, 
  walletAddress,
  config = {},
  onBackToMenu,
  onDisconnect
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
  const [scale, setScale] = useState(() => {
    // Calculate initial scale to fit entire canvas on screen
    const scaleX = window.innerWidth / canvasConfig.width;
    const scaleY = window.innerHeight / canvasConfig.height;
    return Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
  }); // zoom seviyesi
  const [offset, setOffset] = useState(() => {
    // Initialize offset to center the canvas with fit to screen scale
    const initialScale = Math.min(window.innerWidth / canvasConfig.width, window.innerHeight / canvasConfig.height) * 0.9;
    const canvasWidth = canvasConfig.width * initialScale;
    const canvasHeight = canvasConfig.height * initialScale;
    return {
      x: (window.innerWidth - canvasWidth) / 2,
      y: (window.innerHeight - canvasHeight) / 2
    };
  }); // pan
  const [dragging, setDragging] = useState(false);
  const [spamCooldownTimer, setSpamCooldownTimer] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('draw');
  const [hasMoved, setHasMoved] = useState(false);
  
  // Pixel update queue for offline scenarios
  const [pendingPixelUpdates, setPendingPixelUpdates] = useState<PixelUpdate[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Multisynq session hook
  const {
    isConnected: multisynqConnected,
    publishPixelUpdate,
    subscribeToPixelUpdates,
    unsubscribeFromPixelUpdates,
    subscribeToViewEvents,
    sendPixelUpdateToModel,
    sessionInfo,
    reconnect
  } = useMultisynqSession({
    sessionId,
    userId,
    walletAddress
  });
  
  const dragStart = useRef<{ x: number, y: number } | null>(null);
  const lastMousePos = useRef<{ x: number, y: number } | null>(null);

  // Process pending pixel updates when connection is restored
  useEffect(() => {
    if (multisynqConnected && pendingPixelUpdates.length > 0 && !isProcessingQueue) {
      setIsProcessingQueue(true);
      
      const processQueue = async () => {
        console.log(`🔄 Processing ${pendingPixelUpdates.length} pending pixel updates...`);
        
        for (const pixelUpdate of pendingPixelUpdates) {
          try {
            await sendPixelUpdateToModel(pixelUpdate);
            // Small delay between updates to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error('Failed to process queued pixel update:', error);
          }
        }
        
        setPendingPixelUpdates([]);
        setIsProcessingQueue(false);
        console.log('✅ Pending pixel updates processed');
      };
      
      processQueue();
    }
  }, [multisynqConnected, pendingPixelUpdates, isProcessingQueue, sendPixelUpdateToModel]);


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

      // Reset pixel count for new session
      setUserCooldowns(prev => resetPixelCount(userId, prev));

      setIsConnected(true);
    };

    initializeCanvas();
  }, [sessionId, userId]);



  // Render function with requestAnimationFrame
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill entire background with dark color
    ctx.fillStyle = GRID_BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate canvas area
    const canvasAreaX = offset.x;
    const canvasAreaY = offset.y;
    const canvasAreaWidth = canvasConfig.width * scale;
    const canvasAreaHeight = canvasConfig.height * scale;

    // Fill canvas area with light gray
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(canvasAreaX, canvasAreaY, canvasAreaWidth, canvasAreaHeight);

    // Draw grid only inside canvas area
    if (scale > 4) {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      
      // Calculate grid start and end positions within canvas bounds
      const gridStartX = Math.max(canvasAreaX, Math.floor(canvasAreaX / scale) * scale);
      const gridStartY = Math.max(canvasAreaY, Math.floor(canvasAreaY / scale) * scale);
      const gridEndX = Math.min(canvasAreaX + canvasAreaWidth, Math.ceil((canvasAreaX + canvasAreaWidth) / scale) * scale);
      const gridEndY = Math.min(canvasAreaY + canvasAreaHeight, Math.ceil((canvasAreaY + canvasAreaHeight) / scale) * scale);
      
      // Draw vertical grid lines
      for (let x = gridStartX; x <= gridEndX; x += scale) {
        ctx.beginPath();
        ctx.moveTo(x, canvasAreaY);
        ctx.lineTo(x, canvasAreaY + canvasAreaHeight);
        ctx.stroke();
      }
      
      // Draw horizontal grid lines
      for (let y = gridStartY; y <= gridEndY; y += scale) {
        ctx.beginPath();
        ctx.moveTo(canvasAreaX, y);
        ctx.lineTo(canvasAreaX + canvasAreaWidth, y);
        ctx.stroke();
      }
    }

    // Calculate viewport bounds for culling
    const viewportLeft = -offset.x / scale;
    const viewportRight = (-offset.x + window.innerWidth) / scale;
    const viewportTop = -offset.y / scale;
    const viewportBottom = (-offset.y + window.innerHeight) / scale;

    // Draw all user pixels - with viewport culling
    Object.entries(canvasState.pixels).forEach(([key, pixelData]) => {
      const { x, y } = parsePixelKey(key);
      
      // Only render pixels that are in viewport
      if (x >= viewportLeft && x <= viewportRight && y >= viewportTop && y <= viewportBottom) {
        const screenX = x * scale + offset.x;
        const screenY = y * scale + offset.y;
        
        ctx.fillStyle = pixelData.color;
        ctx.fillRect(screenX, screenY, scale, scale);
      }
    });

    // Draw canvas border
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
  };

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

    // Check only spam cooldown (removed regular cooldown)
    if (isUserOnSpamCooldown(userId, userCooldowns, canvasConfig)) {
      console.log('User is on spam cooldown');
      return;
    }

    const [x, y] = getPixelCoord(e);

    // Validate pixel coordinates
    if (!isValidPixel(x, y, canvasConfig)) return;

    if (currentTool === 'draw') {
      // Update pixel locally
      updatePixel(x, y, selectedColor, walletAddress);

      // Update cooldown with pixel count
      setUserCooldowns(prev => {
        const newCooldowns = incrementPixelCount(userId, prev);
        
        // Check if we should start spam cooldown
        if (shouldStartSpamCooldown(userId, newCooldowns, canvasConfig)) {
          return startSpamCooldown(userId, newCooldowns);
        }
        
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

      // Send via Multisynq model with queue fallback
      try {
        console.log('🎨 CANVAS: Sending pixel update to Multisynq model:', pixelUpdate);
        await sendPixelUpdateToModel(pixelUpdate);
        console.log('🎨 CANVAS: Successfully sent pixel update to model');
      } catch (error) {
        console.error('Failed to send pixel update to model:', error);
        
        // If connection is lost, queue the update for later
        if (!multisynqConnected) {
          console.log('🔄 Connection lost, queuing pixel update for later...');
          setPendingPixelUpdates(prev => [...prev, pixelUpdate]);
        }
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
    // Moderate zoom sensitivity for controlled zooming
    const zoomFactor = 1.0;
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
      const spamRemaining = getRemainingSpamCooldown(userId, userCooldowns, canvasConfig);
      setSpamCooldownTimer(spamRemaining);
      
      // Reset pixel count when cooldown ends
      if (spamRemaining === 0) {
        const currentCooldown = userCooldowns.get(userId);
        if (currentCooldown && currentCooldown.cooldownStartTime && currentCooldown.pixelCount >= canvasConfig.maxPixelsPerCooldown) {
          console.log('🔄 Resetting pixel count after cooldown');
          setUserCooldowns(prev => resetPixelCount(userId, prev));
        }
      }
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

      {/* Left Side Controls - Dark Theme */}
      <div className="fixed left-4 top-4 flex flex-col space-y-4">

        {/* Zoom Controls */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const maxScale = Math.max(50, Math.min(window.innerWidth / canvasConfig.width, window.innerHeight / canvasConfig.height));
                const newScale = Math.min(maxScale, scale + 2.5);
                const newOffset = getCenteredOffset(newScale);
                setScale(newScale);
                setOffset(newOffset);
              }}
              className="w-8 h-8 bg-gray-700/80 hover:bg-gray-600/80 rounded border border-gray-600 flex items-center justify-center transition-all hover:scale-110"
              title="Zoom In"
            >
              <span className="text-gray-300 font-bold text-sm">+</span>
            </button>
            <div className="bg-gray-700/80 rounded px-2 py-1 min-w-[40px] text-center">
              <span className="text-gray-300 text-xs">{Math.round(scale)}px</span>
            </div>
            <button
              onClick={() => {
                const newScale = Math.max(0, scale - 2.5);
                if (newScale === 0) {
                  // Fit to screen when scale reaches 0
                  const scaleX = window.innerWidth / canvasConfig.width;
                  const scaleY = window.innerHeight / canvasConfig.height;
                  const fitScale = Math.min(scaleX, scaleY) * 0.9;
                  const newOffset = getCenteredOffset(fitScale);
                  setScale(fitScale);
                  setOffset(newOffset);
                } else {
                  const newOffset = getCenteredOffset(newScale);
                  setScale(newScale);
                  setOffset(newOffset);
                }
              }}
              className="w-8 h-8 bg-gray-700/80 hover:bg-gray-600/80 rounded border border-gray-600 flex items-center justify-center transition-all hover:scale-110"
              title="Zoom Out"
            >
              <span className="text-gray-300 font-bold text-sm">−</span>
            </button>
            <button
              onClick={() => {
                // Calculate scale to fit entire canvas on screen
                const scaleX = window.innerWidth / canvasConfig.width;
                const scaleY = window.innerHeight / canvasConfig.height;
                const fitScale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
                const newOffset = getCenteredOffset(fitScale);
                setScale(fitScale);
                setOffset(newOffset);
              }}
              className="w-8 h-8 bg-gray-700/80 hover:bg-gray-600/80 rounded border border-gray-600 flex items-center justify-center transition-all hover:scale-110"
              title="Fit to Screen"
            >
              <span className="text-gray-300 font-bold text-xs">⛶</span>
            </button>
          </div>
        </div>

        {/* Color Palette */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-700">
          <div className="grid grid-cols-2 gap-2 mb-2">
            {COLOR_PALETTE.map((color, index) => (
              <button
                key={index}
                className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                  selectedColor === color ? 'border-white scale-110 shadow-md' : 'border-gray-600 hover:border-gray-500'
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
          
          {/* Custom Color Picker */}
          <button
            onClick={() => {
              const hexColor = prompt('Enter hex color (e.g., #FF0000):', selectedColor);
              if (hexColor && /^#[0-9A-F]{6}$/i.test(hexColor)) {
                setSelectedColor(hexColor.toUpperCase());
                setCurrentTool('draw');
              } else if (hexColor) {
                alert('Please enter a valid hex color (e.g., #FF0000)');
              }
            }}
            className="w-full h-8 bg-gray-700/80 hover:bg-gray-600/80 rounded border border-gray-600 flex items-center justify-center transition-all hover:scale-105"
            title="Custom Color Picker"
          >
            <span className="text-gray-300 text-sm font-medium">🎨 Custom</span>
          </button>
        </div>

        {/* Drawing Tools */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-700">
          <div className="flex flex-col space-y-2">
            <button
              className={`w-8 h-8 rounded border flex items-center justify-center transition-all hover:scale-110 ${
                currentTool === 'draw' 
                  ? 'bg-blue-600/80 border-blue-500' 
                  : 'bg-gray-700/80 border-gray-600 hover:bg-gray-600/80'
              }`}
              onClick={() => setCurrentTool('draw')}
              title="Draw Tool (Left Click)"
            >
              <span className="text-gray-300 text-sm">✏️</span>
            </button>
            <button
              className={`w-8 h-8 rounded border flex items-center justify-center transition-all hover:scale-110 ${
                currentTool === 'erase' 
                  ? 'bg-red-600/80 border-red-500' 
                  : 'bg-gray-700/80 border-gray-600 hover:bg-gray-600/80'
              }`}
              onClick={() => setCurrentTool('erase')}
              title="Erase Tool (Right Click)"
            >
              <span className="text-gray-300 text-sm">🗑️</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Panel */}
      <div className="fixed top-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 shadow-lg min-w-[280px] border border-gray-700">
        <div className="text-base font-medium text-gray-200 mb-2">
          🎨 Session: {sessionId.substring(0, 30)}...
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2 mb-3">
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
            className="text-sm bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition-colors font-medium"
          >
            Copy URL
          </button>
          
          {/* Menu and Disconnect buttons temporarily disabled
          {onBackToMenu && (
            <button
              onClick={onBackToMenu}
              className="text-xs bg-[#836EF9] text-white px-2 py-1 rounded hover:bg-[#7A5FF0] transition-colors"
            >
              ← Menu
            </button>
          )}
          
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
            >
              🔌 Disconnect
            </button>
          )}
          */}
        </div>
        <div className="text-sm text-gray-300 mt-1">
          Pixels: {canvasState.totalPixels.toLocaleString()}
        </div>
        <div className="text-sm text-gray-300">
          Zoom: {scale.toFixed(1)}x
        </div>
        <div className="text-sm text-gray-300">
          Spam Protection: {spamCooldownTimer > 0 
            ? `${(spamCooldownTimer / 1000).toFixed(1)}s`
            : 'Active'
          }
        </div>
        <div className="text-sm text-gray-300">
          Pixels: {userCooldowns.get(userId)?.pixelCount || 0} / {canvasConfig.maxPixelsPerCooldown}
        </div>
        <div className="text-sm text-gray-300">
          Tool: {currentTool === 'draw' ? '✏️ Draw' : '🗑️ Erase'}
        </div>
        <div className="text-sm text-gray-300 mt-1">
          <div className="flex items-center justify-between">
            <span>Multisynq: {multisynqConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
            {!multisynqConnected && (
              <button
                onClick={reconnect}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                title="Reconnect to Multisynq"
              >
                🔄 Reconnect
              </button>
            )}
          </div>
          {!multisynqConnected && (
            <div className="text-xs text-yellow-400 mt-1">
              ⚠️ Connection lost. Auto-reconnect in progress...
            </div>
          )}
          {pendingPixelUpdates.length > 0 && (
            <div className="text-xs text-blue-400 mt-1">
              📋 {pendingPixelUpdates.length} pixel(s) queued for sync
            </div>
          )}
          {isProcessingQueue && (
            <div className="text-xs text-green-400 mt-1">
              🔄 Syncing queued pixels...
            </div>
          )}
        </div>
        
        {/* Reset View Button */}
        <button
          onClick={() => {
            // Calculate scale to fit entire canvas on screen
            const scaleX = window.innerWidth / canvasConfig.width;
            const scaleY = window.innerHeight / canvasConfig.height;
            const fitScale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
            const newOffset = getCenteredOffset(fitScale);
            setScale(fitScale);
            setOffset(newOffset);
          }}
          className="mt-2 w-full bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold transition-colors py-2 text-gray-200"
          title="Reset View"
        >
          Reset View
        </button>
      </div>

      {/* Position Info - Next to Color Palette */}
      {hoverPixel && (
        <div className="fixed left-4 bottom-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-700">
          <div className="text-sm text-gray-200">
            <div className="font-medium mb-1">Position</div>
            <div>({hoverPixel[0]}, {hoverPixel[1]})</div>
            <div className="mt-2 font-medium">Color</div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-5 h-5 rounded-full border border-gray-500"
                style={{ backgroundColor: selectedColor }}
              />
              <span>{selectedColor}</span>
            </div>
            <div className="mt-2 font-medium">Pixel Count</div>
            <div className="flex items-center space-x-2">
              <span>{userCooldowns.get(userId)?.pixelCount || 0} / {canvasConfig.maxPixelsPerCooldown}</span>
              {spamCooldownTimer > 0 && (
                <span className="text-red-400">
                  ({(spamCooldownTimer / 1000).toFixed(1)}s cooldown)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini-map */}
      <div className="fixed bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-700">
        <div className="text-sm text-gray-200 mb-1 text-center font-medium">Map</div>
        <canvas
          ref={minimapRef}
          onClick={handleMinimapClick}
          className="block border border-gray-600 rounded cursor-pointer"
          style={{
            width: '150px',
            height: '150px'
          }}
        />
      </div>



      {/* Spam Cooldown Warning */}
      {spamCooldownTimer > 0 && (
        <div className="fixed inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg text-lg font-bold">
            Spam Protection: {(spamCooldownTimer / 1000).toFixed(1)}s remaining
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