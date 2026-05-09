"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Calendar, Users, User, Zap, Crown } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { useCurrency } from "@/contexts/CurrencyContext";

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
  const { formatPrice, currency, loading: currencyLoading } = useCurrency();
  const proPrice = currencyLoading ? "$9.99" : formatPrice(9.99);

  return (
    <aside className="hidden lg:flex flex-col w-[240px] flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-hidden pt-5 pb-4">

      {/* Discord community card */}
      <a
        href="https://discord.gg/U3FFHFq3"
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-5 bg-[#0c0c18] border border-[#5865F2]/25 hover:border-[#5865F2]/50 rounded-2xl p-3.5 transition-all group"
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#5865F2]/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#8891F7]" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-white leading-none">Join Community</p>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
          Tips, streaks &amp; accountability
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8891F7] group-hover:text-[#a5adf9] transition-colors">
          Join Discord — it&apos;s free
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </a>

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

      {/* Plus → Pro upgrade card */}
      {tier === "plus" && (
        <div className="mb-3 p-px rounded-xl bg-gradient-to-br from-amber-500/50 via-violet-500/30 to-amber-600/50">
          <div className="bg-[#0c0c18] rounded-[11px] p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-xs font-bold text-white leading-none">
                Go Pro for maximum results
              </p>
            </div>
            <p className="text-[10px] text-slate-500 mb-1 leading-relaxed">
              Unlock everything — {proPrice}/mo
            </p>
            <p className="text-[9px] text-slate-700 mb-3">Prices in {currency} · Charged in USD</p>
            <button
              onClick={() => openUpgradeModal("pro_feature", true)}
              className="w-full py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition-all shadow-md shadow-orange-900/20 flex items-center justify-center gap-1"
            >
              <Crown className="w-3 h-3" />
              Upgrade to Pro →
            </button>
          </div>
        </div>
      )}

      {/* Pro badge */}
      {tier === "pro" && (
        <div className="mb-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-900/25 to-orange-900/15 border border-amber-600/25">
          <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-xs font-bold text-amber-300">You&apos;re on Pro 🏆</span>
        </div>
      )}

    </aside>
  );
}
