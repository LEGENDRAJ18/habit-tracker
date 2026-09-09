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
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import MobileXPBar from "@/components/ui/MobileXPBar";
import AIInsightModal from "@/components/dashboard/AIInsightModal";
import { useProfile } from "@/hooks/useProfile";
import { AIInsightProvider } from "@/contexts/AIInsightContext";
import { useInstallBannerReservedHeight } from "@/contexts/InstallBannerContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>("habits");
  const [upgradeFromPlus, setUpgradeFromPlus] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAIInsight, setShowAIInsight] = useState(false);
  const { tier } = useProfile();
  // DashboardNav is sticky, not fixed — it doesn't get pushed down by the
  // (fixed, out-of-flow) install banner on its own, so on first load the
  // banner sat on top of it (logo/level/XP/PRO badge fully hidden). Only
  // "invisible" because the content further down happened to sit low enough
  // to clear the banner anyway. Reserve real space instead of relying on that.
  const bannerReservedHeight = useInstallBannerReservedHeight();

  function openUpgradeModal(reason: UpgradeReason = "habits", fromPlus = false) {
    setUpgradeReason(reason);
    setUpgradeFromPlus(fromPlus);
    setShowUpgrade(true);
  }

  function openAIInsight() { setShowAIInsight(true); }

  return (
    <UpgradeProvider value={{ openUpgradeModal }}>
      <AIInsightProvider value={{ openAIInsight }}>
        <div style={{ paddingTop: bannerReservedHeight, transition: "padding-top 0.25s ease" }}>
          <DashboardNav />
          <MobileXPBar />
        </div>
        <OfflineIndicator />
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
