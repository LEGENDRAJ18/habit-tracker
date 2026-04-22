"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, LogOut, Zap, ChevronDown, BarChart2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import type { Plan } from "@/types";

interface Props {
  habitCount: number;
  tier: Plan;
  onUpgradeClick?: () => void;
}

function PlanBadge({ tier }: { tier: Plan }) {
  if (tier === "pro") {
    return (
      <span
        className="text-[10px] font-bold px-2 py-px rounded-full border text-amber-200 uppercase tracking-widest"
        style={{
          background: "linear-gradient(135deg, rgba(120,80,0,0.55), rgba(90,55,0,0.45))",
          borderColor: "rgba(251,191,36,0.55)",
          boxShadow: "0 0 0 1px rgba(251,191,36,0.12), 0 0 12px 2px rgba(251,191,36,0.45)",
        }}
      >
        Pro
      </span>
    );
  }
  if (tier === "plus") {
    return (
      <span className="text-[10px] font-bold px-2 py-px rounded-full bg-violet-700/30 border border-violet-400/45 text-violet-300 uppercase tracking-widest">
        Plus
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-slate-800/50 border border-slate-700/40 text-slate-500 uppercase tracking-wide">
      Free
    </span>
  );
}

export default function DashboardNav({ habitCount, tier, onUpgradeClick }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const { canInstall, promptInstall } = usePWAInstall();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isFree = tier === "free";

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
            <Link
              href="/analytics"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                pathname === "/analytics"
                  ? "bg-violet-950/60 text-violet-300 border border-violet-800/40"
                  : "text-slate-500 hover:text-slate-300 hover:bg-violet-950/30"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Install App — shown when browser signals the PWA is installable */}
            {canInstall && (
              <button
                onClick={promptInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-violet-300 border border-slate-800/60 hover:border-violet-700/50 rounded-lg transition-all"
                title="Install HabitAI"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install</span>
              </button>
            )}

            {/* Upgrade CTA — only for free users at limit */}
            {isFree && habitCount >= 3 && (
              <button
                onClick={onUpgradeClick}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-300 text-xs font-medium rounded-lg transition-all"
              >
                <Zap className="w-3 h-3" />
                Upgrade
              </button>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-violet-950/50 text-slate-400 hover:text-white transition-all text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">U</span>
                </div>
                <PlanBadge tier={tier} />
                <ChevronDown className="w-3 h-3" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-[#0f0f1a] border border-violet-900/30 rounded-xl shadow-xl shadow-violet-950/40 py-1 z-50">
                  {isFree && (
                    <button
                      onClick={() => { setMenuOpen(false); onUpgradeClick?.(); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-violet-300 hover:bg-violet-950/50 transition-colors sm:hidden"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Upgrade
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-violet-950/50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
