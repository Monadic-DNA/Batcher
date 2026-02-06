"use client";

import { useState, useEffect } from "react";
import { getCurrentBatchId, getBatchInfo } from "@/lib/contract";
import { useAccount } from "wagmi";
import { Link, CheckCircle, AlertCircle, Lock } from "lucide-react";

export function ResultsUploader() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Array<{ id: number; state: string; participantCount: number }>>([]);

  const stateNames = ["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"];
  const s3BaseUrl = process.env.NEXT_PUBLIC_S3_RESULTS_BASE_URL || "Not configured";

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

      const loadedBatches = batchInfos.map((info, index) => ({
        id: index + 1,
        state: stateNames[info.state],
        participantCount: info.participantCount,
      }));

      setBatches(loadedBatches.filter(b => b.state === "Sequencing" || b.state === "Completed"));
    } catch (error) {
      console.error("Error loading batches:", error);
    } finally {
      setLoading(false);
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
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Lock className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">Results Storage Information</h3>
          <p className="text-sm text-blue-700 mb-2">
            DNA sequencing results are stored in S3 and accessed using a standardized path structure.
            No per-batch configuration is needed - the system automatically constructs the correct path.
          </p>
          <p className="text-xs text-blue-600 font-medium">
            File path pattern: <code className="bg-blue-100 px-1 rounded">{'{S3_BASE_URL}'}/{'{batch_id}'}/{'{kit_id}'}.csv</code>
          </p>
        </div>
      </div>

      {/* S3 Configuration Display */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Storage Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              S3 Base URL
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
              {s3BaseUrl}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Configured via <code className="bg-gray-100 px-1 rounded">S3_RESULTS_BASE_URL</code> environment variable
            </p>
          </div>
        </div>
      </div>

      {/* Batch Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Batches Ready for Results</h2>

        {batches.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No batches in Sequencing or Completed state
          </p>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Batch #{batch.id}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      State: <span className="font-medium">{batch.state}</span> •
                      Participants: <span className="font-medium">{batch.participantCount}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-mono">Results path:</p>
                    <p className="text-xs font-mono text-indigo-600">
                      /{batch.id}/[kit_id].csv
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Example Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">S3 Bucket Setup Guide</h3>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">1. S3 Bucket Structure</h4>
            <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto">
              <pre>{`my-results-bucket/
├── 1/
│   ├── KIT-ABC12345.csv
│   ├── KIT-DEF67890.csv
│   └── ...
├── 2/
│   ├── KIT-GHI24680.csv
│   └── ...
└── 3/
    └── ...`}</pre>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Results are organized by batch ID, with each kit&apos;s results in a separate CSV file
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">2. CSV File Format (per kit)</h4>
            <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto">
              <pre>{`rsID,Chromosome,Position,Reference,Alternate,GenotypeProbability,pValue,Trait
rs123,chr1,12345,A,G,0.75,0.0001,Diabetes risk
rs456,chr2,67890,C,T,0.82,0.002,Height variation
...`}</pre>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">3. Access Control</h4>
            <p className="text-sm text-gray-600 mb-2">
              Recommended approaches for secure access:
            </p>
            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>API generates pre-signed URLs per participant (recommended)</li>
              <li>CloudFront distribution with signed URLs</li>
              <li>Lambda@Edge for authentication at the edge</li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              Note: Results are fetched server-side by the API after PIN verification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
