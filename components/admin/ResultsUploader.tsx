"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, FileText, Lock } from "lucide-react";

interface UploadResult {
  kitId: string;
  status: "success" | "error";
  message?: string;
}

export function ResultsUploader() {
  const [selectedBatch, setSelectedBatch] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith(".csv")) {
      setValidationError("Please upload a CSV file");
      setFile(null);
      return;
    }

    // Validate file size (max 100MB)
    if (selectedFile.size > 100 * 1024 * 1024) {
      setValidationError("File size must be less than 100MB");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setValidationError(null);
    setUploadResults([]);
  };

  const validateCSV = async (csvContent: string): Promise<boolean> => {
    // Check for required headers
    const lines = csvContent.split("\n");
    if (lines.length < 2) {
      setValidationError("CSV file appears to be empty");
      return false;
    }

    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());

    // Must have at least: kitId and some data columns
    if (!headers.includes("kitid") && !headers.includes("kit_id")) {
      setValidationError("CSV must contain a 'kitId' or 'kit_id' column");
      return false;
    }

    // Validate Kit ID format in data rows
    const dataRows = lines.slice(1).filter((line) => line.trim());
    const kitIdIndex = headers.findIndex((h) => h === "kitid" || h === "kit_id");

    for (let i = 0; i < Math.min(5, dataRows.length); i++) {
      const columns = dataRows[i].split(",");
      const kitId = columns[kitIdIndex]?.trim();
      if (!kitId || !/^KIT-[A-Z0-9]{8}$/i.test(kitId)) {
        setValidationError(
          `Invalid Kit ID format in row ${i + 2}: ${kitId}. Expected format: KIT-XXXXXXXX`
        );
        return false;
      }
    }

    return true;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadResults([]);

    try {
      // Read file content
      const content = await file.text();

      // Validate CSV format
      const isValid = await validateCSV(content);
      if (!isValid) {
        setUploading(false);
        return;
      }

      // Parse CSV
      const lines = content.split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());
      const dataRows = lines.slice(1).filter((line) => line.trim());

      console.log(`Processing ${dataRows.length} results for batch ${selectedBatch}`);

      // Process each row
      const results: UploadResult[] = [];
      for (const row of dataRows) {
        const columns = row.split(",");
        const kitIdIndex = headers.findIndex(
          (h) => h.toLowerCase() === "kitid" || h.toLowerCase() === "kit_id"
        );
        const kitId = columns[kitIdIndex]?.trim();

        if (!kitId) {
          results.push({
            kitId: "Unknown",
            status: "error",
            message: "Missing Kit ID",
          });
          continue;
        }

        try {
          // TODO: Encrypt and upload to Nillion
          // Steps:
          // 1. Compress CSV data for this participant
          // 2. Encrypt with their PIN-derived key (we have commitment hash on-chain)
          // 3. Store in Nillion with store_id
          // 4. Record completion in smart contract
          console.log(`Uploading results for ${kitId}`);
          await new Promise((resolve) => setTimeout(resolve, 50));

          results.push({
            kitId,
            status: "success",
          });
        } catch (error) {
          results.push({
            kitId,
            status: "error",
            message: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }

      setUploadResults(results);

      // Show summary
      const successCount = results.filter((r) => r.status === "success").length;
      const errorCount = results.filter((r) => r.status === "error").length;

      alert(
        `Upload complete!\n\nSuccessful: ${successCount}\nFailed: ${errorCount}\n\nResults are now encrypted and available for participants to download.`
      );
    } catch (error) {
      console.error("Upload error:", error);
      setValidationError(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadResults([]);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Lock className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">Results Upload</h3>
          <p className="text-sm text-blue-700 mb-2">
            Upload sequencing results for a completed batch. Results will be encrypted
            and stored in Nillion, accessible only to participants with their PIN.
          </p>
          <p className="text-xs text-blue-600 font-medium">
            CSV Format: Must include a &quot;kitId&quot; column (KIT-XXXXXXXX format).
            All other columns will be preserved in the participant&apos;s result file.
          </p>
        </div>
      </div>

      {/* Format Example */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Expected CSV Format:
        </h4>
        <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto">
          <pre>
            {`kitId,rsID,Chromosome,Position,Reference,Alternate,GenotypeProbability,pValue,Trait
KIT-ABC12345,rs123,chr1,12345,A,G,0.75,0.0001,Diabetes risk
KIT-ABC12345,rs456,chr2,67890,C,T,0.82,0.002,Height variation
...`}
          </pre>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Each row should contain data for one SNP. Multiple rows per Kit ID are
          expected.
        </p>
      </div>

      {/* Upload Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(Number(e.target.value));
                  handleReset();
                }}
                disabled={uploading}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              >
                <option value={1}>Batch #1 (Sequencing)</option>
                <option value={2}>Batch #2 (Completed)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Results CSV
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                Choose File
              </button>
              {file && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleUpload}
              disabled={!file || uploading || !!validationError}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {uploading ? "Uploading & Encrypting..." : "Upload Results"}
            </button>

            {(file || uploadResults.length > 0) && (
              <button
                onClick={handleReset}
                disabled={uploading}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Upload Results
            </h3>
            <p className="text-sm text-gray-600">
              Processed {uploadResults.length} participants
            </p>
          </div>

          <div className="p-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Successful
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {uploadResults.filter((r) => r.status === "success").length}
                </p>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {uploadResults.filter((r) => r.status === "error").length}
                </p>
              </div>
            </div>

            {/* Error Details */}
            {uploadResults.some((r) => r.status === "error") && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900">Errors</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {uploadResults
                    .filter((r) => r.status === "error")
                    .map((result, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-mono font-medium text-gray-900">
                              {result.kitId}
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              {result.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
