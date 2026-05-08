"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Calendar, Users, User, Sparkles, Zap, Crown } from "lucide-react";
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
  const proPrice = currencyLoading ? "$11.99" : formatPrice(12);

  return (
    <aside className="hidden lg:flex flex-col w-[240px] flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-hidden pt-5 pb-4">

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
