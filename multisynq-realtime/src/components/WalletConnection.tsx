'use client';

import React, { useState, useEffect } from 'react';
import { WalletState, MONAD_TESTNET } from '@/types/multisynq';
import WalletSelector from './WalletSelector';

interface WalletConnectionProps {
  onConnect: (address: string) => void;
  onDisconnect: () => void;
}

export default function WalletConnection({ onConnect, onDisconnect }: WalletConnectionProps) {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false
  });
  const [connectionStep, setConnectionStep] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    if (typeof window === 'undefined') return false;
    
    try {
      return typeof window.ethereum !== 'undefined' && 
             window.ethereum !== null && 
             typeof window.ethereum.request === 'function' &&
             window.ethereum.isMetaMask;
    } catch (error) {
      console.warn('Error checking MetaMask provider:', error);
      return false;
    }
  };

  // Check if Phantom is installed
  const isPhantomInstalled = () => {
    if (typeof window === 'undefined') return false;
    
    try {
      return typeof window.ethereum !== 'undefined' && 
             window.ethereum !== null && 
             typeof window.ethereum.request === 'function' &&
             window.ethereum.isPhantom;
    } catch (error) {
      console.warn('Error checking Phantom provider:', error);
      return false;
    }
  };

  // Check if any EVM wallet is installed
  const isAnyWalletInstalled = () => {
    return isMetaMaskInstalled() || isPhantomInstalled();
  };

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Connect to Monad Testnet
  const connectWallet = async (walletType?: 'metamask' | 'phantom') => {
    // If no wallet type specified, check what's available
    if (!walletType) {
      const metamaskInstalled = isMetaMaskInstalled();
      const phantomInstalled = isPhantomInstalled();
      
      // If only one wallet is installed, use it directly
      if (metamaskInstalled && !phantomInstalled) {
        await connectWallet('metamask');
        return;
      } else if (phantomInstalled && !metamaskInstalled) {
        await connectWallet('phantom');
        return;
      } else if (metamaskInstalled && phantomInstalled) {
        // Both installed, show selector
        setShowWalletSelector(true);
        return;
      } else {
        // No wallet installed, show selector anyway
        setShowWalletSelector(true);
        return;
      }
    }

    // Check if the specific wallet is installed
    const isWalletInstalled = walletType === 'metamask' ? isMetaMaskInstalled() : isPhantomInstalled();
    
    if (!isWalletInstalled) {
      const walletName = walletType === 'metamask' ? 'MetaMask' : 'Phantom';
      setWalletState(prev => ({ 
        ...prev, 
        error: `${walletName} is not installed. Please install ${walletName} to continue.` 
      }));
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, error: undefined }));
    setConnectionStep('Connecting to wallet...');

    try {
      if (!window.ethereum || typeof window.ethereum.request !== 'function') {
        throw new Error('Ethereum provider not available');
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your MetaMask wallet.');
      }

      const address = accounts[0];

      // Get current chain ID
      const chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });

      const numericChainId = parseInt(chainId, 16);

      // Switch to Monad Testnet if needed
      if (numericChainId !== MONAD_TESTNET.id) {
        setConnectionStep('Switching to Monad Testnet...');
        console.log(`🔄 Switching from chain ${numericChainId} to Monad Testnet (${MONAD_TESTNET.id})`);
        
        try {
          // First try to switch to the chain
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${MONAD_TESTNET.id.toString(16)}` }],
          });
          console.log('✅ Successfully switched to Monad Testnet');
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
         } catch (switchError: any) {
           console.log('⚠️ Chain switch failed, attempting to add chain...');
           
           // Chain not added to wallet, add it
           if (switchError.code === 4902) {
            setConnectionStep('Adding Monad Testnet to wallet...');
            try {
              console.log('➕ Adding Monad Testnet to wallet...');
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${MONAD_TESTNET.id.toString(16)}`,
                  chainName: MONAD_TESTNET.name,
                  nativeCurrency: MONAD_TESTNET.nativeCurrency,
                  rpcUrls: MONAD_TESTNET.rpcUrls.default.http,
                  blockExplorerUrls: [MONAD_TESTNET.blockExplorers.default.url],
                }],
              });
              console.log('✅ Successfully added Monad Testnet to wallet');
            } catch (addError) {
              console.error('❌ Failed to add Monad Testnet:', addError);
              throw new Error('Failed to add Monad Testnet to your wallet. Please add it manually.');
            }
          } else {
            console.error('❌ Chain switch error:', switchError);
            throw new Error(`Failed to switch to Monad Testnet: ${switchError.message}`);
          }
        }
      } else {
        console.log('✅ Already on Monad Testnet');
      }

      setConnectionStep('Connected successfully!');
      
      setWalletState({
        isConnected: true,
        address,
        chainId: MONAD_TESTNET.id,
        isConnecting: false
      });

      onConnect(address);

         // eslint-disable-next-line @typescript-eslint/no-explicit-any
     } catch (error: any) {
       console.error('Wallet connection failed:', error);
       setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet'
      }));
      setConnectionStep('');
    }
  };

  // Handle wallet selection
  const handleWalletSelection = async (walletType: 'metamask' | 'phantom') => {
    setShowWalletSelector(false);
    await connectWallet(walletType);
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      isConnecting: false
    });
    setConnectionStep('');
    onDisconnect();
  };

  // Listen for account changes
  useEffect(() => {
    if (!isAnyWalletInstalled()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (walletState.isConnected && accounts[0] !== walletState.address) {
        // Account changed, update state
        setWalletState(prev => ({ ...prev, address: accounts[0] }));
        onConnect(accounts[0]);
      }
    };

    const handleChainChanged = (chainId: string) => {
      const numericChainId = parseInt(chainId, 16);
      setWalletState(prev => ({ ...prev, chainId: numericChainId }));
      
      if (numericChainId !== MONAD_TESTNET.id && walletState.isConnected) {
        setWalletState(prev => ({
          ...prev,
          error: `Please switch to ${MONAD_TESTNET.name} (Chain ID: ${MONAD_TESTNET.id})`
        }));
      }
    };

    try {
      if (window.ethereum && typeof window.ethereum.on === 'function') {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
      }

      return () => {
        if (window.ethereum && typeof window.ethereum.removeListener === 'function') {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    } catch (error) {
      console.warn('Error setting up ethereum listeners:', error);
      return () => {};
    }
  }, [walletState.isConnected, walletState.address]);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!isAnyWalletInstalled()) return;

      try {
        if (!window.ethereum || typeof window.ethereum.request !== 'function') {
          console.warn('Ethereum provider not available');
          return;
        }

        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });

        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ 
            method: 'eth_chainId' 
          });
          const numericChainId = parseInt(chainId, 16);

          setWalletState({
            isConnected: true,
            address: accounts[0],
            chainId: numericChainId,
            isConnecting: false
          });

          onConnect(accounts[0]);
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
      }
    };

    // Delay the check to ensure window.ethereum is available
    const timer = setTimeout(checkConnection, 100);
    return () => clearTimeout(timer);
  }, []);

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="bg-[#FBFAF9] rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#0E100F]">
            Wallet Connection
          </h3>
          <p className="text-sm text-[#0E100F] mt-1">
            Connect to Monad Testnet to join the session
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {!isClient ? (
            <div className="text-center">
              <div className="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg font-medium">
                Loading...
              </div>
            </div>
          ) : !isAnyWalletInstalled() ? (
            <div className="text-center">
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#836EF9] hover:bg-[#7A5FF0] text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Install MetaMask
              </a>
              <p className="text-xs text-[#0E100F] mt-1">Required for wallet connection</p>
            </div>
          ) : walletState.isConnected ? (
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-[#0E100F]">
                  {formatAddress(walletState.address!)}
                </span>
              </div>
              <div className="text-xs text-[#0E100F] mb-2">
                Chain: {walletState.chainId === MONAD_TESTNET.id ? MONAD_TESTNET.name : `Unknown (${walletState.chainId})`}
              </div>
              <button
                onClick={disconnectWallet}
                className="bg-[#836EF9] hover:bg-[#7A5FF0] text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={() => connectWallet()}
                disabled={walletState.isConnecting}
                className="bg-[#836EF9] hover:bg-[#7A5FF0] disabled:bg-[#A89CFA] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {walletState.isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect Wallet</span>
                )}
              </button>
              
              {connectionStep && (
                <div className="mt-2 text-xs text-[#836EF9] font-medium">
                  {connectionStep}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {walletState.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{walletState.error}</p>
        </div>
      )}

      {/* Chain Warning */}
      {walletState.isConnected && walletState.chainId !== MONAD_TESTNET.id && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            ⚠️ Please switch to {MONAD_TESTNET.name} to use this application.
          </p>
          <button
            onClick={() => connectWallet()}
            className="mt-2 bg-[#836EF9] hover:bg-[#7A5FF0] text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Switch Network
          </button>
        </div>
      )}

      {/* Success Message */}
      {walletState.isConnected && walletState.chainId === MONAD_TESTNET.id && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            ✅ Successfully connected to {MONAD_TESTNET.name}
          </p>
        </div>
      )}

      {/* Wallet Selector Modal */}
      <WalletSelector
        isOpen={showWalletSelector}
        onClose={() => setShowWalletSelector(false)}
        onSelectWallet={handleWalletSelection}
      />
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

// Prevent multiple declarations
export {}; 