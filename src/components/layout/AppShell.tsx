"use client";

import { useState } from "react";
import DashboardNav from "@/components/dashboard/DashboardNav";
import LeftSidebar from "@/components/dashboard/LeftSidebar";
import BottomNav from "@/components/ui/BottomNav";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import type { UpgradeReason } from "@/components/dashboard/UpgradeModal";
import { UpgradeProvider } from "@/contexts/UpgradeContext";
import CancellationBanner from "@/components/ui/CancellationBanner";
import TrialBanner from "@/components/ui/TrialBanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>("habits");
  const [showUpgrade, setShowUpgrade] = useState(false);

  function openUpgradeModal(reason: UpgradeReason = "habits") {
    setUpgradeReason(reason);
    setShowUpgrade(true);
  }

  return (
    <UpgradeProvider value={{ openUpgradeModal }}>
      <DashboardNav />
      <TrialBanner />
      <CancellationBanner />
      <BottomNav />
      <div className="flex">
        <LeftSidebar />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} reason={upgradeReason} />
      )}
    </UpgradeProvider>
  );
}
