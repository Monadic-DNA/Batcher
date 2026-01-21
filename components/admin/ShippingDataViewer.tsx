"use client";

import { useState } from "react";
import { Package, Eye, EyeOff, AlertTriangle, Trash2 } from "lucide-react";

interface ShippingData {
  walletAddress: string;
  batchId: number;
  email: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  retrievedAt: string;
}

export function ShippingDataViewer() {
  const [selectedBatch, setSelectedBatch] = useState<number>(1);
  const [shippingData, setShippingData] = useState<ShippingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showData, setShowData] = useState(false);

  const handleFetchData = async () => {
    setLoading(true);
    try {
      // TODO: Fetch encrypted shipping data from Nillion
      // This should require admin delegation token
      console.log("Fetching shipping data for batch", selectedBatch);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock data
      setShippingData([
        {
          walletAddress: "0xA1B2C3D4E5F6...",
          batchId: selectedBatch,
          email: "user@example.com",
          name: "John Doe",
          address: "123 Main St",
          city: "New York",
          state: "NY",
          zip: "10001",
          country: "United States",
          retrievedAt: new Date().toISOString(),
        },
      ]);
      setShowData(true);
    } catch (error) {
      console.error("Error fetching shipping data:", error);
      alert("Failed to fetch shipping data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all shipping data for this batch? This action cannot be undone and should only be done after kits have been shipped."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Delete shipping data from Nillion
      console.log("Deleting shipping data for batch", selectedBatch);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setShippingData([]);
      setShowData(false);
      alert("Shipping data deleted successfully!");
    } catch (error) {
      console.error("Error deleting shipping data:", error);
      alert("Failed to delete shipping data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (shippingData.length === 0) return;

    const headers = [
      "Wallet Address",
      "Email",
      "Name",
      "Address",
      "City",
      "State",
      "ZIP",
      "Country",
    ];
    const rows = shippingData.map((d) => [
      d.walletAddress,
      d.email,
      d.name,
      d.address,
      d.city,
      d.state,
      d.zip,
      d.country,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-${selectedBatch}-shipping-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900 mb-1">
            Sensitive Data - Handle with Care
          </h3>
          <p className="text-sm text-red-700">
            This data contains personally identifiable information (PII). It should
            only be accessed when necessary for shipping kits and must be deleted
            immediately after shipment. Access is logged for audit purposes.
          </p>
        </div>
      </div>

      {/* Batch Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(Number(e.target.value));
                setShowData(false);
                setShippingData([]);
              }}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={1}>Batch #1 (Active)</option>
              <option value={2}>Batch #2 (Sequencing)</option>
            </select>
          </div>

          <button
            onClick={handleFetchData}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Package className="w-5 h-5" />
            {loading ? "Loading..." : "Fetch Shipping Data"}
          </button>
        </div>
      </div>

      {/* Data Display */}
      {shippingData.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Shipping Addresses
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {shippingData.length} participants • Retrieved{" "}
                {new Date(shippingData[0].retrievedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowData(!showData)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
              >
                {showData ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show
                  </>
                )}
              </button>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Export CSV
              </button>

              <button
                onClick={handleDeleteData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            </div>
          </div>

          {showData && (
            <div className="p-6">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Wallet
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Address
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        City/State
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ZIP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {shippingData.map((data, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm font-mono">
                          {data.walletAddress.substring(0, 10)}...
                        </td>
                        <td className="px-4 py-3 text-sm">{data.email}</td>
                        <td className="px-4 py-3 text-sm">{data.name}</td>
                        <td className="px-4 py-3 text-sm">{data.address}</td>
                        <td className="px-4 py-3 text-sm">
                          {data.city}, {data.state}
                        </td>
                        <td className="px-4 py-3 text-sm">{data.zip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {shippingData.map((data, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-500">Wallet</span>
                      <span className="font-mono text-sm">
                        {data.walletAddress.substring(0, 10)}...
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-500">Email</span>
                      <span className="text-sm">{data.email}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-500">Name</span>
                      <span className="text-sm">{data.name}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <p className="text-sm">{data.address}</p>
                      <p className="text-sm">
                        {data.city}, {data.state} {data.zip}
                      </p>
                      <p className="text-sm">{data.country}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
