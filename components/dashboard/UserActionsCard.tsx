"use client";

import { CheckCircle, Circle } from "lucide-react";

interface UserActionsCardProps {
  batchId: number;
  batchState: string;
  depositPaid: boolean;
  balancePaid: boolean;
  kitRegistered: boolean;
  resultsAvailable: boolean;
  canReclaimDeposit?: boolean;
  joinedAt?: number;
  depositReclaimWindow?: number;
  onPayBalance?: () => void;
  onRegisterKit?: () => void;
  onDownloadResults?: () => void;
  onReclaimDeposit?: () => void;
}

export function UserActionsCard({
  batchId,
  batchState,
  depositPaid,
  balancePaid,
  kitRegistered,
  resultsAvailable,
  canReclaimDeposit,
  joinedAt,
  depositReclaimWindow,
  onPayBalance,
  onRegisterKit,
  onDownloadResults,
  onReclaimDeposit,
}: UserActionsCardProps) {

  // Calculate if reclaim is available
  const isReclaimAvailable =
    batchState === "Pending" &&
    depositPaid &&
    canReclaimDeposit &&
    joinedAt &&
    depositReclaimWindow &&
    (Date.now() / 1000) >= (joinedAt + depositReclaimWindow);

  const steps = [
    {
      label: "Pay deposit",
      completed: depositPaid,
      active: !depositPaid,
      action: null,
    },
    {
      label: "Pay balance",
      completed: balancePaid,
      active: depositPaid && !balancePaid && batchState === "Active",
      action: depositPaid && !balancePaid && batchState === "Active" ? onPayBalance : null,
    },
    {
      label: "Register kit",
      completed: kitRegistered,
      active: balancePaid && !kitRegistered && (batchState === "Active" || batchState === "Sequencing"),
      action: balancePaid && !kitRegistered && (batchState === "Active" || batchState === "Sequencing") ? onRegisterKit : null,
    },
    {
      label: "Wait for sequencing",
      completed: batchState === "Completed" || batchState === "Purged",
      active: batchState === "Sequencing",
      action: null,
    },
    {
      label: "Fetch results",
      completed: resultsAvailable,
      active: batchState === "Completed",
      action: batchState === "Completed" ? onDownloadResults : null,
    },
  ];

  return (
    <div className="space-y-2">
      {/* Reclaim Deposit Notice - show when available */}
      {isReclaimAvailable && onReclaimDeposit && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900">Reclaim Available</h4>
              <p className="text-xs text-amber-800 mt-1">
                This batch has been pending for over {Math.floor((depositReclaimWindow || 0) / 86400)} days. You can reclaim your full deposit.
              </p>
            </div>
          </div>
          <button
            onClick={onReclaimDeposit}
            className="w-full px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
          >
            Reclaim Deposit
          </button>
        </div>
      )}

      {/* Vertical steps with consistent horizontal layout */}
      {steps.map((step, index) => (
        <div key={index} className="flex items-center justify-between gap-3 py-2">
          {/* Left side: Status indicator + Label */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Status indicator */}
            <div className="flex-shrink-0">
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : step.active ? (
                <div className="w-5 h-5 rounded-full border-2 border-blue-600 bg-blue-50" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
            </div>

            {/* Label - always visible with consistent width */}
            <span className="text-sm font-medium text-gray-900 min-w-[140px]">
              {step.label}
            </span>
          </div>

          {/* Right side: Action button (fixed width area) */}
          <div className="w-24 flex-shrink-0">
            {step.action && (
              <button
                onClick={step.action}
                className="w-full px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                {step.label.startsWith("Pay") ? "Pay Now" :
                 step.label.startsWith("Register") ? "Register" :
                 step.label.startsWith("Fetch") ? "Download" : "Action"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
