"use client";

import { useAuth, AuthButton } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { Shield, AlertTriangle } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, initializeDynamic, isDynamicInitialized } =
    useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isDynamicInitialized) {
      initializeDynamic();
    }
  }, [isDynamicInitialized, initializeDynamic]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isAuthenticated || !user) {
        setIsAuthorized(false);
        setChecking(false);
        return;
      }

      try {
        const walletAddress = (user as any)?.verifiedCredentials?.[0]?.address;

        // TODO: Check if wallet is admin via smart contract or API
        // For now, hardcode admin addresses for testing
        const ADMIN_ADDRESSES = [
          "0x...", // Replace with actual admin addresses
        ];

        // In production, verify with smart contract:
        // const contract = getContract();
        // const isAdmin = await contract.isAdmin(walletAddress);

        const isAdmin = ADMIN_ADDRESSES.some(
          (addr) => addr.toLowerCase() === walletAddress?.toLowerCase()
        );

        setIsAuthorized(isAdmin);
      } catch (error) {
        console.error("Error checking admin access:", error);
        setIsAuthorized(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdminAccess();
  }, [isAuthenticated, user]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Admin Access Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to access the admin panel.
          </p>
          <AuthButton />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            Your wallet does not have administrator privileges.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Go to Home
            </button>
            <AuthButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Admin Panel
                </h1>
                <p className="text-sm text-indigo-100">
                  Monadic DNA Batcher Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => (window.location.href = "/")}
                className="text-sm text-indigo-100 hover:text-white transition-colors"
              >
                ← Back to App
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Secure Admin Access • Recherché Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
