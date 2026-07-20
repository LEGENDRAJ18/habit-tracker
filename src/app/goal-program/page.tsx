"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useHabits } from "@/hooks/useHabits";
import { useUpgrade } from "@/contexts/UpgradeContext";
import type { GoalProgram, ProgramCheckin } from "@/types";
import FeatureUpgradeGate from "@/components/dashboard/FeatureUpgradeGate";
import GoalProgramCreate from "@/components/dashboard/GoalProgramCreate";
import GoalProgramDashboard from "@/components/dashboard/GoalProgramDashboard";
import BottomNav from "@/components/ui/BottomNav";

export default function GoalProgramPage() {
  const { tier, profileLoading } = useProfile();
  const { habits, historicalLogs, isCompletedToday } = useHabits();
  const { openUpgradeModal } = useUpgrade();

  const [program, setProgram] = useState<GoalProgram | null>(null);
  const [checkins, setCheckins] = useState<ProgramCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (tier !== "pro") { if (!cancelled) setLoading(false); return; }
      try {
        const res = await fetch("/api/goal-program/active");
        const data = await res.json();
        if (!cancelled && res.ok) {
          setProgram(data.program);
          setCheckins(data.checkins ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tier]);

  return (
    <div className="min-h-screen bg-[#09090f] pb-24 sm:pb-8">
      <div className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-semibold text-white">AI Goal Program</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {profileLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
        ) : tier !== "pro" ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-violet-950/50 to-[#0f0f1a] border border-violet-600/25 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-violet-700/30 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-violet-300" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">AI Goal Program</h1>
                  <p className="text-xs text-violet-400">Pro · A multi-week plan built around your goal</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tell the AI what you want to achieve and it designs a phased program — with the right habits, weekly milestones, and check-ins — then adds Week 1 straight to your dashboard.
              </p>
            </div>

            {/* Blurred sample preview */}
            <div className="relative rounded-2xl overflow-hidden">
              <div className="blur-sm pointer-events-none select-none opacity-60 space-y-3">
                <div className="rounded-2xl border border-violet-900/25 bg-[#0f0f1a] p-4">
                  <p className="text-sm font-bold text-white mb-1">Couch to 5K in 8 Weeks</p>
                  <p className="text-xs text-slate-500 mb-3">Phase 1 of 3 · Week 2 of 3</p>
                  <div className="w-full h-1.5 bg-violet-950/60 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-900/25 bg-[#0f0f1a] p-4">
                  <p className="text-xs font-semibold text-violet-400 mb-1">This week&apos;s milestone</p>
                  <p className="text-sm text-white">Run 3x this week without stopping</p>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <FeatureUpgradeGate
                  requiredTier="pro"
                  featureName="AI Goal Program"
                  description="Get a personalized, phased habit plan for your biggest goal."
                  features={[
                    "AI-designed multi-week program",
                    "Auto-adds the right habits each phase",
                    "Weekly milestones + check-ins",
                    "Adjusts when life gets busy",
                  ]}
                  onUpgrade={() => openUpgradeModal("pro_feature", tier === "plus")}
                />
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
        ) : program && program.status !== "abandoned" ? (
          <GoalProgramDashboard
            program={program}
            checkins={checkins}
            habits={habits}
            historicalLogs={historicalLogs}
            isCompletedToday={isCompletedToday}
            onProgramUpdated={setProgram}
          />
        ) : (
          <GoalProgramCreate onCreated={setProgram} />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
