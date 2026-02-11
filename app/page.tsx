"use client";

import { useAuth, AuthButton } from "@/components/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import { UserStatusCard } from "@/components/dashboard/UserStatusCard";
import { BatchHistory } from "@/components/dashboard/BatchHistory";
import { FAQ } from "@/components/dashboard/FAQ";
import { JoinQueueModal } from "@/components/modals/JoinQueueModal";
import { ShippingMetadataModal } from "@/components/modals/ShippingMetadataModal";
import { KitRegistrationModal } from "@/components/modals/KitRegistrationModal";
import { BalancePaymentModal } from "@/components/modals/BalancePaymentModal";
import { DataRevealModal } from "@/components/modals/DataRevealModal";
import { getCurrentBatchId, getBatchInfo, getParticipantInfo, getBatchParticipants } from "@/lib/contract";

// Helper to get block explorer URL
const getExplorerUrl = (address: string): string => {
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "31337";
  const explorerMap: Record<string, string> = {
    "1": "https://etherscan.io",
    "11155111": "https://sepolia.etherscan.io",
    "42161": "https://arbiscan.io",
    "421614": "https://sepolia.arbiscan.io",
    "8453": "https://basescan.org",
    "84532": "https://sepolia.basescan.org",
    "31337": "http://localhost:8545", // Local hardhat - no explorer
  };
  const baseUrl = explorerMap[chainId] || "https://etherscan.io";
  return chainId === "31337" ? "#" : `${baseUrl}/address/${address}`;
};

