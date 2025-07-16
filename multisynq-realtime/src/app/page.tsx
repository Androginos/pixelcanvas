'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PixelPlaceCanvas from '@/components/PixelPlaceCanvas';
import WalletConnection from '@/components/WalletConnection';
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

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setIsConnected(true);
  };

  const handleWalletDisconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
    setUserName('');
  };

  return (
    <main className="w-full h-screen overflow-hidden">
      {!isClient ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Loading...
            </h2>
          </div>
        </div>
      ) : isConnected && walletAddress && userId && sessionId ? (
        <div className="w-full h-full relative">
          <PixelPlaceCanvas
            sessionId={sessionId}
            userId={userId}
            walletAddress={walletAddress}
            config={{
              width: 1000,
              height: 1000,
              cooldownMs: 300, // 0.3 second cooldown
              maxPixelsPerUser: 1000
            }}
          />
        </div>
      ) : (
        /* Waiting for Connection */
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                PixelPlace.io Clone
              </h1>
              <p className="text-lg text-gray-600">
                1000x1000 Collaborative Pixel Canvas - Powered by Multisynq & Monad
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
              <div className="text-6xl mb-4">🎨</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Ready to Start Pixel Art?
              </h2>
              <p className="text-gray-600 mb-6">
                Connect your wallet (MetaMask or Phantom) to Monad Testnet and join the collaborative pixel canvas.
              </p>
              
              {/* Session Info */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-700 mb-2">🎨 Session Information:</p>
                <div className="bg-white p-3 rounded border border-blue-300 space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">URL Session ID:</p>
                    <p className="font-mono text-sm font-bold text-blue-900 break-all select-all">
                      {sessionId === 'auto-session' ? 'Auto-generated' : sessionId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Real Multisynq Session ID:</p>
                    <p className="font-mono text-sm font-bold text-green-900 break-all select-all">
                      {sessionInfo?.sessionId || 'Connecting...'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Connection Status:</p>
                    <p className={`text-sm font-bold ${sessionInfo?.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {sessionInfo?.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-blue-600">
                    📋 Share this URL to invite others
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('URL copied to clipboard!');
                    }}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• 1000x1000 pixel canvas</div>
                <div>• Real-time collaboration</div>
                <div>• 40-color palette</div>
                <div>• Pan & zoom support</div>
                <div>• Cooldown system</div>
                <div>• Powered by Multisynq + Monad</div>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 text-center text-gray-500 text-sm">
              <div className="mb-4">
                <a 
                  href="https://multisynq.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Powered by Multisynq
                </a>
                {' • '}
                <a 
                  href="https://monad.xyz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Built on Monad
                </a>
                {' • '}
                <a 
                  href="https://pixelplace.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Inspired by PixelPlace.io
                </a>
              </div>
              <div>
                Collaborative pixel canvas demo • Chain ID: 10143 (Monad Testnet) • 1000x1000 pixels
              </div>
            </footer>
          </div>
        </div>
      )}
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
