"use client";

import { useState } from "react";
import { X, Lock, Download, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

interface DataRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: number;
  kitId: string;
}

export function DataRevealModal({
  isOpen,
  onClose,
  batchId,
  kitId,
}: DataRevealModalProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedData, setDecryptedData] = useState<string | null>(null);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);

    try {
      // Validate PIN format
      if (!/^\d{6}$/.test(pin)) {
        throw new Error("PIN must be exactly 6 digits");
      }

      // TODO: Verify PIN and decrypt data from Nillion
      // Steps:
      // 1. Create hash: Hash(KitID + PIN)
      // 2. Compare with on-chain commitment hash
      // 3. If match, fetch encrypted data from Nillion
      // 4. Decrypt using PIN-derived key
      // 5. Decompress CSV data
      console.log("Verifying PIN and decrypting data...");
      console.log("Kit ID:", kitId);
      console.log("PIN length:", pin.length);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock decrypted data (in production, this comes from Nillion)
      const mockData = `rs123,chr1,12345,A,G,0.75,0.0001,Diabetes risk
rs456,chr2,67890,C,T,0.82,0.002,Height variation
rs789,chr3,11223,G,A,0.68,0.0005,Eye color`;

      setDecryptedData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PIN verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = () => {
    if (!decryptedData) return;

    setDownloading(true);
    try {
      // Create CSV file
      const csvContent = `rsID,Chromosome,Position,Reference,Alternate,GenotypeProbability,pValue,Trait\n${decryptedData}`;
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `dna-results-${kitId}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Close modal after download
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setPin("");
    setDecryptedData(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Download Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              Batch #{batchId} • Kit {kitId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={verifying || downloading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!decryptedData ? (
            /* PIN Entry Form */
            <form onSubmit={handleVerifyPin} className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Enter Your PIN to Decrypt
                  </p>
                  <p className="text-xs text-blue-700">
                    Use the 6-digit PIN you created when registering your DNA kit. This
                    PIN is the only way to decrypt your results.
                  </p>
                </div>
              </div>

              {/* PIN Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  6-Digit PIN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 6) setPin(value);
                    }}
                    placeholder="••••••"
                    required
                    maxLength={6}
                    autoFocus
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-2xl tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`h-1 flex-1 rounded ${pin.length >= 6 ? "bg-green-500" : "bg-gray-200"}`}
                  />
                  <span className="text-xs text-gray-500">{pin.length}/6</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Security Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Data Purge Notice
                  </p>
                  <p className="text-xs text-yellow-700">
                    Your encrypted results will be automatically deleted 60 days after
                    completion. Download your data now to keep a permanent copy.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={verifying}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || pin.length !== 6}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? "Verifying..." : "Verify & Decrypt"}
                </button>
              </div>
            </form>
          ) : (
            /* Download Success View */
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">
                    Decryption Successful!
                  </p>
                  <p className="text-xs text-green-700">
                    Your DNA results have been decrypted and are ready to download.
                  </p>
                </div>
              </div>

              {/* Data Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Data Preview</p>
                <div className="bg-white rounded border border-gray-200 p-3 font-mono text-xs overflow-x-auto">
                  <pre className="text-gray-700 whitespace-pre-wrap">
                    {decryptedData.split("\n").slice(0, 3).join("\n")}
                    {"\n"}...
                  </pre>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Full dataset contains genome-wide association data in CSV format
                </p>
              </div>

              {/* File Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700 mb-1">File Format</p>
                  <p className="font-medium text-blue-900">CSV</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700 mb-1">Estimated Size</p>
                  <p className="font-medium text-blue-900">~2.5 MB</p>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Store Securely
                  </p>
                  <p className="text-xs text-yellow-700">
                    This file contains your raw DNA data. Store it securely and never
                    share it with untrusted parties.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={downloading}
                >
                  Try Different PIN
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {downloading ? "Downloading..." : "Download CSV"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
