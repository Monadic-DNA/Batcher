"use client";

import { useState, useEffect } from "react";
import { X, Wallet, Clock, AlertTriangle, Tag } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ethers } from "ethers";
import { payBalance, payBalanceWithDiscount, getBatchBalancePrice, approveUsdcSpending, getUsdcAllowance, getDiscountCodeInfo, hasUserUsedDiscount } from "@/lib/contract";

interface BalancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  batchId: number;
  paymentDeadline: Date;
}

export function BalancePaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  batchId,
  paymentDeadline,
}: BalancePaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState<string>("");
  const [discountCodeValid, setDiscountCodeValid] = useState(false);
  const [discountCodeChecking, setDiscountCodeChecking] = useState(false);
  const [discountedAmount, setDiscountedAmount] = useState<number | null>(null);

  const { primaryWallet } = useDynamicContext();

  // Fetch balance price from smart contract for this specific batch
  useEffect(() => {
    const fetchBalancePrice = async () => {
      try {
        const balancePrice = await getBatchBalancePrice(batchId);
        // USDC has 6 decimals
        const balanceInUsdc = Number(balancePrice) / 1e6;
        setBalanceAmount(balanceInUsdc);
      } catch (err) {
        console.error("Failed to fetch balance price:", err);
        setError("Unable to load balance price. It may not be set yet.");
      }
    };

    if (isOpen) {
      fetchBalancePrice();
    }
  }, [isOpen, batchId]);

  // Check discount code validity
  useEffect(() => {
    const checkDiscountCode = async () => {
      if (!discountCode || !primaryWallet || !balanceAmount) {
        setDiscountCodeValid(false);
        setDiscountedAmount(null);
        return;
      }

      setDiscountCodeChecking(true);
      try {
        const info = await getDiscountCodeInfo(discountCode);
        const userUsed = await hasUserUsedDiscount(primaryWallet.address, discountCode);

        if (!info.active || info.remainingUses === 0 || userUsed || !info.appliesToBalance) {
          setDiscountCodeValid(false);
          setDiscountedAmount(null);
        } else {
          setDiscountCodeValid(true);

          // Calculate discounted amount
          let discounted = balanceAmount;
          if (info.isPercentage) {
            const discountPercent = Number(info.discountValue);
            discounted = balanceAmount * (1 - discountPercent / 100);
          } else {
            const discountUsdc = Number(info.discountValue) / 1e6;
            discounted = Math.max(0, balanceAmount - discountUsdc);
          }
          setDiscountedAmount(discounted);
        }
      } catch (err) {
        console.error("Failed to validate discount code:", err);
        setDiscountCodeValid(false);
        setDiscountedAmount(null);
      } finally {
        setDiscountCodeChecking(false);
      }
    };

    const debounce = setTimeout(checkDiscountCode, 500);
    return () => clearTimeout(debounce);
  }, [discountCode, primaryWallet, balanceAmount]);

  // Check if USDC approval is needed
  useEffect(() => {
    const checkApproval = async () => {
      if (!primaryWallet || !balanceAmount) return;

      try {
        const address = primaryWallet.address;
        const allowance = await getUsdcAllowance(address);
        const amountToCheck = discountCodeValid && discountedAmount !== null ? discountedAmount : balanceAmount;
        const balanceAmountWei = BigInt(Math.floor(amountToCheck * 1e6));

        setNeedsApproval(allowance < balanceAmountWei);
      } catch (err) {
        console.error("Failed to check USDC allowance:", err);
      }
    };

    if (isOpen && primaryWallet && balanceAmount) {
      checkApproval();
    }
  }, [isOpen, primaryWallet, balanceAmount, discountCodeValid, discountedAmount]);

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

  const handleApprove = async () => {
    setProcessing(true);
    setError(null);
    try {
      if (!primaryWallet || !balanceAmount) {
        throw new Error("Wallet not connected or pricing not loaded");
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

      const amountToApprove = discountCodeValid && discountedAmount !== null ? discountedAmount : balanceAmount;
      const approvalAmount = BigInt(Math.floor(amountToApprove * 1e6));

      console.log("Approving USDC spending:", amountToApprove, "USDC");
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

  const handlePayBalance = async () => {
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

      const provider = (walletConnector as any).getWalletClient();
      if (!provider) {
        throw new Error("Provider not available");
      }

      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();

      const finalAmount = discountCodeValid && discountedAmount !== null ? discountedAmount : balanceAmount;
      console.log("Paying balance:", finalAmount, "USDC", discountCodeValid ? "(with discount)" : "");

      const receipt = discountCodeValid && discountCode
        ? await payBalanceWithDiscount(batchId, discountCode, signer)
        : await payBalance(batchId, signer);
      console.log("Transaction successful:", receipt.transactionHash);

      onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error("Balance payment error:", err);
      setError(
        err instanceof Error ? err.message : "Balance payment failed. Please try again."
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
                  After the deadline, a 50% penalty will be applied. If payment is not
                  received within the grace period, you&apos;ll be removed from the batch and
                  forfeit your deposit.
                </p>
              </div>
            </div>
          )}

          {/* Discount Code Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Discount Code (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                disabled={processing}
              />
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            {discountCodeChecking && (
              <p className="text-xs text-gray-500">Validating code...</p>
            )}
            {discountCode && !discountCodeChecking && discountCodeValid && (
              <p className="text-xs text-green-600">✓ Valid discount code applied!</p>
            )}
            {discountCode && !discountCodeChecking && !discountCodeValid && (
              <p className="text-xs text-red-600">Invalid or expired discount code</p>
            )}
          </div>

          {/* Amount Due */}
          {balanceAmount ? (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {discountCodeValid && discountedAmount !== null ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Original Price</span>
                    <span className="line-through text-gray-400">
                      {balanceAmount.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-green-600">
                      -{(balanceAmount - discountedAmount).toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-bold text-gray-900">Balance Amount Due</span>
                    <span className="font-bold text-green-600">
                      {discountedAmount.toFixed(2)} USDC
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Balance Amount Due</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {balanceAmount.toFixed(2)} USDC
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                This is the remaining payment for your DNA sequencing service.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
              Loading balance price...
            </div>
          )}

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
                  disabled={processing || !balanceAmount}
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
                    <strong>Step 2 of 2:</strong> Pay the balance amount with your USDC.
                  </p>
                </div>
                <button
                  onClick={handlePayBalance}
                  disabled={processing || !balanceAmount}
                  className={`w-full px-4 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    isUrgent
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  <Wallet className="w-5 h-5" />
                  {processing
                    ? "Paying..."
                    : balanceAmount && discountCodeValid && discountedAmount !== null
                      ? `Pay ${discountedAmount.toFixed(2)} USDC`
                      : balanceAmount
                        ? `Pay ${balanceAmount.toFixed(2)} USDC`
                        : "Loading..."}
                </button>
              </>
            )}
          </div>


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
