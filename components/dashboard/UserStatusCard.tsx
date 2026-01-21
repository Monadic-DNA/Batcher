"use client";

import { useState, useEffect } from "react";

interface UserStatusProps {
  batchId: number;
  batchState: string;
  depositPaid: boolean;
  balancePaid: boolean;
  paymentDeadline?: Date;
  kitRegistered?: boolean;
  resultsAvailable?: boolean;
  onPayBalance?: () => void;
  onRegisterKit?: () => void;
  onDownloadResults?: () => void;
}

export function UserStatusCard({
  batchId,
  batchState,
  depositPaid,
  balancePaid,
  paymentDeadline,
  kitRegistered = false,
  resultsAvailable = false,
  onPayBalance,
  onRegisterKit,
  onDownloadResults,
}: UserStatusProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!paymentDeadline || balancePaid) return;

    const updateTimer = () => {
      const now = new Date();
      const deadline = new Date(paymentDeadline);
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("EXPIRED");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [paymentDeadline, balancePaid]);

  const getStatusColor = () => {
    if (resultsAvailable) return "green";
    if (batchState === "Active" && !balancePaid) return "yellow";
    if (batchState === "Sequencing") return "blue";
    if (batchState === "Completed") return "green";
    return "gray";
  };

  const getNextAction = () => {
    if (resultsAvailable) {
      return {
        title: "Results Ready!",
        description: "Your DNA results are available for download",
        action: "Download Results",
        urgent: false,
      };
    }

    if (batchState === "Active" && !balancePaid) {
      return {
        title: "Payment Required",
        description: `Pay 90% balance within ${timeRemaining}`,
        action: "Pay Balance Now",
        urgent: timeRemaining === "EXPIRED" || timeRemaining.startsWith("0d"),
      };
    }

    if (batchState === "Active" && balancePaid && !kitRegistered) {
      return {
        title: "Register Kit",
        description: "Register your DNA kit ID and create a secure PIN",
        action: "Register Kit",
        urgent: false,
      };
    }

    if (batchState === "Sequencing") {
      return {
        title: "Processing",
        description: "Your batch is being sequenced at the lab",
        action: null,
        urgent: false,
      };
    }

    if (batchState === "Staged") {
      return {
        title: "Batch Full",
        description: "Awaiting admin activation",
        action: null,
        urgent: false,
      };
    }

    return {
      title: "Waiting",
      description: "Waiting for batch to fill",
      action: null,
      urgent: false,
    };
  };

  const statusColor = getStatusColor();
  const nextAction = getNextAction();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Your Status</h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            statusColor === "green"
              ? "bg-green-100 text-green-800"
              : statusColor === "yellow"
                ? "bg-yellow-100 text-yellow-800"
                : statusColor === "blue"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
          }`}
        >
          {batchState}
        </span>
      </div>

      {/* Batch Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Batch Number</p>
          <p className="text-2xl font-bold text-gray-900">#{batchId}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Payment Status</p>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${depositPaid ? "bg-green-500" : "bg-gray-300"}`}
            />
            <span className="text-sm">Deposit</span>
            <div
              className={`w-3 h-3 rounded-full ${balancePaid ? "bg-green-500" : "bg-gray-300"}`}
            />
            <span className="text-sm">Balance</span>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {["Deposit", "Balance", "Kit", "Sequencing", "Results"].map(
            (step, idx) => {
              const isComplete =
                (idx === 0 && depositPaid) ||
                (idx === 1 && balancePaid) ||
                (idx === 2 && kitRegistered) ||
                (idx === 3 && batchState === "Completed") ||
                (idx === 4 && resultsAvailable);

              return (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isComplete ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="text-xs sm:text-sm">{idx + 1}</span>
                    )}
                  </div>
                  <p className="text-xs mt-2 text-center hidden sm:block">
                    {step}
                  </p>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Next Action */}
      {nextAction.action && (
        <div
          className={`rounded-lg p-4 ${
            nextAction.urgent
              ? "bg-red-50 border-2 border-red-200"
              : "bg-blue-50 border-2 border-blue-200"
          }`}
        >
          <h4
            className={`font-semibold mb-2 ${
              nextAction.urgent ? "text-red-900" : "text-blue-900"
            }`}
          >
            {nextAction.title}
          </h4>
          <p
            className={`text-sm mb-3 ${
              nextAction.urgent ? "text-red-700" : "text-blue-700"
            }`}
          >
            {nextAction.description}
          </p>
          <button
            onClick={() => {
              if (nextAction.action === "Pay Balance Now" && onPayBalance) {
                onPayBalance();
              } else if (nextAction.action === "Register Kit" && onRegisterKit) {
                onRegisterKit();
              } else if (nextAction.action === "Download Results" && onDownloadResults) {
                onDownloadResults();
              }
            }}
            className={`w-full sm:w-auto px-6 py-2 rounded-lg font-medium transition-colors ${
              nextAction.urgent
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {nextAction.action}
          </button>
        </div>
      )}
    </div>
  );
}
