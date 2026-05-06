"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Calendar, Users, User, Zap, Sparkles } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useUpgrade } from "@/contexts/UpgradeContext";

const NAV_LINKS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/analytics", icon: BarChart2,       label: "Analytics" },
  { href: "/calendar",  icon: Calendar,        label: "Calendar"  },
  { href: "/friends",   icon: Users,           label: "Friends"   },
  { href: "/profile",   icon: User,            label: "Profile"   },
];

export default function LeftSidebar() {
  const pathname = usePathname();
  const { tier } = useProfile();
  const { openUpgradeModal } = useUpgrade();

  return (
    <aside className="hidden lg:flex flex-col w-[240px] flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto scrollbar-none pt-5 pb-4">

      {/* Logo */}
      <Link href="/dashboard" className="flex flex-col items-center gap-4 mb-8 group">
        <div
          className="w-[72px] h-[72px] rounded-3xl bg-gradient-to-br from-violet-500 via-violet-600 to-purple-800 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
          style={{
            boxShadow:
              "0 0 0 1.5px rgba(167,139,250,0.45), 0 0 0 4px rgba(139,92,246,0.15), 0 0 40px 12px rgba(139,92,246,0.40), 0 6px 24px rgba(0,0,0,0.6)",
          }}
        >
          <Sparkles className="w-9 h-9 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[1.6rem] font-black text-white tracking-tight leading-none">
            habit<span className="text-violet-400">AI</span>
          </span>
          <span className="text-[10px] font-medium text-violet-500/70 tracking-[0.18em] uppercase leading-none">
            your ai coach
          </span>
        </div>
      </Link>

      {/* Nav links */}
      <nav className="space-y-0.5 mb-5">
        {NAV_LINKS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              data-tour={href === "/analytics" ? "analytics-nav" : undefined}
              aria-label={label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? "text-white font-bold"
                  : "text-slate-600 hover:text-slate-300 hover:bg-white/5 font-medium"
              }`}
              style={isActive ? {
                backgroundColor: "rgba(var(--a-r), var(--a-g), var(--a-b), 0.2)",
                boxShadow: "inset 3px 0 0 0 var(--a-600), 0 0 24px rgba(var(--a-r), var(--a-g), var(--a-b), 0.12)",
              } : undefined}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0 transition-colors"
                style={isActive ? { color: "var(--a-400)" } : undefined}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Discord */}
      <a
        href="https://discord.gg/U3FFHFq3"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#5865F2]/25 hover:border-[#5865F2]/50 text-[#8891F7] hover:text-[#a5adf9] transition-all mb-2"
      >
        <div className="w-6 h-6 rounded-lg bg-[#5865F2]/20 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        </div>
        <p className="text-xs font-semibold leading-none">Join Discord</p>
      </a>

      {/* Upgrade for free users */}
      {tier === "free" && (
        <button
          onClick={() => openUpgradeModal()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-300 text-sm font-medium rounded-xl transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          Upgrade Plan
        </button>
      )}
    </aside>
  );
}
