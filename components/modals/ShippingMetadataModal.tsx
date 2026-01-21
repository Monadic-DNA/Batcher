"use client";

import { useState } from "react";
import { X, Lock, AlertCircle } from "lucide-react";

interface ShippingMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  batchId: number;
}

interface ShippingFormData {
  email: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  age: string;
  sex: string;
  ethnicity: string;
}

export function ShippingMetadataModal({
  isOpen,
  onClose,
  onSubmitSuccess,
  batchId,
}: ShippingMetadataModalProps) {
  const [formData, setFormData] = useState<ShippingFormData>({
    email: "",
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    age: "",
    sex: "",
    ethnicity: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.email || !formData.name || !formData.address) {
        throw new Error("Please fill in all required fields");
      }

      // TODO: Encrypt data and store in Nillion
      // Steps:
      // 1. Initialize Nillion client
      // 2. Encrypt sensitive data (shipping info + metadata)
      // 3. Store encrypted data with user's wallet as key
      // 4. Return store_id for future retrieval
      console.log("Encrypting and storing data in Nillion...");
      console.log("Batch ID:", batchId);
      console.log("Form data:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      onSubmitSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit data");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Shipping & Metadata
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Batch #{batchId} • All data is encrypted
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                End-to-End Encrypted
              </p>
              <p className="text-xs text-blue-700">
                All information is encrypted using Nillion&apos;s privacy-preserving
                technology before storage. Only you can decrypt it with your PIN.
              </p>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Shipping Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                We&apos;ll send shipping updates and result notifications here
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main St, Apt 4B"
                required
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New York"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="NY"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP/Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="10001"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Metadata */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                Optional Metadata (Improves Analysis)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                This information helps provide better insights but is completely optional
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="30"
                  min="18"
                  max="120"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ethnicity
                </label>
                <select
                  name="ethnicity"
                  value={formData.ethnicity}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Prefer not to say</option>
                  <option value="Caucasian">Caucasian</option>
                  <option value="African">African</option>
                  <option value="Asian">Asian</option>
                  <option value="Hispanic">Hispanic</option>
                  <option value="Middle Eastern">Middle Eastern</option>
                  <option value="Mixed">Mixed</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Double-Check Your Address
              </p>
              <p className="text-xs text-yellow-700">
                Make sure your shipping address is correct. The DNA kit will be sent to
                this address and cannot be redirected once shipped.
              </p>
            </div>
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
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Encrypting & Saving..." : "Submit Information"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
