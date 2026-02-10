"use client";

import { useState, useEffect } from "react";
import { X, Wallet } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ethers } from "ethers";
import { joinBatch, getFullPrice, approveUsdcSpending, getUsdcAllowance, getDepositPercentage, getBalancePercentage } from "@/lib/contract";

interface JoinQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: () => void;
  batchId: number;
  currentCount: number;
  maxSize: number;
}

export function JoinQueueModal({
  isOpen,
  onClose,
  onJoinSuccess,
  batchId,
  currentCount,
  maxSize,
}: JoinQueueModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(true);
  const [pricing, setPricing] = useState<{ deposit: number; total: number; depositPercent: number; balancePercent: number } | null>(null);

  const { primaryWallet } = useDynamicContext();

  // Fetch pricing from smart contract
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const fullPrice = await getFullPrice();
        const depositPercent = await getDepositPercentage();
        const balancePercent = await getBalancePercentage();

        // USDC has 6 decimals
        const fullPriceInUsdc = Number(fullPrice) / 1e6;
        setPricing({
          deposit: fullPriceInUsdc * (depositPercent / 100),
          total: fullPriceInUsdc,
          depositPercent,
          balancePercent,
        });
      } catch (err) {
        console.error("Failed to fetch pricing:", err);
        // Fallback to default values
        setPricing({ deposit: 10, total: 100, depositPercent: 10, balancePercent: 90 });
      }
    };

    if (isOpen) {
      fetchPricing();
    }
  }, [isOpen]);

  // Check if USDC approval is needed
  useEffect(() => {
    const checkApproval = async () => {
      if (!primaryWallet || !pricing) return;

      try {
        const address = primaryWallet.address;
        const allowance = await getUsdcAllowance(address);
        const depositAmount = BigInt(Math.floor(pricing.deposit * 1e6));

        setNeedsApproval(allowance < depositAmount);
      } catch (err) {
        console.error("Failed to check USDC allowance:", err);
      }
    };

    if (isOpen && primaryWallet && pricing) {
      checkApproval();
    }
  }, [isOpen, primaryWallet, pricing]);

  const handleApprove = async () => {
    setProcessing(true);
    setError(null);
    try {
      if (!primaryWallet || !pricing) {
        throw new Error("Wallet not connected or pricing not loaded");
      }

      const walletConnector = await primaryWallet.connector;
      if (!walletConnector) {
        throw new Error("Wallet connector not available");
      }

      const provider = await walletConnector.getWalletClient();
      if (!provider) {
        throw new Error("Provider not available");
      }

      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();

      // Approve a large amount for convenience (or just the deposit amount)
      const approvalAmount = BigInt(Math.floor(pricing.total * 1e6)); // Approve full price

      console.log("Approving USDC spending:", pricing.total, "USDC");
      const receipt = await approveUsdcSpending(approvalAmount, signer);
      console.log("Approval successful:", receipt.transactionHash);

      setNeedsApproval(false);
    } catch (err) {
      console.error("Approval error:", err);
      setError(
        err instanceof Error ? err.message : "USDC approval failed. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleJoin = async () => {
    setProcessing(true);
    setError(null);
    try {
      if (!primaryWallet) {
        throw new Error("Please connect your wallet first");
      }

      const walletConnector = await primaryWallet.connector;
      if (!walletConnector) {
        throw new Error("Wallet connector not available");
      }

      const provider = await walletConnector.getWalletClient();
      if (!provider) {
        throw new Error("Provider not available");
      }

      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();

      console.log("Joining batch with USDC deposit:", pricing?.deposit, "USDC");

      const receipt = await joinBatch(signer);
      console.log("Transaction successful:", receipt.transactionHash);

      onJoinSuccess();
      onClose();
    } catch (err) {
      console.error("Join batch error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to join batch. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Join Batch #{batchId}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={processing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Batch Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Current Participants</span>
              <span className="font-bold text-blue-600">
                {currentCount}/{maxSize}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(currentCount / maxSize) * 100}%` }}
              />
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Pricing (USDC)</h3>
            {pricing ? (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-medium">{pricing.total.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Deposit (Now - {pricing.depositPercent}%)</span>
                  <span className="font-bold text-blue-600">
                    {pricing.deposit.toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance (Later - {pricing.balancePercent}%)</span>
                  <span className="font-medium">
                    {(pricing.total - pricing.deposit).toFixed(2)} USDC
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
                Loading pricing...
              </div>
            )}
            <p className="text-xs text-gray-500">
              Pay {pricing?.depositPercent}% deposit now to join. You&apos;ll pay the remaining {pricing?.balancePercent}% when the
              batch becomes active (within 7 days).
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {needsApproval ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Step 1 of 2:</strong> Approve USDC spending to allow the contract to transfer tokens.
                  </p>
                </div>
                <button
                  onClick={handleApprove}
                  disabled={processing || !pricing}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  {processing ? "Approving..." : "Approve USDC"}
                </button>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Step 2 of 2:</strong> Join the batch with your USDC deposit.
                  </p>
                </div>
                <button
                  onClick={handleJoin}
                  disabled={processing || !pricing}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  {processing
                    ? "Joining..."
                    : pricing
                      ? `Join with ${pricing.deposit.toFixed(2)} USDC`
                      : "Loading..."}
                </button>
              </>
            )}
          </div>

          {/* Terms */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Important:</strong> By joining, you agree to pay the 90% balance
              within 7 days after the batch becomes active. Failure to pay on time will
              result in a 1% penalty and eventual removal from the batch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