export default function Home() {
  const {
    isAuthenticated,
    user,
    batchInfo,
    userBatches,
    initializeDynamic,
    isDynamicInitialized,
    refreshBatch,
  } = useAuth();

  // Modal state management
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [selectedUserBatchId, setSelectedUserBatchId] = useState<number | null>(null);
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
    maxBatchSize: number;
  } | null>(null);
  const [userBatchInfo, setUserBatchInfo] = useState<{
    participantCount: number;
    state: number;
    maxBatchSize: number;
  } | null>(null);
  const [participantInfo, setParticipantInfo] = useState<any>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [ensNames, setEnsNames] = useState<Record<string, string>>({});
  const [loadingContractData, setLoadingContractData] = useState(true);
  const [contractError, setContractError] = useState<string | null>(null);
  const [batchHistory, setBatchHistory] = useState<Array<{
    id: number;
    state: string;
    participantCount: number;
    maxBatchSize: number;
    createdAt: string;
    completedAt?: string;
  }>>([]);

  // Fetch current batch data from smart contract
  const fetchBatchData = useCallback(async () => {
      try {
        setLoadingContractData(true);
        const batchId = await getCurrentBatchId();
        setCurrentBatchId(batchId);

        const batchInfo = await getBatchInfo(batchId);
        setCurrentBatchInfo(batchInfo);

        // Fetch historical batches (all batches from 1 to current)
        const history = [];
        const stateNames = ["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"];

        for (let i = 1; i <= batchId; i++) {
          try {
            const batch = await getBatchInfo(i);
            history.push({
              id: i,
              state: stateNames[batch.state],
              participantCount: batch.participantCount,
              maxBatchSize: batch.maxBatchSize,
              createdAt: new Date().toISOString(), // Timestamp not available from contract
              completedAt: batch.state >= 4 ? new Date().toISOString() : undefined,
            });
          } catch (err) {
            console.error(`Failed to fetch batch ${i}:`, err);
          }
        }

        // Reverse to show newest first
        setBatchHistory(history.reverse());

        // Fetch participant addresses
        try {
          const participantAddresses = await getBatchParticipants(batchId);
          setParticipants(participantAddresses);

          // Resolve ENS names for mainnet/sepolia via server-side API
          const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
          if (chainId === "1" || chainId === "11155111") {
            try {
              const response = await fetch("/api/ens/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  addresses: participantAddresses,
                  chainId,
                }),
              });

              if (response.ok) {
                const { ensNames: resolvedNames } = await response.json();
                setEnsNames(resolvedNames);
              }
            } catch (error) {
              console.warn("ENS resolution failed:", error);
              // Non-critical, continue without ENS names
            }
          }
        } catch (err) {
          console.error("Failed to fetch participants:", err);
          setParticipants([]);
        }

        // If user is authenticated, check if they're in ANY batch (not just current)
        if (walletAddress) {
          // Check if userBatches array has any joined batches
          const joinedBatch = userBatches?.find(b => b.joined);
          if (joinedBatch) {
            try {
              // User is in a specific batch - fetch that batch's info
              const userBatch = await getBatchInfo(joinedBatch.batchId);
              setUserBatchInfo(userBatch);

              const participantData = await getParticipantInfo(joinedBatch.batchId, walletAddress);
              setParticipantInfo(participantData);
            } catch (err) {
              console.error("Failed to fetch user's batch info:", err);
            }
          } else {
            // Check current batch
            try {
              const participantData = await getParticipantInfo(batchId, walletAddress);
              setParticipantInfo(participantData);
              setUserBatchInfo(null); // User is in current batch, use currentBatchInfo
            } catch {
              // User might not be a participant yet
              console.log("User not a participant in current batch");
              setParticipantInfo(null);
              setUserBatchInfo(null);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch batch data:", error);

        // Detect specific error types and provide helpful messages
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (errorMsg.includes("could not decode result data") || errorMsg.includes("BAD_DATA")) {
          setContractError(
            "Smart contract not deployed or address is incorrect. " +
            "Please deploy the contract with: npx hardhat run scripts/deploy.ts --network localhost"
          );
        } else if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("fetch failed")) {
          setContractError(
            "Cannot connect to blockchain node. " +
            "Please start Hardhat node: npx hardhat node"
          );
        } else if (errorMsg.includes("Contract address not configured")) {
          setContractError(
            "Contract address not configured. " +
            "Please set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local"
          );
        } else {
          setContractError(`Failed to load batch data: ${errorMsg}`);
        }
      } finally {
        setLoadingContractData(false);
      }
  }, [walletAddress]);

  // Call fetchBatchData when initialized
  useEffect(() => {
    if (isDynamicInitialized) {
      fetchBatchData();
    }
  }, [isDynamicInitialized, fetchBatchData]);

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
        {/* Contract Error Banner */}
        {contractError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-800">Contract Connection Error</h3>
                <div className="mt-1 text-sm text-red-700">
                  <p>{contractError}</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setContractError(null);
                      window.location.reload();
                    }}
                    className="text-sm font-medium text-red-700 hover:text-red-600 underline"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
              <button
                onClick={() => setContractError(null)}
                className="ml-3 flex-shrink-0 text-red-500 hover:text-red-700"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
                    <span className="text-sm text-gray-600">
                      Batch #{batchInfo?.joined ? batchInfo.batchId : currentBatchId}
                    </span>
                    <span className="font-bold text-blue-600">
                      {userBatchInfo
                        ? `${userBatchInfo.participantCount}/${userBatchInfo.maxBatchSize}`
                        : `${currentBatchInfo.participantCount}/${currentBatchInfo.maxBatchSize}`
                      }
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{
                        width: userBatchInfo
                          ? `${(userBatchInfo.participantCount / userBatchInfo.maxBatchSize) * 100}%`
                          : `${(currentBatchInfo.participantCount / currentBatchInfo.maxBatchSize) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    State: {["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"][currentBatchInfo.state]}
                  </p>
                  {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS && process.env.NEXT_PUBLIC_CHAIN_ID !== "31337" && (
                    <a
                      href={getExplorerUrl(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-2"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Contract on Explorer
                    </a>
                  )}
                </div>

                {/* Participant List */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Participants ({currentBatchInfo.participantCount})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {participants.length > 0 ? (
                      <div className="space-y-2 text-xs">
                        {participants.map((address, idx) => {
                          const explorerUrl = getExplorerUrl(address);
                          const ensName = ensNames[address];
                          const isLocalhost = process.env.NEXT_PUBLIC_CHAIN_ID === "31337";

                          return (
                            <div key={address} className="flex items-start gap-2 py-1 border-b border-gray-200 last:border-0">
                              <span className="text-gray-500 font-medium min-w-[30px]">#{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                {ensName && (
                                  <div className="text-blue-600 font-semibold mb-0.5">
                                    {ensName}
                                  </div>
                                )}
                                <div className="font-mono text-gray-700 break-all">
                                  {isLocalhost ? (
                                    <span title={address}>{address}</span>
                                  ) : (
                                    <a
                                      href={explorerUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-blue-600 hover:underline"
                                      title="View on block explorer"
                                    >
                                      {address}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        {currentBatchInfo.participantCount > 0 ? "Loading participants..." : "No participants yet"}
                      </p>
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
            ) : contractError ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm">Unable to load batch information</p>
                  <p className="text-xs mt-1">See error message above</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
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
                {userBatches.length > 0 ? (
                  <>
                    {/* Batch Selector Dropdown (if multiple batches) */}
                    {userBatches.length > 1 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Batch
                        </label>
                        <select
                          value={selectedUserBatchId || userBatches[0].batchId}
                          onChange={(e) => setSelectedUserBatchId(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {userBatches.map((batch) => (
                            <option key={batch.batchId} value={batch.batchId}>
                              Batch #{batch.batchId} - {batch.batchState}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Display selected batch info */}
                    {(() => {
                      const displayBatch = userBatches.find(
                        (b) => b.batchId === (selectedUserBatchId || userBatches[0].batchId)
                      ) || userBatches[0];

                      return (
                        <UserStatusCard
                          batchId={displayBatch.batchId}
                          batchState={displayBatch.batchState}
                          depositPaid={displayBatch.depositPaid}
                          balancePaid={displayBatch.balancePaid}
                          paymentDeadline={
                            displayBatch.batchState === "Active"
                              ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
                              : undefined
                          }
                          kitRegistered={false}
                          resultsAvailable={false}
                          onPayBalance={() => setIsBalancePaymentModalOpen(true)}
                          onRegisterKit={() => setIsKitRegistrationModalOpen(true)}
                          onDownloadResults={() => setIsDataRevealModalOpen(true)}
                        />
                      );
                    })()}
                  </>
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
              batches={batchHistory}
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
              fetchBatchData(); // Refresh batch data after joining
              setIsShippingModalOpen(true);
            }}
            batchId={currentBatchId}
            currentCount={currentBatchInfo.participantCount}
            maxSize={currentBatchInfo.maxBatchSize}
          />

          <ShippingMetadataModal
            isOpen={isShippingModalOpen}
            onClose={() => setIsShippingModalOpen(false)}
            onSubmitSuccess={() => {
              refreshBatch();
              fetchBatchData();
            }}
            batchId={batchInfo?.batchId || currentBatchId}
          />

          <KitRegistrationModal
            isOpen={isKitRegistrationModalOpen}
            onClose={() => setIsKitRegistrationModalOpen(false)}
            onRegisterSuccess={() => {
              refreshBatch();
              fetchBatchData();
            }}
            batchId={batchInfo?.batchId || currentBatchId}
          />

          <BalancePaymentModal
            isOpen={isBalancePaymentModalOpen}
            onClose={() => setIsBalancePaymentModalOpen(false)}
            onPaymentSuccess={() => {
              refreshBatch();
              fetchBatchData();
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
