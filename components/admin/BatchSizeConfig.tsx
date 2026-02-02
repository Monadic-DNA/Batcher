"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Settings, Save, AlertCircle, CheckCircle } from "lucide-react";
import { parseEther } from "ethers";

const CONTRACT_ABI = [
  "function defaultBatchSize() external view returns (uint256)",
  "function setDefaultBatchSize(uint256 newSize) external",
  "function setBatchSize(uint256 batchId, uint256 newSize) external",
  "function getBatchInfo(uint256 batchId) external view returns (uint8, uint256, uint256, uint256, uint256)",
  "function currentBatchId() external view returns (uint256)",
];

interface BatchInfo {
  id: number;
  state: number;
  participantCount: number;
  maxBatchSize: number;
}

export function BatchSizeConfig() {
  const { address } = useAccount();
  const [defaultSize, setDefaultSize] = useState<number>(24);
  const [newDefaultSize, setNewDefaultSize] = useState<string>("");
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [newBatchSize, setNewBatchSize] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const stateNames = ["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"];

  useEffect(() => {
    loadBatchData();
  }, []);

  useEffect(() => {
    if (isSuccess) {
      setMessage({ type: "success", text: "Batch size updated successfully!" });
      loadBatchData();
      setNewDefaultSize("");
      setNewBatchSize("");
    }
  }, [isSuccess]);

  const loadBatchData = async () => {
    if (!address) return;

    setLoading(true);
    try {
      // In a real implementation, this would read from the contract
      // For now, we'll use mock data structure
      setDefaultSize(24);

      // Mock batch data - in reality, fetch from contract
      setBatches([
        { id: 1, state: 0, participantCount: 15, maxBatchSize: 24 },
        { id: 2, state: 0, participantCount: 8, maxBatchSize: 24 },
      ]);
    } catch (error) {
      console.error("Error loading batch data:", error);
      setMessage({ type: "error", text: "Failed to load batch data" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDefaultSize = async () => {
    if (!newDefaultSize || parseInt(newDefaultSize) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid batch size (> 0)" });
      return;
    }

    try {
      writeContract({
        address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "setDefaultBatchSize",
        args: [BigInt(newDefaultSize)],
      });
    } catch (error) {
      console.error("Error updating default batch size:", error);
      setMessage({ type: "error", text: "Failed to update default batch size" });
    }
  };

  const handleUpdateBatchSize = async () => {
    if (!selectedBatch || !newBatchSize || parseInt(newBatchSize) <= 0) {
      setMessage({ type: "error", text: "Please select a batch and enter a valid size (> 0)" });
      return;
    }

    const batch = batches.find((b) => b.id === selectedBatch);
    if (!batch) return;

    if (parseInt(newBatchSize) < batch.participantCount) {
      setMessage({
        type: "error",
        text: `Cannot set size below current participant count (${batch.participantCount})`,
      });
      return;
    }

    try {
      writeContract({
        address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "setBatchSize",
        args: [BigInt(selectedBatch), BigInt(newBatchSize)],
      });
    } catch (error) {
      console.error("Error updating batch size:", error);
      setMessage({ type: "error", text: "Failed to update batch size" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900">Batch Size Configuration</h2>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg p-4 flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-700" : "text-red-700"
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Default Batch Size */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Batch Size</h3>
        <p className="text-sm text-gray-600 mb-4">
          Set the default size for all new batches. Current default: <strong>{defaultSize}</strong>
        </p>

        <div className="flex gap-3">
          <input
            type="number"
            value={newDefaultSize}
            onChange={(e) => setNewDefaultSize(e.target.value)}
            placeholder="Enter new default size"
            min="1"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleUpdateDefaultSize}
            disabled={isPending || isConfirming || !newDefaultSize}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isPending || isConfirming ? "Updating..." : "Update Default"}
          </button>
        </div>
      </div>

      {/* Pending Batches */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Modify Pending Batch Size
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Change the size for a specific pending batch. Only pending batches can be modified.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Batch
            </label>
            <select
              value={selectedBatch || ""}
              onChange={(e) => setSelectedBatch(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Choose a batch...</option>
              {batches
                .filter((b) => b.state === 0) // Only pending batches
                .map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    Batch #{batch.id} - {batch.participantCount}/{batch.maxBatchSize} participants
                  </option>
                ))}
            </select>
          </div>

          {selectedBatch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Batch Size
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={newBatchSize}
                  onChange={(e) => setNewBatchSize(e.target.value)}
                  placeholder="Enter new batch size"
                  min={
                    batches.find((b) => b.id === selectedBatch)?.participantCount || 1
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleUpdateBatchSize}
                  disabled={isPending || isConfirming || !newBatchSize}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isPending || isConfirming ? "Updating..." : "Update Batch"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Minimum size:{" "}
                {batches.find((b) => b.id === selectedBatch)?.participantCount || 0} (current
                participants)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Default batch size applies to all newly created batches</li>
            <li>Only pending batches can be resized</li>
            <li>Cannot set batch size below current participant count</li>
            <li>If a batch reaches its new size, it will automatically transition to "Staged"</li>
            <li>All changes are recorded as blockchain events for auditing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
