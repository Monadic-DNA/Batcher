"use client";

import { useState } from "react";
import { Shuffle, Download, AlertCircle, CheckCircle } from "lucide-react";

interface KitMapping {
  walletAddress: string;
  kitId: string;
}

export function KitRandomizer() {
  const [selectedBatch, setSelectedBatch] = useState<number>(1);
  const [participantCount] = useState<number>(24);
  const [kitMappings, setKitMappings] = useState<KitMapping[]>([]);
  const [generating, setGenerating] = useState(false);

  const generateKitIds = (): string[] => {
    const kits: string[] = [];
    for (let i = 0; i < participantCount; i++) {
      // Generate random 8-character alphanumeric ID
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let id = "KIT-";
      for (let j = 0; j < 8; j++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      kits.push(id);
    }
    return kits;
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleGenerateMappings = async () => {
    setGenerating(true);
    try {
      // TODO: Fetch participant list from smart contract
      console.log("Fetching participants for batch", selectedBatch);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock wallet addresses
      const participants = Array.from({ length: participantCount }, () => ({
        walletAddress: `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}...`,
      }));

      // Generate kit IDs
      const kitIds = generateKitIds();

      // Shuffle kit IDs to randomize assignment
      const shuffledKits = shuffleArray(kitIds);

      // Create mappings
      const mappings = participants.map((p, i) => ({
        walletAddress: p.walletAddress,
        kitId: shuffledKits[i],
      }));

      setKitMappings(mappings);
    } catch (error) {
      console.error("Error generating mappings:", error);
      alert("Failed to generate kit mappings");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportMappings = () => {
    if (kitMappings.length === 0) return;

    const headers = ["Wallet Address", "Kit ID"];
    const rows = kitMappings.map((m) => [m.walletAddress, m.kitId]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-${selectedBatch}-kit-mappings-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handlePrintLabels = () => {
    if (kitMappings.length === 0) return;

    // Create printable labels
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print labels");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kit Labels - Batch ${selectedBatch}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
              body { margin: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .label {
              border: 2px solid #000;
              padding: 20px;
              margin-bottom: 30px;
              page-break-inside: avoid;
              page-break-after: always;
            }
            .label:last-child {
              page-break-after: auto;
            }
            .kit-id {
              font-size: 24px;
              font-weight: bold;
              font-family: monospace;
              margin-bottom: 10px;
            }
            .batch-id {
              font-size: 14px;
              color: #666;
            }
            .instructions {
              font-size: 12px;
              margin-top: 20px;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          ${kitMappings
            .map(
              (m) => `
            <div class="label">
              <div class="kit-id">${m.kitId}</div>
              <div class="batch-id">Batch #${selectedBatch}</div>
              <div class="instructions">
                <p><strong>Instructions:</strong></p>
                <ol>
                  <li>Affix this label to the DNA kit box</li>
                  <li>Ensure barcode is scannable</li>
                  <li>Do not fold or damage label</li>
                </ol>
              </div>
            </div>
          `
            )
            .join("")}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">Kit Randomization</h3>
          <p className="text-sm text-blue-700">
            Generate random Kit ID assignments for all participants in a batch. This
            ensures that lab technicians cannot identify which DNA sample belongs to
            which wallet address, preserving anonymity.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(Number(e.target.value));
                setKitMappings([]);
              }}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={1}>Batch #1 (Active - 24 participants)</option>
              <option value={2}>Batch #2 (Staged - 24 participants)</option>
            </select>
          </div>

          <button
            onClick={handleGenerateMappings}
            disabled={generating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shuffle className="w-5 h-5" />
            {generating ? "Generating..." : "Generate Random Mappings"}
          </button>
        </div>
      </div>

      {/* Results */}
      {kitMappings.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Mappings Generated
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              {kitMappings.length} kit IDs have been randomly assigned to participants
            </p>
          </div>

          <div className="p-6">
            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleExportMappings}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>

              <button
                onClick={handlePrintLabels}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Labels
              </button>

              <button
                onClick={() => setKitMappings([])}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors text-sm"
              >
                Clear
              </button>
            </div>

            {/* Mappings Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Desktop View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Wallet Address
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Kit ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {kitMappings.map((mapping, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {mapping.walletAddress}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono font-bold">
                          {mapping.kitId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden divide-y divide-gray-200">
                {kitMappings.map((mapping, idx) => (
                  <div key={idx} className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">#{idx + 1}</span>
                      <span className="font-mono font-bold text-sm">
                        {mapping.kitId}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-gray-600">
                      {mapping.walletAddress}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
