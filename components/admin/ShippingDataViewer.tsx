"use client";

import { useState } from "react";
import { Package, Eye, EyeOff, AlertTriangle, Trash2 } from "lucide-react";

interface ShippingData {
  kitId: string;
  email: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  storedAt: string;
}

export function ShippingDataViewer() {
  const [shippingData, setShippingData] = useState<ShippingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showData, setShowData] = useState(false);

  const handleFetchData = async () => {
    setLoading(true);
    try {
      // Fetch shipping data from API
      // Access control handled by Nillion admin API key (server-side)
      const response = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch shipping data");
      }

      const data = await response.json();
      setShippingData(data.shippingData);
      setShowData(true);

      if (data.shippingData.length === 0) {
        alert("No shipping data found");
      }
    } catch (error) {
      console.error("Error fetching shipping data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to fetch shipping data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all shipping data? This action cannot be undone and should only be done after kits have been shipped."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      // Delete shipping data via API
      // Access control handled by Nillion admin API key (server-side)
      const response = await fetch("/api/admin/shipping/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete shipping data");
      }

      const data = await response.json();
      setShippingData([]);
      setShowData(false);
      alert(
        `Shipping data deleted successfully! Deleted ${data.deletedCount} records.`
      );
    } catch (error) {
      console.error("Error deleting shipping data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete shipping data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (shippingData.length === 0) return;

    const headers = [
      "Kit ID",
      "Email",
      "Name",
      "Address",
      "City",
      "State",
      "ZIP",
      "Country",
    ];
    const rows = shippingData.map((d) => [
      d.kitId,
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
    a.download = `shipping-data-${new Date().toISOString().split("T")[0]}.csv`;
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

      {/* Fetch Data */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              Fetch all shipping data from Nillion. Data is organized by kit ID.
            </p>
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
                {shippingData.length} kits
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
                        Kit ID
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
                          {data.kitId}
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
                      <span className="text-xs text-gray-500">Kit ID</span>
                      <span className="font-mono text-sm">
                        {data.kitId}
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
