"use client";

import { useEffect, useState } from "react";

interface QueueStatsProps {
  currentCount: number;
  maxSize: number;
  batchId: number;
  recentJoins?: string[]; // Wallet address fragments
}

export function LiveQueueStats({
  currentCount,
  maxSize,
  batchId,
  recentJoins = [],
}: QueueStatsProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress((currentCount / maxSize) * 100);
  }, [currentCount, maxSize]);

  const spotsRemaining = maxSize - currentCount;
  const isFull = currentCount >= maxSize;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Current Batch</h2>
          <p className="text-sm text-gray-500">Batch #{batchId}</p>
        </div>
        <div className="mt-2 sm:mt-0">
          <span className="text-3xl font-bold text-blue-600">
            {currentCount}/{maxSize}
          </span>
          <p className="text-sm text-gray-500 text-right">participants</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Batch Progress</span>
          <span className="font-medium text-gray-900">{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isFull
                ? "bg-green-500"
                : progress > 75
                  ? "bg-yellow-500"
                  : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        {isFull ? (
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="ml-3 text-sm text-green-800">
              <span className="font-medium">Batch Full!</span> Awaiting admin
              activation. New participants will join the next batch.
            </p>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="ml-3 text-sm text-blue-800">
              <span className="font-medium">{spotsRemaining} spots remaining</span>{" "}
              - Join now to secure your place in this batch
            </p>
          </div>
        )}
      </div>

      {/* Recent Joins */}
      {recentJoins.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Recent Participants
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentJoins.map((wallet, idx) => (
              <div
                key={idx}
                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-mono"
              >
                {wallet}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
