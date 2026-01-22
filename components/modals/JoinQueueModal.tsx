"use client";

import { useState } from "react";
import { X, CreditCard, Wallet } from "lucide-react";

interface JoinQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: () => void;
  batchId: number;
  currentCount: number;
  maxSize: number;
}

type PaymentMethod = "crypto" | "card" | null;

export function JoinQueueModal({
  isOpen,
  onClose,
  onJoinSuccess,
  batchId,
  currentCount,
  maxSize,
}: JoinQueueModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DEPOSIT_AMOUNT = 10; // $10.00 deposit (10% of $100 total)
  const TOTAL_AMOUNT = 100;

  const handleCryptoPayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      // TODO: Call smart contract joinBatch() function
      // This will require:
      // 1. Connect to contract using ethers
      // 2. Calculate deposit amount (10% of total price)
      // 3. Send transaction with value
      // 4. Wait for confirmation
      console.log("Initiating crypto payment...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate tx
      onJoinSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Crypto payment failed. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      // Call Stripe API to create checkout session
      const response = await fetch("/api/payment/create-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          walletAddress: "0x...", // TODO: Get from auth context
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment session");
      }

      const { url } = await response.json();
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Card payment failed. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === "crypto") {
      handleCryptoPayment();
    } else if (paymentMethod === "card") {
      handleCardPayment();
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
            <h3 className="font-semibold text-gray-900">Pricing</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Cost</span>
                <span className="font-medium">${TOTAL_AMOUNT.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deposit (Now)</span>
                <span className="font-bold text-blue-600">
                  ${DEPOSIT_AMOUNT.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Balance (Later)</span>
                <span className="font-medium">
                  ${(TOTAL_AMOUNT - DEPOSIT_AMOUNT).toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Pay 10% deposit now to join. You&apos;ll pay the remaining 90% when the
              batch becomes active (within 7 days).
            </p>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Choose Payment Method</h3>
              <button
                onClick={() => setPaymentMethod("card")}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Credit/Debit Card</p>
                    <p className="text-xs text-gray-500">Fast and secure payment</p>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <button
                onClick={() => setPaymentMethod("crypto")}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Ethereum / USDC</p>
                    <p className="text-xs text-gray-500">For advanced users</p>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Payment Confirmation */}
          {paymentMethod && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Payment Method</span>
                <div className="flex items-center gap-2">
                  {paymentMethod === "crypto" ? (
                    <Wallet className="w-4 h-4 text-green-600" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="font-medium">
                    {paymentMethod === "crypto" ? "Ethereum/USDC" : "Card"}
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPaymentMethod(null);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={processing}
                >
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : `Pay $${DEPOSIT_AMOUNT.toFixed(2)}`}
                </button>
              </div>
            </div>
          )}

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
