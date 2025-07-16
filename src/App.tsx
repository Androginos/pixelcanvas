import React, { useState, useEffect } from 'react';
import MultiplayerCanvas from './components/MultiplayerCanvas';
import MultisynqHookExample from './components/MultisynqHookExample';
import { WalletState } from './multisynq/types';
import './index.css';

// Monad testnet konfigürasyonu
const MONAD_TESTNET = {
  id: 41454,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet1.monad.xyz'],
    },
    public: {
      http: ['https://testnet1.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet1.monad.xyz' },
  },
} as const;

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
  });

  const [viewMode, setViewMode] = useState<'canvas' | 'hooks'>('canvas');
  
  // 🧪 TEST MODE: Cüzdansız test için
  const [testMode, setTestMode] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setWallet({
          isConnected: true,
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          isConnecting: false,
        });
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWallet(prev => ({
        ...prev,
        error: 'MetaMask yüklü değil. Lütfen MetaMask extension\'ını yükleyin.',
      }));
      return;
    }

    setWallet(prev => ({ ...prev, isConnecting: true, error: undefined }));

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('Hesap erişimi reddedildi');
      }

      // Check current chain
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);

      // Switch to Monad testnet if needed
      if (currentChainId !== MONAD_TESTNET.id) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${MONAD_TESTNET.id.toString(16)}` }],
          });
        } catch (switchError: any) {
          // If chain doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${MONAD_TESTNET.id.toString(16)}`,
                  chainName: MONAD_TESTNET.name,
                  nativeCurrency: MONAD_TESTNET.nativeCurrency,
                  rpcUrls: [MONAD_TESTNET.rpcUrls.default.http[0]],
                  blockExplorerUrls: [MONAD_TESTNET.blockExplorers.default.url],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      setWallet({
        isConnected: true,
        address: accounts[0],
        chainId: MONAD_TESTNET.id,
        isConnecting: false,
      });

    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Cüzdan bağlantısı başarısız',
      }));
    }
  };

  const disconnectWallet = () => {
    setWallet({
      isConnected: false,
      isConnecting: false,
    });
  };

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWallet(prev => ({ ...prev, address: accounts[0] }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      setWallet(prev => ({ ...prev, chainId: newChainId }));
      
      // Reload page if wrong chain
      if (newChainId !== MONAD_TESTNET.id) {
        window.location.reload();
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // Test mode bypass
  if (testMode) {
    const mockWallet: WalletState = {
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      chainId: MONAD_TESTNET.id,
      isConnecting: false,
    };

    return (
      <div className="w-full h-screen overflow-hidden relative">
        {/* Test Mode Banner */}
        <div className="absolute top-0 left-0 right-0 z-40 bg-orange-600 text-white text-center py-2">
          🧪 TEST MODE ACTIVE - Cüzdan simülasyonu çalışıyor
          <button 
            onClick={() => setTestMode(false)}
            className="ml-4 bg-orange-700 px-2 py-1 rounded text-xs"
          >
            Normal Mode
          </button>
        </div>

        {/* Hook API Demo Toggle */}
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-slate-800 rounded-lg p-2 border border-slate-700 flex space-x-2">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'canvas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🎨 Canvas Demo
            </button>
            <button
              onClick={() => setViewMode('hooks')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'hooks'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🚀 Hook API Demo
            </button>
          </div>
        </div>

        {viewMode === 'canvas' ? (
          <MultiplayerCanvas 
            wallet={mockWallet}
            sessionId="monad-canvas-shared"
          />
        ) : (
          <MultisynqHookExample
            wallet={mockWallet}
            sessionId="monad-hook-demo"
          />
        )}
      </div>
    );
  }

  // Render wallet connection screen
  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Monad Canvas
              </h1>
              <p className="text-slate-300">
                Gerçek zamanlı çok oyunculu canvas deneyimi
              </p>
            </div>

            {wallet.error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                <p className="text-red-200 text-sm">{wallet.error}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={connectWallet}
                disabled={wallet.isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {wallet.isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Bağlanıyor...</span>
                  </>
                ) : (
                  <>
                    <span>🦊</span>
                    <span>Monad Testnet'e Bağlan</span>
                  </>
                )}
              </button>

              {/* Test Mode Button */}
              <button
                onClick={() => setTestMode(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>🧪</span>
                <span>Test Mode (Cüzdansız Demo)</span>
              </button>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">ℹ️ Gereksinimler:</h3>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• MetaMask veya uyumlu cüzdan</li>
                  <li>• Monad testnet ağı</li>
                  <li>• Canvas'ta cursor paylaşımı</li>
                </ul>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">🎯 Özellikler:</h3>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• Gerçek zamanlı cursor senkronizasyonu</li>
                  <li>• Multisynq framework entegrasyonu</li>
                  <li>• Çok oyunculu etkileşim</li>
                  <li>• Web3 tabanlı kimlik doğrulama</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wrong network warning
  if (wallet.chainId && wallet.chainId !== MONAD_TESTNET.id) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-amber-900/50 border border-amber-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-amber-200 mb-4">
              ⚠️ Yanlış Ağ
            </h2>
            <p className="text-amber-100 mb-4">
              Lütfen Monad Testnet ağına geçin (Chain ID: {MONAD_TESTNET.id})
            </p>
            <button
              onClick={connectWallet}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Ağı Değiştir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main application
  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* Hook API Demo Toggle */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-slate-800 rounded-lg p-2 border border-slate-700 flex space-x-2">
          <button
            onClick={() => setViewMode('canvas')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'canvas'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🎨 Canvas Demo
          </button>
          <button
            onClick={() => setViewMode('hooks')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'hooks'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🚀 Hook API Demo
          </button>
        </div>
      </div>

      {viewMode === 'canvas' ? (
        <MultiplayerCanvas 
          wallet={wallet}
          sessionId="monad-canvas-shared"
        />
      ) : (
        <MultisynqHookExample
          wallet={wallet}
          sessionId="monad-hook-demo"
        />
      )}
    </div>
  );
}

export default App; 