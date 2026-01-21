"use client";

interface Batch {
  id: number;
  state: string;
  participantCount: number;
  createdAt: string;
  completedAt?: string;
}

interface BatchHistoryProps {
  batches: Batch[];
  loading?: boolean;
}

export function BatchHistory({ batches, loading = false }: BatchHistoryProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Batch History</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "sequencing":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-yellow-100 text-yellow-800";
      case "staged":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Batch History</h3>
        <span className="text-sm text-gray-500">
          {batches.length} batch{batches.length !== 1 ? "es" : ""}
        </span>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No batches yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{batch.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStateColor(batch.state)}`}
                      >
                        {batch.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {batch.participantCount}/24
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {batch.completedAt
                        ? new Date(batch.completedAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">
                    Batch #{batch.id}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStateColor(batch.state)}`}
                  >
                    {batch.state}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participants:</span>
                    <span className="font-medium">{batch.participantCount}/24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {batch.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">
                        {new Date(batch.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
