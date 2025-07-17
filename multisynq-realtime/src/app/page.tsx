'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PixelPlaceCanvas from '@/components/PixelPlaceCanvas';
import WalletConnection from '@/components/WalletConnection';
import CanvasSelector, { CanvasTemplate } from '@/components/CanvasSelector';
import { useMultisynqSession } from '@/hooks/useMultisynqSession';
import { generateUserId, generateSessionId } from '@/lib/multisynq';

function HomeContent() {
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userId] = useState(() => generateUserId());
  const [sessionId] = useState(() => {
    // Get session ID from URL or let Multisynq auto-generate
    const urlSessionId = searchParams.get('q'); // Multisynq uses ?q=sessionId
    console.log('🔍 URL Session ID from ?q=:', urlSessionId);
    console.log('🔍 All URL params:', Object.fromEntries(searchParams.entries()));
    return urlSessionId || 'auto-session'; // Let Multisynq handle session ID
  });
  const [userName, setUserName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showCanvasSelector, setShowCanvasSelector] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [selectedCanvas, setSelectedCanvas] = useState<CanvasTemplate>({
    id: 'square-1000',
    name: 'Square Canvas',
    width: 1000,
    height: 1000,
    description: '1000x1000 pixel square canvas - Perfect for pixel art',
    type: 'size'
  });

  // Get Multisynq session info
  const { sessionInfo } = useMultisynqSession({
    sessionId,
    userId,
    walletAddress: walletAddress || ''
  });

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate user name from wallet address
  useEffect(() => {
    if (walletAddress) {
      const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
      setUserName(`User ${shortAddress}`);
    }
  }, [walletAddress]);

  // Debug state changes
  useEffect(() => {
    console.log('🔄 State changed - isConnected:', isConnected, 'walletAddress:', walletAddress);
  }, [isConnected, walletAddress]);

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setIsConnected(true);
  };

  const handleWalletDisconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
    setUserName('');
  };

  const handleCanvasSelect = (template: CanvasTemplate) => {
    setSelectedCanvas(template);
    setShowCanvasSelector(false);
  };

  const handleBackToMenu = () => {
    console.log('🔄 Going back to menu...');
    
    // Force immediate state reset with multiple approaches
    setIsConnected(false);
    setWalletAddress(null);
    setUserName('');
    setRenderKey(prev => prev + 1);
    
    // Force multiple render cycles to ensure state is properly reset
    setTimeout(() => {
      setIsConnected(false);
      setWalletAddress(null);
      setRenderKey(prev => prev + 1);
    }, 10);
    
    setTimeout(() => {
      setIsConnected(false);
      setWalletAddress(null);
      setRenderKey(prev => prev + 1);
    }, 50);
    
    console.log('Menu button clicked - state reset initiated');
  };

  const handleDisconnect = () => {
    console.log('🔌 Disconnecting wallet...');
    
    // Force immediate state reset with multiple approaches
    setIsConnected(false);
    setWalletAddress(null);
    setUserName('');
    setRenderKey(prev => prev + 1);
    
    // Force multiple render cycles to ensure state is properly reset
    setTimeout(() => {
      setIsConnected(false);
      setWalletAddress(null);
      setRenderKey(prev => prev + 1);
    }, 10);
    
    setTimeout(() => {
      setIsConnected(false);
      setWalletAddress(null);
      setRenderKey(prev => prev + 1);
    }, 50);
    
    console.log('Disconnect button clicked - state reset initiated');
  };

  return (
    <main key={`main-${renderKey}-${isConnected}-${walletAddress}`} className="w-full h-screen overflow-hidden">
      {!isClient ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Loading...
            </h2>
          </div>
        </div>
      ) : isConnected && walletAddress && walletAddress !== null ? (
        <div className="w-full h-full relative">
          <PixelPlaceCanvas
            key={`canvas-${renderKey}-${walletAddress}`}
            sessionId={sessionId}
            userId={userId}
            walletAddress={walletAddress}
            config={{
              width: selectedCanvas.width,
              height: selectedCanvas.height,
              cooldownMs: 300, // 0.3 second cooldown
              maxPixelsPerUser: 1000
            }}

            onBackToMenu={handleBackToMenu}
            onDisconnect={handleDisconnect}
          />
        </div>
      ) : (
        /* Waiting for Connection */
        <div className="w-full h-full flex items-center justify-center bg-[#171717] p-4">
          <div className="bg-[#FBFAF9] rounded-lg shadow-lg p-8 w-[900px] max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-[#0E100F] mb-3">
                Monad Place Pixel Canvas
              </h1>
              <p className="text-xl text-[#0E100F]">
                Collaborative Pixel Canvas - Build by{' '}
                <a 
                  href="https://x.com/gurhankutsal" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#200052] hover:text-[#300063] font-bold underline"
                >
                  Kutsal
                </a>
                {' '}•{' '}
                <a 
                  href="https://multisynq.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#200052] hover:text-[#300063] font-bold"
                >
                  Powered by Multisynq
                </a>
                {' '}•{' '}
                <a 
                  href="https://monad.xyz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#200052] hover:text-[#300063] font-bold"
                >
                  Built on Monad
                </a>
              </p>
            </div>

            {/* Wallet Connection Section */}
            <div className="mb-8">
              <WalletConnection
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
              />
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-semibold text-[#0E100F] mb-4">
                Ready to Start Pixel Art with Nads?
              </h2>
              <p className="text-lg text-[#0E100F] mb-6">
                Connect your wallet (MetaMask or Phantom) to Monad Testnet and join the collaborative pixel canvas.
              </p>

              {/* Canvas Selection */}
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0E100F]">Selected Canvas:</h3>
                    <p className="text-base text-[#0E100F]">{selectedCanvas.name} ({selectedCanvas.width}×{selectedCanvas.height})</p>
                  </div>
                  <button
                    onClick={() => setShowCanvasSelector(true)}
                    className="bg-[#836EF9] hover:bg-[#7A5FF0] text-white px-5 py-3 rounded-lg font-medium transition-colors text-base"
                  >
                    Choose Template
                  </button>
                </div>
                <p className="text-sm text-[#0E100F]">{selectedCanvas.description}</p>
              </div>
              
              {/* Session Info */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-base font-medium text-blue-700 mb-2">🎨 Session Information:</p>
                <div className="bg-white p-3 rounded border border-blue-300 space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">URL Session ID:</p>
                    <p className="font-mono text-base font-bold text-blue-900 break-all select-all">
                      {sessionId === 'auto-session' ? 'Auto-generated' : sessionId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Real Multisynq Session ID:</p>
                    <p className="font-mono text-base font-bold text-green-900 break-all select-all">
                      {sessionInfo?.sessionId || 'Connecting...'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Connection Status:</p>
                    <p className={`text-base font-bold ${sessionInfo?.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {sessionInfo?.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-[#200052] font-bold">
                    📋 Share this URL to invite others
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('URL copied to clipboard!');
                    }}
                    className="text-sm bg-[#836EF9] text-white px-4 py-2 rounded hover:bg-[#7A5FF0] transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-base text-[#0E100F]">
                <div>• Selectable canvas sizes (1000x1000, 800x600, 1200x800, etc.)</div>
                <div>• Real-time collaboration</div>
                <div>• 10-color palette + custom hex colors</div>
                <div>• Pan & zoom support</div>
                <div>• Cooldown system</div>
                <div>• Powered by Multisynq + Monad</div>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 text-center text-[#0E100F] text-base">
              <div>
                Collaborative pixel canvas demo • Chain ID: 10143 (Monad Testnet)
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Canvas Selector Modal */}
      <CanvasSelector
        isOpen={showCanvasSelector}
        onClose={() => setShowCanvasSelector(false)}
        onSelectTemplate={handleCanvasSelect}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
