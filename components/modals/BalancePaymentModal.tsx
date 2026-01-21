"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Wallet, Clock, AlertTriangle } from "lucide-react";

interface BalancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  batchId: number;
  paymentDeadline: Date;
}

type PaymentMethod = "crypto" | "card" | null;

export function BalancePaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  batchId,
  paymentDeadline,
}: BalancePaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);

  const BALANCE_AMOUNT = 90; // $90.00 balance (90% of $100 total)

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const updateTimer = () => {
      const now = new Date();
      const deadline = new Date(paymentDeadline);
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("EXPIRED");
        setIsUrgent(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      setIsUrgent(days === 0); // Urgent if less than 24 hours
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isOpen, paymentDeadline]);

  const handleCryptoPayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      // TODO: Call smart contract payBalance() function
      // This will require:
      // 1. Connect to contract using ethers
      // 2. Calculate balance amount (90% of total price)
      // 3. Send transaction with value
      // 4. Wait for confirmation
      console.log("Initiating crypto payment...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate tx
      onPaymentSuccess();
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
      const response = await fetch("/api/payment/create-balance", {
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
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pay Balance</h2>
            <p className="text-sm text-gray-600 mt-1">Batch #{batchId}</p>
          </div>
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
          {/* Countdown Timer */}
          <div
            className={`rounded-lg p-4 flex items-center gap-3 ${
              isUrgent
                ? "bg-red-50 border-2 border-red-300"
                : "bg-blue-50 border-2 border-blue-200"
            }`}
          >
            <Clock
              className={`w-6 h-6 ${isUrgent ? "text-red-600" : "text-blue-600"}`}
            />
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${isUrgent ? "text-red-900" : "text-blue-900"}`}
              >
                {timeRemaining === "EXPIRED"
                  ? "Payment Deadline Passed"
                  : "Time Remaining"}
              </p>
              <p
                className={`text-2xl font-bold ${isUrgent ? "text-red-600" : "text-blue-600"}`}
              >
                {timeRemaining}
              </p>
            </div>
          </div>

          {/* Urgency Warning */}
          {isUrgent && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 mb-1">
                  Pay Now to Avoid Penalty
                </p>
                <p className="text-xs text-yellow-700">
                  After the deadline, a 1% late fee will be applied. If payment is not
                  received within 6 months, you&apos;ll be removed from the batch and
                  forfeit your deposit.
                </p>
              </div>
            </div>
          )}

          {/* Amount Due */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Cost</span>
              <span className="font-medium">$100.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Deposit Paid</span>
              <span className="text-green-600">-$10.00</span>
            </div>
            <div className="border-t border-gray-200 my-2" />
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Amount Due</span>
              <span className="text-2xl font-bold text-blue-600">
                ${BALANCE_AMOUNT.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Choose Payment Method</h3>
              <button
                onClick={() => setPaymentMethod("crypto")}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Crypto (On-Chain)</p>
                    <p className="text-xs text-gray-500">Pay with ETH or stablecoins</p>
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
                onClick={() => setPaymentMethod("card")}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Credit/Debit Card</p>
                    <p className="text-xs text-gray-500">Pay with Stripe (USD)</p>
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
                    <Wallet className="w-4 h-4 text-blue-600" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-green-600" />
                  )}
                  <span className="font-medium">
                    {paymentMethod === "crypto" ? "Crypto" : "Card"}
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
                  className={`flex-1 px-4 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isUrgent
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {processing
                    ? "Processing..."
                    : `Pay $${BALANCE_AMOUNT.toFixed(2)}`}
                </button>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-900 font-medium mb-2">
              After Payment:
            </p>
            <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
              <li>Submit your shipping information (encrypted)</li>
              <li>Receive your DNA kit within 7-10 business days</li>
              <li>Register your kit with a secure PIN</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
