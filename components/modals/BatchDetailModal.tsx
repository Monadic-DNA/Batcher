"use client";

import { useEffect, useState } from "react";
import { getBatchParticipants } from "@/lib/contract";

interface BatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: number;
  state: string;
  participantCount: number;
  maxBatchSize: number;
  createdAt: string;
  completedAt?: string;
}

export function BatchDetailModal({
  isOpen,
  onClose,
  batchId,
  state,
  participantCount,
  maxBatchSize,
  createdAt,
  completedAt,
}: BatchDetailModalProps) {
  const [participants, setParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
    }
  }, [isOpen, batchId]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const addresses = await getBatchParticipants(batchId);
      setParticipants(addresses);
    } catch (error) {
      console.error("Failed to fetch participants:", error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "sequencing":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-yellow-100 text-yellow-800";
      case "staged":
        return "bg-purple-100 text-purple-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "purged":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getExplorerUrl = (address: string): string => {
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "31337";
    const explorerMap: Record<string, string> = {
      "1": "https://etherscan.io",
      "11155111": "https://sepolia.etherscan.io",
      "42161": "https://arbiscan.io",
      "421614": "https://sepolia.arbiscan.io",
      "8453": "https://basescan.org",
      "84532": "https://sepolia.basescan.org",
      "31337": "http://localhost:8545",
    };
    const baseUrl = explorerMap[chainId] || "https://etherscan.io";
    return chainId === "31337" ? "#" : `${baseUrl}/address/${address}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Batch #{batchId}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded-full ${getStateColor(state)}`}
                  >
                    {state}
                  </span>
                  <span className="text-sm text-gray-500">
                    {participantCount}/{maxBatchSize} participants
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Batch Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Batch Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(createdAt).toLocaleString()}
                  </span>
                </div>
                {completedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Completed:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Participant Count:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {participantCount} / {maxBatchSize}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Progress:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(participantCount / maxBatchSize) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round((participantCount / maxBatchSize) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Participants List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Participants ({participants.length})
              </h3>
              {loading ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <svg className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-sm text-gray-500">Loading participants...</p>
                </div>
              ) : participants.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {participants.map((address, idx) => {
                      const explorerUrl = getExplorerUrl(address);
                      const isLocalhost = process.env.NEXT_PUBLIC_CHAIN_ID === "31337";

                      return (
                        <div
                          key={address}
                          className="flex items-center gap-3 py-2 px-3 bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-500 min-w-[40px]">
                            #{idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm text-gray-700 break-all">
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
                          {!isLocalhost && (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                              title="View on block explorer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm text-gray-500">No participants yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
