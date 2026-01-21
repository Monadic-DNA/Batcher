"use client";

import { useState } from "react";
import { BatchManagement } from "@/components/admin/BatchManagement";
import { ShippingDataViewer } from "@/components/admin/ShippingDataViewer";
import { KitRandomizer } from "@/components/admin/KitRandomizer";
import { MetadataExporter } from "@/components/admin/MetadataExporter";
import { ResultsUploader } from "@/components/admin/ResultsUploader";
import {
  Users,
  Package,
  Shuffle,
  Download,
  Upload,
} from "lucide-react";

type Tab = "batches" | "shipping" | "randomizer" | "exporter" | "uploader";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("batches");

  const tabs = [
    { id: "batches" as Tab, name: "Batch Management", icon: Users },
    { id: "shipping" as Tab, name: "Shipping Data", icon: Package },
    { id: "randomizer" as Tab, name: "Kit Randomizer", icon: Shuffle },
    { id: "exporter" as Tab, name: "Metadata Export", icon: Download },
    { id: "uploader" as Tab, name: "Results Upload", icon: Upload },
  ];

  return (
    <div>
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
        {activeTab === "randomizer" && <KitRandomizer />}
        {activeTab === "exporter" && <MetadataExporter />}
        {activeTab === "uploader" && <ResultsUploader />}
      </div>
    </div>
  );
}
