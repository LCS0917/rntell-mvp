"use client";

import { useState } from "react";
import { TrendingUp, Users } from "lucide-react";
import PayIntelligenceClient from "@/components/intelligence/PayIntelligenceClient";
import CommunityReportsTab from "@/components/pay/CommunityReportsTab";

const TABS = [
  { id: "market-value", label: "My Market Value", icon: TrendingUp },
  { id: "community", label: "Community Reports", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PayCenterClient() {
  const [activeTab, setActiveTab] = useState<TabId>("market-value");

  return (
    <div>
      {/* Tab Bar */}
      <div className="mb-6 flex gap-1 rounded-lg border border-brand-gray-200 bg-white p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-orange text-white shadow-sm"
                  : "text-brand-gray-500 hover:bg-brand-gray-100 hover:text-brand-charcoal"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "market-value" && <PayIntelligenceClient />}
        {activeTab === "community" && <CommunityReportsTab />}
      </div>
    </div>
  );
}
