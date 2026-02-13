"use client";

import { CheckCircle, Circle } from "lucide-react";

interface UserActionsCardProps {
  batchId: number;
  batchState: string;
  depositPaid: boolean;
  balancePaid: boolean;
  kitRegistered: boolean;
  resultsAvailable: boolean;
  onPayBalance?: () => void;
  onRegisterKit?: () => void;
  onDownloadResults?: () => void;
}

export function UserActionsCard({
  batchId,
  batchState,
  depositPaid,
  balancePaid,
  kitRegistered,
  resultsAvailable,
  onPayBalance,
  onRegisterKit,
  onDownloadResults,
}: UserActionsCardProps) {

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
