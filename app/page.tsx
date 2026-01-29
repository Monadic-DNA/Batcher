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
import { getCurrentBatchId, getBatchInfo, getParticipantInfo } from "@/lib/contract";

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

  // State for smart contract data
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  const [currentBatchInfo, setCurrentBatchInfo] = useState<{
    participantCount: number;
    state: number;
  } | null>(null);
  const [participantInfo, setParticipantInfo] = useState<any>(null);
  const [loadingContractData, setLoadingContractData] = useState(true);

  // Fetch current batch data from smart contract
  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        setLoadingContractData(true);
        const batchId = await getCurrentBatchId();
        setCurrentBatchId(batchId);

        const batchInfo = await getBatchInfo(batchId);
        setCurrentBatchInfo(batchInfo);

        // If user is authenticated, fetch their participant info
        if (walletAddress && batchInfo) {
          try {
            const participantData = await getParticipantInfo(batchId, walletAddress);
            setParticipantInfo(participantData);
          } catch (err) {
            // User might not be a participant yet
            console.log("User not a participant in current batch");
            setParticipantInfo(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch batch data:", error);
      } finally {
        setLoadingContractData(false);
      }
    };

    if (isDynamicInitialized) {
      fetchBatchData();
    }
  }, [isDynamicInitialized, walletAddress]);

  const MAX_BATCH_SIZE = 24;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <a
                href="https://monadicdna.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <img
                  src="/monadicdna-logo.png"
                  alt="Monadic DNA"
                  className="h-10 sm:h-12 w-auto"
                />
              </a>
              <div className="border-l-2 border-gray-300 pl-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Batcher
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Sequence your DNA privately and anonymously
                </p>
              </div>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Above the Fold - 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Column 1: Current Batch Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Current Batch</h2>
              <button
                onClick={() => {
                  const batchHistorySection = document.getElementById('batch-history-section');
                  batchHistorySection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View History →
              </button>
            </div>
            {currentBatchId && currentBatchInfo ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Batch #{currentBatchId}</span>
                    <span className="font-bold text-blue-600">
                      {currentBatchInfo.participantCount}/{MAX_BATCH_SIZE}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${(currentBatchInfo.participantCount / MAX_BATCH_SIZE) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    State: {["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"][currentBatchInfo.state]}
                  </p>
                </div>

                {/* Participant List */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Participants ({currentBatchInfo.participantCount})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {currentBatchInfo.participantCount > 0 ? (
                      <div className="space-y-1 text-xs font-mono text-gray-600">
                        {/* TODO: Fetch actual participant addresses from events or API */}
                        <p className="text-gray-400 italic">
                          Participant addresses will appear here
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No participants yet</p>
                    )}
                  </div>
                </div>

                {/* Batch Navigation */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (currentBatchId > 1) {
                        // TODO: Navigate to previous batch
                        console.log("Previous batch");
                      }
                    }}
                    disabled={currentBatchId <= 1}
                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium text-gray-700"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Navigate to next batch (if exists)
                      console.log("Next batch");
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700"
                  >
                    Next →
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Loading batch info...</p>
              </div>
            )}
          </div>

          {/* Column 2: How It Works */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Join & Deposit</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Pay 10% deposit to join the current batch
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Wait for Batch</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Batch activates when 24 participants join
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Pay Balance</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Complete payment (90%) within 7 days
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Register Kit</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Receive kit, register with secure PIN
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Lab Processing</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Send sample, lab processes batch (2-4 weeks)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  6
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Get Results</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Download encrypted DNA data with PIN
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Privacy-first • Encrypted</span>
                </div>
                <button
                  onClick={() => {
                    const faqSection = document.getElementById('faq-section');
                    faqSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Learn more →
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: User-Specific Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Actions</h2>
            {isAuthenticated ? (
              <>
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
                    <p className="text-gray-600 mb-6 text-sm">
                      Join the current batch to get started
                    </p>
                    <button
                      onClick={() => setIsJoinModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors w-full"
                    >
                      Join Current Batch
                    </button>
                  </div>
                )}

                {/* User Wallet Info */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-white"
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
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600">Your Wallet</p>
                      <p className="font-mono text-xs font-medium truncate">
                        {walletAddress?.substring(0, 8)}...{walletAddress?.substring(38)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-blue-600 mb-4"
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
                <h3 className="text-lg font-bold mb-2">Sign In to Join</h3>
                <p className="text-gray-600 text-sm">
                  Secure authentication powered by Dynamic
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Logo */}
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-20">
          <img
            src="/batcher.png"
            alt="Monadic DNA Batcher"
            className="h-32 sm:h-48 lg:h-96 w-auto object-contain drop-shadow-2xl"
          />
        </div>

        {/* Below the Fold */}
        <div className="space-y-8 mt-8">
          {/* Global Batch History - Moved up for actionability */}
          <div id="batch-history-section">
            <BatchHistory
              batches={[]} // TODO: Fetch historical batches from events or API
              loading={loadingContractData}
            />
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              Your data is encrypted and stored securely using Nillion&apos;s privacy technology.
              Only you can decrypt it with your PIN.
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
            <h4 className="font-semibold text-lg mb-2">Fair Coordination</h4>
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
              Pay with your credit card or preferred digital payment method. Split payments:
              10% deposit + 90% balance.
            </p>
          </div>
          </div>

          {/* FAQ Section */}
          <div id="faq-section">
            <FAQ />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} Monadic DNA Batcher by Recherché Inc. All rights
              reserved.
            </p>
            <p className="mt-2">
              Built with privacy by design • Powered by Nillion
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {currentBatchId && currentBatchInfo && (
        <>
          <JoinQueueModal
            isOpen={isJoinModalOpen}
            onClose={() => setIsJoinModalOpen(false)}
            onJoinSuccess={() => {
              refreshBatch();
              setIsShippingModalOpen(true);
            }}
            batchId={currentBatchId}
            currentCount={currentBatchInfo.participantCount}
            maxSize={MAX_BATCH_SIZE}
          />

          <ShippingMetadataModal
            isOpen={isShippingModalOpen}
            onClose={() => setIsShippingModalOpen(false)}
            onSubmitSuccess={() => {
              refreshBatch();
            }}
            batchId={batchInfo?.batchId || currentBatchId}
          />

          <KitRegistrationModal
            isOpen={isKitRegistrationModalOpen}
            onClose={() => setIsKitRegistrationModalOpen(false)}
            onRegisterSuccess={() => {
              refreshBatch();
            }}
            batchId={batchInfo?.batchId || currentBatchId}
          />

          <BalancePaymentModal
            isOpen={isBalancePaymentModalOpen}
            onClose={() => setIsBalancePaymentModalOpen(false)}
            onPaymentSuccess={() => {
              refreshBatch();
              setIsShippingModalOpen(true);
            }}
            batchId={batchInfo?.batchId || currentBatchId}
            paymentDeadline={
              participantInfo?.paymentDeadline
                ? new Date(participantInfo.paymentDeadline * 1000)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          />

          <DataRevealModal
            isOpen={isDataRevealModalOpen}
            onClose={() => setIsDataRevealModalOpen(false)}
            batchId={batchInfo?.batchId || currentBatchId}
            kitId="KIT-ABC12345"
          />
        </>
      )}
    </main>
  );
}
