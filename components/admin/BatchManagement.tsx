"use client";

import { useState, useEffect } from "react";
import { getBatchInfo, getCurrentBatchId } from "@/lib/contract";
import {
  PlayCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  ChevronRight,
} from "lucide-react";

interface Batch {
  id: number;
  state: string;
  participantCount: number;
  depositsPaid: number;
  balancesPaid: number;
  createdAt: string;
  stagedAt?: string;
  activatedAt?: string;
}

export function BatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [, setSelectedBatch] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const stateNames = ["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"];

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const currentBatchId = await getCurrentBatchId();

      const batchPromises = [];
      for (let i = 1; i <= currentBatchId; i++) {
        batchPromises.push(getBatchInfo(i));
      }

      const batchInfos = await Promise.all(batchPromises);

      const loadedBatches: Batch[] = batchInfos.map((info, index) => ({
        id: index + 1,
        state: stateNames[info.state],
        participantCount: info.participantCount,
        depositsPaid: info.participantCount, // Deposits are paid when joining
        balancesPaid: 0, // TODO: Track balance payments
        createdAt: new Date().toISOString(),
      }));

      setBatches(loadedBatches.reverse()); // Show newest first
      if (loadedBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(currentBatchId);
      }
    } catch (error) {
      console.error("Error loading batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Staged":
        return "bg-blue-100 text-blue-800";
      case "Active":
        return "bg-green-100 text-green-800";
      case "Sequencing":
        return "bg-purple-100 text-purple-800";
      case "Completed":
        return "bg-gray-100 text-gray-800";
      case "Purged":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getNextState = (currentState: string): string | null => {
    const stateFlow = [
      "Pending",
      "Staged",
      "Active",
      "Sequencing",
      "Completed",
      "Purged",
    ];
    const currentIndex = stateFlow.indexOf(currentState);
    return currentIndex < stateFlow.length - 1
      ? stateFlow[currentIndex + 1]
      : null;
  };

  const canProgress = (batch: Batch): boolean => {
    switch (batch.state) {
      case "Pending":
        return batch.participantCount >= 24;
      case "Staged":
        return true;
      case "Active":
        return batch.balancesPaid === batch.participantCount;
      case "Sequencing":
        return true; // Manual check that sequencing is done
      case "Completed":
        return true; // Can purge after 60 days
      default:
        return false;
    }
  };

  const handleProgressState = async (batchId: number) => {
    setProcessing(true);
    try {
      // TODO: Call smart contract to progress state
      // await contract.progressBatchState(batchId);
      console.log("Progressing batch", batchId);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update local state
      setBatches((prev) =>
        prev.map((b) =>
          b.id === batchId
            ? { ...b, state: getNextState(b.state) || b.state }
            : b
        )
      );

      alert("Batch state progressed successfully!");
    } catch (error) {
      console.error("Error progressing state:", error);
      alert("Failed to progress batch state");
    } finally {
      setProcessing(false);
    }
  };

  const handleSlashUser = async (batchId: number, userAddress: string) => {
    if (
      !confirm(
        `Slash user ${userAddress.substring(0, 8)}... for late payment? This will apply a 1% penalty.`
      )
    ) {
      return;
    }

    setProcessing(true);
    try {
      // TODO: Call smart contract to slash user
      // await contract.slashUser(batchId, userAddress);
      console.log("Slashing user", userAddress, "in batch", batchId);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      alert("User slashed successfully!");
    } catch (error) {
      console.error("Error slashing user:", error);
      alert("Failed to slash user");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading batches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Batch Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Batch to Manage
        </label>
        <select
          value={selectedBatchId || ""}
          onChange={(e) => setSelectedBatchId(Number(e.target.value))}
          className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
        >
          <option value="">All Batches</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              Batch #{batch.id} - {batch.state} ({batch.participantCount}/24 participants)
            </option>
          ))}
        </select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Batches</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Batches</span>
            <PlayCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {batches.filter((b) => b.state === "Active").length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Pending</span>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {batches.filter((b) => b.state === "Pending").length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Completed</span>
            <CheckCircle className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {batches.filter((b) => b.state === "Completed").length}
          </p>
        </div>
      </div>

      {/* Batch List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">All Batches</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {batches
            .filter((batch) => !selectedBatchId || batch.id === selectedBatchId)
            .map((batch) => {
            const nextState = getNextState(batch.state);
            const canProg = canProgress(batch);

            return (
              <div key={batch.id} className="p-6 hover:bg-gray-50">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Batch Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Batch #{batch.id}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStateColor(batch.state)}`}
                      >
                        {batch.state}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Participants</p>
                        <p className="font-medium">{batch.participantCount}/24</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Deposits</p>
                        <p className="font-medium">{batch.depositsPaid}/24</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Balances</p>
                        <p className="font-medium">{batch.balancesPaid}/24</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Created</p>
                        <p className="font-medium">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedBatch(batch.id)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                    >
                      View Details
                    </button>

                    {nextState && (
                      <button
                        onClick={() => handleProgressState(batch.id)}
                        disabled={!canProg || processing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                          canProg && !processing
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {processing ? (
                          "Processing..."
                        ) : (
                          <>
                            Move to {nextState}
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Requirements */}
                {nextState && !canProg && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        Requirements not met
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        {batch.state === "Pending" &&
                          `Need ${24 - batch.participantCount} more participants`}
                        {batch.state === "Active" &&
                          `Waiting for ${batch.participantCount - batch.balancesPaid} balance payments`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
