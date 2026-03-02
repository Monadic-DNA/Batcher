"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ethers } from "ethers";
import { reclaimDeposit } from "@/lib/contract";

interface ReclaimDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReclaimSuccess: () => void;
  batchId: number;
  depositAmount: number;
  joinedAt: number;
  depositReclaimWindow: number;
}

export function ReclaimDepositModal({
  isOpen,
  onClose,
  onReclaimSuccess,
  batchId,
  depositAmount,
  joinedAt,
  depositReclaimWindow,
}: ReclaimDepositModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { primaryWallet } = useDynamicContext();

  const handleReclaim = async () => {
    setProcessing(true);
    setError(null);
    try {
      if (!primaryWallet) {
        throw new Error("Wallet not connected");
      }

      const walletConnector = await primaryWallet.connector;
      if (!walletConnector) {
        throw new Error("Wallet connector not available");
      }

      const provider = (walletConnector as any).getWalletClient();
      if (!provider) {
        throw new Error("Provider not available");
      }

      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();

      console.log("Reclaiming deposit for batch:", batchId);
      const receipt = await reclaimDeposit(batchId, signer);
      console.log("Deposit reclaimed successfully:", receipt);

      onReclaimSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to reclaim deposit:", err);

      if (err.message?.includes("Reclaim window has not passed yet")) {
        setError("The reclaim window has not passed yet. Please wait longer.");
      } else if (err.message?.includes("Can only reclaim deposit from Pending batch")) {
        setError("You can only reclaim deposits from batches in Pending state.");
      } else if (err.message?.includes("Not a participant")) {
        setError("You are not a participant in this batch.");
      } else if (err.message?.includes("user rejected")) {
        setError("Transaction was cancelled.");
      } else {
        setError(err.message || "Failed to reclaim deposit. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const daysWaited = Math.floor((Date.now() / 1000 - joinedAt) / 86400);
  const daysRequired = Math.floor(depositReclaimWindow / 86400);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Reclaim Deposit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={processing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">Important Notice</h3>
                <p className="text-amber-800 text-xs mt-1">
                  By reclaiming your deposit, you will be removed from this batch and will need to join a new batch if you wish to continue.
                </p>
              </div>
            </div>
          </div>

          {/* Batch Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Batch ID:</span>
              <span className="font-semibold text-gray-900">#{batchId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Deposit Amount:</span>
              <span className="font-semibold text-gray-900">${depositAmount.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Days Waited:</span>
              <span className="font-semibold text-gray-900">{daysWaited} / {daysRequired} days</span>
            </div>
          </div>

          {/* Explanation */}
          <div className="text-sm text-gray-600">
            <p>
              This batch has been in pending state for {daysWaited} days, exceeding the {daysRequired}-day reclaim window.
              You can now reclaim your full deposit of <strong>${depositAmount.toFixed(2)} USDC</strong>.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleReclaim}
            disabled={processing}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? "Processing..." : "Reclaim Deposit"}
          </button>
        </div>
      </div>
    </div>
  );
}
