"use client";

import { useAuth, AuthButton } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { LiveQueueStats } from "@/components/dashboard/LiveQueueStats";
import { UserStatusCard } from "@/components/dashboard/UserStatusCard";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { BatchHistory } from "@/components/dashboard/BatchHistory";
import { FAQ } from "@/components/dashboard/FAQ";
import { JoinQueueModal } from "@/components/modals/JoinQueueModal";
import { ShippingMetadataModal } from "@/components/modals/ShippingMetadataModal";
import { KitRegistrationModal } from "@/components/modals/KitRegistrationModal";
import { BalancePaymentModal } from "@/components/modals/BalancePaymentModal";
import { DataRevealModal } from "@/components/modals/DataRevealModal";

export default function Home() {
  const {
    isAuthenticated,
    user,
    batchInfo,
    checkingBatch,
    initializeDynamic,
    isDynamicInitialized,
    refreshBatch,
  } = useAuth();

  // Modal state management
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isKitRegistrationModalOpen, setIsKitRegistrationModalOpen] = useState(false);
  const [isBalancePaymentModalOpen, setIsBalancePaymentModalOpen] = useState(false);
  const [isDataRevealModalOpen, setIsDataRevealModalOpen] = useState(false);

  // Initialize Dynamic on component mount
  useEffect(() => {
    if (!isDynamicInitialized) {
      initializeDynamic();
    }
  }, [isDynamicInitialized, initializeDynamic]);

  const walletAddress = (user as any)?.verifiedCredentials?.[0]?.address;

  // Mock data for demo (replace with real API calls)
  const mockCurrentBatch = {
    batchId: 1,
    currentCount: 18,
    maxSize: 24,
    recentJoins: ["0xA1B2...", "0xC3D4...", "0xE5F6..."],
  };

  const mockBatchHistory = [
    {
      id: 1,
      state: "Pending",
      participantCount: 18,
      createdAt: "2025-01-20T10:00:00Z",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Monadic DNA Batcher
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Privacy-preserving DNA testing coordination
              </p>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Marketing Section - Show to everyone */}
        <div className="mb-8">
          <HowItWorks />
        </div>

        {/* Live Queue Stats - Always visible */}
        <LiveQueueStats
          currentCount={mockCurrentBatch.currentCount}
          maxSize={mockCurrentBatch.maxSize}
          batchId={mockCurrentBatch.batchId}
          recentJoins={mockCurrentBatch.recentJoins}
        />

        {/* Authenticated User Content */}
        {isAuthenticated ? (
          <>
            {/* User Status Card */}
            {batchInfo && batchInfo.joined ? (
              <UserStatusCard
                batchId={batchInfo.batchId}
                batchState={batchInfo.batchState}
                depositPaid={batchInfo.depositPaid}
                balancePaid={batchInfo.balancePaid}
                paymentDeadline={
                  batchInfo.batchState === "Active"
                    ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
                    : undefined
                }
                kitRegistered={false}
                resultsAvailable={false}
                onPayBalance={() => setIsBalancePaymentModalOpen(true)}
                onRegisterKit={() => setIsKitRegistrationModalOpen(true)}
                onDownloadResults={() => setIsDataRevealModalOpen(true)}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Not in a batch yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Join the current batch to get started with your DNA testing
                    journey
                  </p>
                  <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors"
                  >
                    Join Current Batch
                  </button>
                </div>
              </div>
            )}

            {/* User Info */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Connected Wallet
              </h3>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Wallet Address</p>
                    <p className="font-mono text-sm font-medium">
                      {walletAddress?.substring(0, 8)}...
                      {walletAddress?.substring(34)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-8 mb-6 text-white text-center">
            <svg
              className="mx-auto h-16 w-16 mb-4 opacity-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h3 className="text-2xl font-bold mb-2">Connect to Get Started</h3>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              Connect your wallet to join a batch, track your progress, and access
              your encrypted DNA results
            </p>
            <p className="text-sm text-blue-200">
              Powered by Dynamic.xyz • Secure wallet authentication
            </p>
          </div>
        )}

        {/* Global Batch History */}
        <div className="mb-8">
          <BatchHistory batches={mockBatchHistory} loading={checkingBatch} />
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h4 className="font-semibold text-lg mb-2">Privacy First</h4>
            <p className="text-sm text-gray-600">
              Your data is encrypted and stored in Nillion&apos;s privacy-preserving
              database. Only you can decrypt it with your PIN.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h4 className="font-semibold text-lg mb-2">Smart Contracts</h4>
            <p className="text-sm text-gray-600">
              Automated batch coordination with built-in fairness guarantees and
              transparent state management.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h4 className="font-semibold text-lg mb-2">Flexible Payments</h4>
            <p className="text-sm text-gray-600">
              Pay with crypto (on-chain) or credit card (Stripe). Split payments:
              10% deposit + 90% balance.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <FAQ />
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              &copy; 2025 Monadic DNA Batcher by Recherché Inc. All rights
              reserved.
            </p>
            <p className="mt-2">
              Built with privacy by design • Powered by Nillion & Dynamic.xyz
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <JoinQueueModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinSuccess={() => {
          refreshBatch();
          setIsShippingModalOpen(true);
        }}
        batchId={mockCurrentBatch.batchId}
        currentCount={mockCurrentBatch.currentCount}
        maxSize={mockCurrentBatch.maxSize}
      />

      <ShippingMetadataModal
        isOpen={isShippingModalOpen}
        onClose={() => setIsShippingModalOpen(false)}
        onSubmitSuccess={() => {
          refreshBatch();
        }}
        batchId={batchInfo?.batchId || mockCurrentBatch.batchId}
      />

      <KitRegistrationModal
        isOpen={isKitRegistrationModalOpen}
        onClose={() => setIsKitRegistrationModalOpen(false)}
        onRegisterSuccess={() => {
          refreshBatch();
        }}
        batchId={batchInfo?.batchId || mockCurrentBatch.batchId}
      />

      <BalancePaymentModal
        isOpen={isBalancePaymentModalOpen}
        onClose={() => setIsBalancePaymentModalOpen(false)}
        onPaymentSuccess={() => {
          refreshBatch();
          setIsShippingModalOpen(true);
        }}
        batchId={batchInfo?.batchId || mockCurrentBatch.batchId}
        paymentDeadline={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)}
      />

      <DataRevealModal
        isOpen={isDataRevealModalOpen}
        onClose={() => setIsDataRevealModalOpen(false)}
        batchId={batchInfo?.batchId || mockCurrentBatch.batchId}
        kitId="KIT-ABC12345"
      />
    </main>
  );
}
