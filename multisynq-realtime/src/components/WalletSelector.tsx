'use client';

import React from 'react';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (walletType: 'metamask' | 'phantom') => void;
}

const wallets = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Most popular Ethereum wallet',
    icon: '🦊',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    description: 'Popular Solana wallet with EVM support',
    icon: '👻',
    color: 'bg-purple-500 hover:bg-purple-600'
  }
];

// Check if wallets are installed
const checkWalletInstalled = (walletId: string) => {
  if (typeof window === 'undefined') return false;
  
  try {
    if (walletId === 'metamask') {
      return typeof window.ethereum !== 'undefined' && 
             window.ethereum !== null && 
             typeof window.ethereum.request === 'function' &&
             window.ethereum.isMetaMask;
    } else if (walletId === 'phantom') {
      return typeof window.ethereum !== 'undefined' && 
             window.ethereum !== null && 
             typeof window.ethereum.request === 'function' &&
             window.ethereum.isPhantom;
    }
    return false;
  } catch (error) {
    return false;
  }
};

export default function WalletSelector({ isOpen, onClose, onSelectWallet }: WalletSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Choose Your Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Select a wallet to connect to Monad Testnet
        </p>

        <div className="space-y-3">
          {wallets.map((wallet) => {
            const isInstalled = checkWalletInstalled(wallet.id);
            return (
              <button
                key={wallet.id}
                onClick={() => onSelectWallet(wallet.id as 'metamask' | 'phantom')}
                className={`w-full ${wallet.color} text-white p-4 rounded-lg flex items-center space-x-4 transition-colors ${
                  !isInstalled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!isInstalled}
              >
                <span className="text-2xl">{wallet.icon}</span>
                <div className="text-left">
                  <div className="font-semibold flex items-center space-x-2">
                    <span>{wallet.name}</span>
                    {isInstalled && <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Installed</span>}
                  </div>
                  <div className="text-sm opacity-90">{wallet.description}</div>
                  {!isInstalled && (
                    <div className="text-xs opacity-75 mt-1">
                      Not installed
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Don&apos;t have a wallet?{' '}
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Download MetaMask
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 