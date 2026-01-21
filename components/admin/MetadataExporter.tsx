"use client";

import { useState } from "react";
import { Download, FileText, AlertCircle } from "lucide-react";

interface ParticipantMetadata {
  kitId: string;
  age?: number;
  sex?: string;
  ethnicity?: string;
}

export function MetadataExporter() {
  const [selectedBatch, setSelectedBatch] = useState<number>(1);
  const [metadata, setMetadata] = useState<ParticipantMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeAge, setIncludeAge] = useState(true);
  const [includeSex, setIncludeSex] = useState(true);
  const [includeEthnicity, setIncludeEthnicity] = useState(true);

  const handleFetchMetadata = async () => {
    setLoading(true);
    try {
      // TODO: Fetch encrypted metadata from Nillion for each participant
      // Only fetch the fields that were provided (age/sex/ethnicity are optional)
      console.log("Fetching metadata for batch", selectedBatch);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock data - in production, decrypt from Nillion
      const mockData: ParticipantMetadata[] = Array.from(
        { length: 24 },
        (_, i) => ({
          kitId: `KIT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          age: Math.random() > 0.3 ? Math.floor(Math.random() * 50) + 20 : undefined,
          sex:
            Math.random() > 0.2
              ? ["Male", "Female", "Other"][Math.floor(Math.random() * 3)]
              : undefined,
          ethnicity:
            Math.random() > 0.3
              ? ["Caucasian", "African", "Asian", "Hispanic", "Mixed"][
                  Math.floor(Math.random() * 5)
                ]
              : undefined,
        })
      );

      setMetadata(mockData);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      alert("Failed to fetch metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleExportForLab = () => {
    if (metadata.length === 0) return;

    // Build headers based on selected fields
    const headers = ["Kit ID"];
    if (includeAge) headers.push("Age");
    if (includeSex) headers.push("Sex");
    if (includeEthnicity) headers.push("Ethnicity");

    // Build rows
    const rows = metadata.map((m) => {
      const row = [m.kitId];
      if (includeAge) row.push(m.age?.toString() || "Not provided");
      if (includeSex) row.push(m.sex || "Not provided");
      if (includeEthnicity) row.push(m.ethnicity || "Not provided");
      return row;
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-${selectedBatch}-metadata-lab-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExportSummary = () => {
    if (metadata.length === 0) return;

    // Calculate statistics
    const stats = {
      totalParticipants: metadata.length,
      ageProvided: metadata.filter((m) => m.age).length,
      sexProvided: metadata.filter((m) => m.sex).length,
      ethnicityProvided: metadata.filter((m) => m.ethnicity).length,
      averageAge:
        metadata.filter((m) => m.age).reduce((sum, m) => sum + (m.age || 0), 0) /
        metadata.filter((m) => m.age).length,
      sexDistribution: metadata.reduce(
        (acc, m) => {
          if (m.sex) acc[m.sex] = (acc[m.sex] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      ethnicityDistribution: metadata.reduce(
        (acc, m) => {
          if (m.ethnicity) acc[m.ethnicity] = (acc[m.ethnicity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    const summary = `
Batch ${selectedBatch} Metadata Summary
Generated: ${new Date().toLocaleString()}

OVERVIEW
========
Total Participants: ${stats.totalParticipants}
Age Data Provided: ${stats.ageProvided} (${((stats.ageProvided / stats.totalParticipants) * 100).toFixed(1)}%)
Sex Data Provided: ${stats.sexProvided} (${((stats.sexProvided / stats.totalParticipants) * 100).toFixed(1)}%)
Ethnicity Data Provided: ${stats.ethnicityProvided} (${((stats.ethnicityProvided / stats.totalParticipants) * 100).toFixed(1)}%)

STATISTICS
==========
Average Age: ${stats.averageAge.toFixed(1)} years

Sex Distribution:
${Object.entries(stats.sexDistribution)
  .map(([sex, count]) => `  ${sex}: ${count} (${((count / stats.sexProvided) * 100).toFixed(1)}%)`)
  .join("\n")}

Ethnicity Distribution:
${Object.entries(stats.ethnicityDistribution)
  .map(([eth, count]) => `  ${eth}: ${count} (${((count / stats.ethnicityProvided) * 100).toFixed(1)}%)`)
  .join("\n")}

NOTE
====
This summary contains aggregate statistics only and does not link
individual metadata to wallet addresses or Kit IDs.
    `.trim();

    const blob = new Blob([summary], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-${selectedBatch}-metadata-summary-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">Lab Metadata Export</h3>
          <p className="text-sm text-blue-700">
            Export optional metadata (age, sex, ethnicity) linked to Kit IDs for lab
            analysis. This data helps improve sequencing quality and result
            interpretation, but is completely optional and provided at the
            participant&apos;s discretion.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(Number(e.target.value));
                setMetadata([]);
              }}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={1}>Batch #1 (Sequencing)</option>
              <option value={2}>Batch #2 (Active)</option>
            </select>
          </div>

          <button
            onClick={handleFetchMetadata}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-5 h-5" />
            {loading ? "Loading..." : "Fetch Metadata"}
          </button>
        </div>

        {/* Field Selection */}
        {metadata.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Include in Lab Export:
            </h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAge}
                  onChange={(e) => setIncludeAge(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Age</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSex}
                  onChange={(e) => setIncludeSex(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Sex</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEthnicity}
                  onChange={(e) => setIncludeEthnicity(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Ethnicity</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {metadata.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Metadata Retrieved
            </h3>
            <p className="text-sm text-gray-600">
              {metadata.length} participants • Data completion:{" "}
              {(
                ((metadata.filter((m) => m.age).length +
                  metadata.filter((m) => m.sex).length +
                  metadata.filter((m) => m.ethnicity).length) /
                  (metadata.length * 3)) *
                100
              ).toFixed(0)}
              %
            </p>
          </div>

          <div className="p-6">
            {/* Export Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleExportForLab}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export for Lab (CSV)
              </button>

              <button
                onClick={handleExportSummary}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Export Summary (TXT)
              </button>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <p className="text-xs text-gray-600 mb-3">Preview (first 5 rows):</p>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-3 font-medium">Kit ID</th>
                    {includeAge && (
                      <th className="text-left py-2 px-3 font-medium">Age</th>
                    )}
                    {includeSex && (
                      <th className="text-left py-2 px-3 font-medium">Sex</th>
                    )}
                    {includeEthnicity && (
                      <th className="text-left py-2 px-3 font-medium">Ethnicity</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {metadata.slice(0, 5).map((m, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-3 font-mono">{m.kitId}</td>
                      {includeAge && (
                        <td className="py-2 px-3">{m.age || "N/A"}</td>
                      )}
                      {includeSex && <td className="py-2 px-3">{m.sex || "N/A"}</td>}
                      {includeEthnicity && (
                        <td className="py-2 px-3">{m.ethnicity || "N/A"}</td>
                      )}
                    </tr>
                  ))}
                  {metadata.length > 5 && (
                    <tr>
                      <td
                        colSpan={
                          1 +
                          (includeAge ? 1 : 0) +
                          (includeSex ? 1 : 0) +
                          (includeEthnicity ? 1 : 0)
                        }
                        className="py-2 px-3 text-gray-500 italic text-center"
                      >
                        ... and {metadata.length - 5} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
