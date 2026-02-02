"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { BatchManagement } from "@/components/admin/BatchManagement";
import { ShippingDataViewer } from "@/components/admin/ShippingDataViewer";
import { MetadataExporter } from "@/components/admin/MetadataExporter";
import { ResultsUploader } from "@/components/admin/ResultsUploader";
import {
  Users,
  Package,
  Download,
  Upload,
} from "lucide-react";

function ConnectButton() {
  const { connect, connectors } = useConnect();

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
    >
      Connect Wallet
    </button>
  );
}

type Tab = "batches" | "shipping" | "exporter" | "uploader";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("batches");
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const tabs = [
    { id: "batches" as Tab, name: "Batch Management", icon: Users },
    { id: "shipping" as Tab, name: "Shipping Data", icon: Package },
    { id: "exporter" as Tab, name: "Metadata Export", icon: Download },
    { id: "uploader" as Tab, name: "Results Upload", icon: Upload },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back to Home</span>
              </a>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
            </div>
            {/* Wallet Connect Button */}
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <div className="text-xs text-gray-500">Connected</div>
                  <div className="text-sm font-mono text-gray-900">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to access the admin dashboard.
              </p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Make sure your wallet is connected to Hardhat Local (Chain ID: 31337)
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "batches" && <BatchManagement />}
        {activeTab === "shipping" && <ShippingDataViewer />}
        {activeTab === "exporter" && <MetadataExporter />}
        {activeTab === "uploader" && <ResultsUploader />}
      </div>

      {/* Admin Warning */}
      <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Admin Mode:</strong> You have access to sensitive operations. Most features are mock implementations for demonstration purposes.
            </p>
          </div>
        </div>
      </div>
          </>
        )}
      </div>
    </div>
  );
}
