"use client";

import { useState } from "react";
import { X, Lock, Package, Eye, EyeOff, AlertCircle } from "lucide-react";

interface KitRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: () => void;
  batchId: number;
}

export function KitRegistrationModal({
  isOpen,
  onClose,
  onRegisterSuccess,
  batchId,
}: KitRegistrationModalProps) {
  const [kitId, setKitId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate Kit ID format (e.g., "KIT-XXXXXXXX")
      if (!/^KIT-[A-Z0-9]{8}$/.test(kitId.toUpperCase())) {
        throw new Error(
          "Invalid Kit ID format. Should be KIT-XXXXXXXX (8 characters)"
        );
      }

      // Validate PIN (exactly 6 digits)
      if (!/^\d{6}$/.test(pin)) {
        throw new Error("PIN must be exactly 6 digits");
      }

      // Validate PIN confirmation
      if (pin !== confirmPin) {
        throw new Error("PINs do not match");
      }

      // TODO: Create commitment hash and submit to smart contract
      // Steps:
      // 1. Create hash: Hash(KitID + PIN)
      // 2. Call contract.storeCommitmentHash(hash)
      // 3. Store PIN hint locally (optional)
      // 4. Confirm transaction
      console.log("Creating commitment hash...");
      console.log("Kit ID:", kitId.toUpperCase());
      console.log("PIN length:", pin.length);

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      onRegisterSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Register DNA Kit</h2>
            <p className="text-sm text-gray-600 mt-1">Batch #{batchId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Find Your Kit ID
              </p>
              <p className="text-xs text-blue-700">
                Look for the Kit ID printed on the label inside your DNA kit box. It
                should look like: <strong>KIT-ABC12345</strong>
              </p>
            </div>
          </div>

          {/* Kit ID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kit ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={kitId}
              onChange={(e) => setKitId(e.target.value.toUpperCase())}
              placeholder="KIT-ABC12345"
              required
              maxLength={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: KIT-XXXXXXXX (8 alphanumeric characters)
            </p>
          </div>

          {/* PIN Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create 6-Digit PIN <span className="text-red-500">*</span>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm PIN <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 6) setConfirmPin(value);
                  }}
                  placeholder="••••••"
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-2xl tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPin ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-1">
                <Lock className="w-4 h-4 inline mr-1" />
                CRITICAL: Remember Your PIN
              </p>
              <p className="text-xs text-yellow-700">
                Your PIN is the <strong>ONLY</strong> way to decrypt your DNA results.
                We cannot recover it if you forget. Write it down and store it securely.
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600">
              <strong>How it works:</strong> We create a secure fingerprint of your Kit
              ID + PIN and store it safely. When results are ready, you&apos;ll use
              this same PIN to decrypt your data. The PIN itself is never stored or
              transmitted.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || pin.length !== 6 || pin !== confirmPin}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Registering..." : "Register Kit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
