"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import DashboardNav from "@/components/dashboard/DashboardNav";
import LeftSidebar from "@/components/dashboard/LeftSidebar";
import BottomNav from "@/components/ui/BottomNav";
import BackToDashboardButton from "@/components/ui/BackToDashboardButton";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import type { UpgradeReason } from "@/components/dashboard/UpgradeModal";
import { UpgradeProvider } from "@/contexts/UpgradeContext";
import CancellationBanner from "@/components/ui/CancellationBanner";
import TrialBanner from "@/components/ui/TrialBanner";
import MobileXPBar from "@/components/ui/MobileXPBar";
import AIInsightModal from "@/components/dashboard/AIInsightModal";
import { useProfile } from "@/hooks/useProfile";
import { AIInsightProvider } from "@/contexts/AIInsightContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>("habits");
  const [upgradeFromPlus, setUpgradeFromPlus] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAIInsight, setShowAIInsight] = useState(false);
  const { tier } = useProfile();

  function openUpgradeModal(reason: UpgradeReason = "habits", fromPlus = false) {
    setUpgradeReason(reason);
    setUpgradeFromPlus(fromPlus);
    setShowUpgrade(true);
  }

  function openAIInsight() { setShowAIInsight(true); }

  return (
    <UpgradeProvider value={{ openUpgradeModal }}>
      <AIInsightProvider value={{ openAIInsight }}>
        <DashboardNav />
        <MobileXPBar />
        <TrialBanner />
        <CancellationBanner />
        <BottomNav />
        <div className="flex">
          <LeftSidebar />
          <div className="flex-1 min-w-0 route-enter">
            {children}
            {pathname !== "/dashboard" && <BackToDashboardButton />}
          </div>
        </div>
        {showUpgrade && (
          <UpgradeModal
            onClose={() => setShowUpgrade(false)}
            reason={upgradeReason}
            fromPlus={upgradeFromPlus}
          />
        )}
        {showAIInsight && (
          <AIInsightModal
            tier={tier}
            onClose={() => setShowAIInsight(false)}
            onUpgrade={() => { setShowAIInsight(false); openUpgradeModal("ai"); }}
          />
        )}
      </AIInsightProvider>
    </UpgradeProvider>
  );
}
