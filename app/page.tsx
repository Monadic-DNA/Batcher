"use client";

import { useAuth, AuthButton } from "@/components/AuthProvider";
import { useEffect } from "react";

export default function Home() {
  const {
    isAuthenticated,
    user,
    batchInfo,
    checkingBatch,
    initializeDynamic,
    isDynamicInitialized,
  } = useAuth();

  // Initialize Dynamic on component mount
  useEffect(() => {
    if (!isDynamicInitialized) {
      initializeDynamic();
    }
  }, [isDynamicInitialized, initializeDynamic]);

  const walletAddress = (user as any)?.verifiedCredentials?.[0]?.address;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Monadic DNA Batcher</h1>
            <p className="text-lg text-gray-600">
              Privacy-preserving DNA testing batch coordination system
            </p>
          </div>
          <AuthButton />
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Connect your wallet to join the waiting list</li>
            <li>Pay 10% deposit when joining a batch (24 participants)</li>
            <li>Pay 90% balance within 7 days when batch activates</li>
            <li>Register your DNA kit with a secure PIN</li>
            <li>
              Receive encrypted results after sequencing (claim within 60 days)
            </li>
          </ol>
        </div>

        {isAuthenticated ? (
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Your Status</h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Wallet:</span>{" "}
                {walletAddress?.substring(0, 6)}...
                {walletAddress?.substring(38)}
              </p>

              {checkingBatch ? (
                <p className="text-gray-600">Checking batch status...</p>
              ) : batchInfo ? (
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Batch ID:</span>{" "}
                    {batchInfo.batchId}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {batchInfo.batchState}
                  </p>
                  <p>
                    <span className="font-medium">Joined:</span>{" "}
                    {batchInfo.joined ? "Yes" : "No"}
                  </p>
                  {batchInfo.joined && (
                    <>
                      <p>
                        <span className="font-medium">Deposit Paid:</span>{" "}
                        {batchInfo.depositPaid ? "Yes" : "No"}
                      </p>
                      <p>
                        <span className="font-medium">Balance Paid:</span>{" "}
                        {batchInfo.balancePaid ? "Yes" : "No"}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">
                  Not currently in a batch. Join now to get started!
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-700 mb-4">
              Connect your wallet to get started
            </p>
            <p className="text-sm text-gray-500">
              We use Dynamic.xyz for secure wallet authentication
            </p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold mb-2">Privacy First</h4>
            <p className="text-sm text-gray-600">
              Your data is encrypted and stored in Nillion&apos;s
              privacy-preserving database
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold mb-2">Batch Coordination</h4>
            <p className="text-sm text-gray-600">
              Smart contracts ensure fair participation and automated batch
              management
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold mb-2">Flexible Payments</h4>
            <p className="text-sm text-gray-600">
              Pay with crypto (on-chain) or credit card (Stripe) - your choice
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
