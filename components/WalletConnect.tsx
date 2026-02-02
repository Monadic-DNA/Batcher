"use client";

import { useState, useEffect } from "react";

interface WalletOption {
  name: string;
  icon: string;
  provider: any;
  detected: boolean;
}

interface WalletConnectProps {
  onConnect: (address: string) => void;
  onError: (error: string) => void;
}

export function WalletConnect({ onConnect, onError }: WalletConnectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wallets, setWallets] = useState<WalletOption[]>([]);

  useEffect(() => {
    detectWallets();
  }, []);

  const detectWallets = () => {
    const detectedWallets: WalletOption[] = [];

    // Check for MetaMask
    if (typeof window.ethereum !== "undefined") {
      if (window.ethereum.isMetaMask) {
        detectedWallets.push({
          name: "MetaMask",
          icon: "🦊",
          provider: window.ethereum,
          detected: true,
        });
      }

      // Check for Coinbase Wallet
      if (window.ethereum.isCoinbaseWallet) {
        detectedWallets.push({
          name: "Coinbase Wallet",
          icon: "🔵",
          provider: window.ethereum,
          detected: true,
        });
      }

      // Check for Brave Wallet
      if (window.ethereum.isBraveWallet) {
        detectedWallets.push({
          name: "Brave Wallet",
          icon: "🦁",
          provider: window.ethereum,
          detected: true,
        });
      }

      // Check for Rabby Wallet
      if (window.ethereum.isRabby) {
        detectedWallets.push({
          name: "Rabby Wallet",
          icon: "🐰",
          provider: window.ethereum,
          detected: true,
        });
      }

      // Generic Ethereum provider if no specific wallet detected
      if (detectedWallets.length === 0) {
        detectedWallets.push({
          name: "Browser Wallet",
          icon: "👛",
          provider: window.ethereum,
          detected: true,
        });
      }
    }

    // Check for injected providers array (EIP-6963)
    if (typeof window !== "undefined" && (window as any).ethereum?.providers) {
      const providers = (window as any).ethereum.providers;
      providers.forEach((provider: any) => {
        if (provider.isMetaMask && !detectedWallets.some(w => w.name === "MetaMask")) {
          detectedWallets.push({
            name: "MetaMask",
            icon: "🦊",
            provider,
            detected: true,
          });
        }
        if (provider.isCoinbaseWallet && !detectedWallets.some(w => w.name === "Coinbase Wallet")) {
          detectedWallets.push({
            name: "Coinbase Wallet",
            icon: "🔵",
            provider,
            detected: true,
          });
        }
      });
    }

    setWallets(detectedWallets);
  };

  const connectWallet = async (wallet: WalletOption) => {
    setIsConnecting(true);
    try {
      const accounts = await wallet.provider.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        onConnect(accounts[0]);
        setIsOpen(false);
      }
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      onError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  if (wallets.length === 0) {
    return (
      <div className="text-center">
        <p className="text-red-600 mb-4">
          No Ethereum wallet detected. Please install MetaMask or another Web3 wallet.
        </p>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          Install MetaMask
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    );
  }

  if (wallets.length === 1) {
    // Only one wallet, connect directly
    return (
      <button
        onClick={() => connectWallet(wallets[0])}
        disabled={isConnecting}
        className="px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-2 mx-auto"
      >
        <span className="text-2xl">{wallets[0].icon}</span>
        {isConnecting ? "Connecting..." : `Connect with ${wallets[0].name}`}
      </button>
    );
  }

  // Multiple wallets, show selector
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        Connect Wallet
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Select Wallet</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                {wallets.map((wallet, idx) => (
                  <button
                    key={idx}
                    onClick={() => connectWallet(wallet)}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-3xl">{wallet.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900">{wallet.name}</div>
                      <div className="text-xs text-gray-500">
                        {wallet.detected ? "Detected" : "Not installed"}
                      </div>
                    </div>
                    {isConnecting && (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-xs text-gray-500 text-center">
                Make sure you&apos;re connected to Hardhat Local (Chain ID: 31337)
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
