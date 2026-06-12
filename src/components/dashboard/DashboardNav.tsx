"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles, LogOut, Zap, ChevronDown, BarChart2,
  User, Settings, CreditCard, HelpCircle,
  Keyboard, Users, Calendar, ChevronLeft, ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AvatarDisplay from "@/components/ui/AvatarDisplay";
import { useProfile } from "@/hooks/useProfile";
import { useXP } from "@/hooks/useXP";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { useAIInsight } from "@/contexts/AIInsightContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  levelColorKey, xpProgressPct,
  xpIntoLevel,
  type LevelColorKey,
} from "@/lib/xp";
import { getNextReward } from "@/lib/rewards";
import type { Plan } from "@/types";

const LEVEL_COLORS: Record<LevelColorKey, { bar: string; text: string; ring: string; bg: string }> = {
  slate:   { bar: "from-slate-500 to-slate-400",   text: "text-slate-300",  ring: "ring-slate-600/50",   bg: "bg-slate-700/20"   },
  emerald: { bar: "from-emerald-500 to-teal-400",   text: "text-emerald-300", ring: "ring-emerald-600/50", bg: "bg-emerald-900/20" },
  blue:    { bar: "from-blue-500 to-cyan-400",      text: "text-blue-300",   ring: "ring-blue-600/50",    bg: "bg-blue-900/20"    },
  violet:  { bar: "from-violet-500 to-fuchsia-400", text: "text-violet-300", ring: "ring-violet-600/50",  bg: "bg-violet-900/20"  },
  amber:   { bar: "from-amber-400 to-yellow-300",   text: "text-amber-300",  ring: "ring-amber-500/60",   bg: "bg-amber-900/20"   },
  red:     { bar: "from-red-500 to-orange-400",     text: "text-red-300",    ring: "ring-red-600/60",     bg: "bg-red-900/20"     },
  gold:    { bar: "from-yellow-400 to-amber-300",   text: "text-yellow-200", ring: "ring-yellow-400/70",  bg: "bg-yellow-900/20"  },
};

function getInitials(email: string): string {
  const local = email.split("@")[0];
  const parts = local.split(/[._\-+]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
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

/** Compact XP pill shown in the navbar on mobile only */
function MobileNavXP() {
  const { xp, level, xpLoading } = useXP();
  const colorKey = levelColorKey(level);
  const s        = LEVEL_COLORS[colorKey];
  const into     = xpIntoLevel(xp);

  if (xpLoading) return (
    <div className="sm:hidden h-7 w-28 skeleton rounded-full flex-shrink-0" />
  );

  return (
    <div data-tour="xp-level" className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-violet-950/40 border border-violet-800/25 flex-shrink-0">
      <span className={`text-[11px] font-bold ${s.text} leading-none`}>Lv {level}</span>
      <span className="text-slate-700 text-[10px] select-none leading-none">·</span>
      <span className="text-[11px] font-medium text-slate-300 tabular-nums leading-none">
        {into.toLocaleString()} XP
      </span>
    </div>
  );
}

/** Full XP widget shown on desktop (sm+) */
function NavXP() {
  const { xp, level, xpLoading } = useXP();
  const colorKey   = levelColorKey(level);
  const s          = LEVEL_COLORS[colorKey];
  const pct        = xpProgressPct(xp);
  const into       = xpIntoLevel(xp);
  const nextReward = getNextReward(level);

  if (xpLoading) return (
    <div className="hidden sm:block h-9 w-40 skeleton rounded-lg flex-shrink-0" />
  );

  return (
    <div data-tour="xp-level" className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-violet-950/30 border border-violet-900/25 flex-shrink-0">
      <div className={`w-6 h-6 rounded-lg ${s.bg} ring-1 ${s.ring} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-[11px] font-extrabold ${s.text} leading-none`}>{level}</span>
      </div>
      <div className="flex flex-col gap-0.5 min-w-[100px]">
        <div className="h-1.5 bg-violet-950/60 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${s.bar} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[9px] font-medium tabular-nums ${s.text} leading-none whitespace-nowrap`}>
          {into.toLocaleString()} XP
          {nextReward && (
            <span className="text-slate-600 font-normal">
              {" · "}Next reward: Lv {nextReward.level} {nextReward.icon}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function DashboardNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const { tier, username: profileUsername, avatarId: profileAvatarId } = useProfile();
  const { openUpgradeModal } = useUpgrade();
  const { openAIInsight } = useAIInsight();
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [initials, setInitials]     = useState("··");
  const [userEmail, setUserEmail]   = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // username and avatarId come from useProfile (single shared fetch — no extra round-trip)
  const avatarId = profileAvatarId;
  const username = profileUsername;

  const isFree = tier === "free";

  const PAGE_META: Record<string, { label: string; Icon: React.ElementType }> = {
    "/dashboard":     { label: "Dashboard",      Icon: LayoutDashboard },
    "/analytics":     { label: "Analytics",      Icon: BarChart2 },
    "/calendar":      { label: "Calendar",       Icon: Calendar  },
    "/friends":       { label: "Friends",        Icon: Users     },
    "/profile":       { label: "Profile",        Icon: User      },
    "/settings":      { label: "Settings",       Icon: Settings  },
    "/help":          { label: "Help & Support", Icon: HelpCircle },
    "/organisations": { label: "Organisations",  Icon: Users     },
    "/groups":        { label: "Group Habits",   Icon: Users     },
  };
  const pageMeta = PAGE_META[pathname];

  // Email/initials: getSession() reads from localStorage — instant, no network round-trip
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email;
      if (email) { setUserEmail(email); setInitials(getInitials(email)); }
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navLink = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        pathname === href
          ? "bg-violet-950/60 text-violet-300 border border-violet-800/40"
          : "text-slate-500 hover:text-slate-300 hover:bg-violet-950/30"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );

  return (
    <nav className="sticky top-0 z-40 bg-[#09090f]/95 backdrop-blur-xl border-b border-violet-900/25 pt-safe-nav"
      style={{ boxShadow: "0 1px 0 rgba(109,40,217,0.10), 0 2px 16px rgba(0,0,0,0.35)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/*
          Mobile  (< sm): h-14, logo LEFT, spacer, XP pill + avatar + badge
          Desktop (sm+) : h-16, nav/page-title LEFT, logo CENTER, XP + AI + menu RIGHT
        */}
        <div className="flex items-center h-14 sm:h-16 relative">

          {/* ── LEFT ─────────────────────────────────────────────── */}

          {/* Mobile logo — left-aligned, flex-shrink-0, never cut off */}
          <Link
            href="/dashboard"
            aria-label="HabitAI Dashboard"
            className="sm:hidden flex items-center gap-2.5 flex-shrink-0 group"
          >
            <div
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-violet-600 to-purple-800 flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:brightness-110"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(167,139,250,0.35), 0 0 14px 4px rgba(139,92,246,0.28)",
              }}
            >
              <Sparkles className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
            </div>
            <span
              className="font-black text-white leading-none tracking-tight"
              style={{ fontSize: "1.2rem" }}
            >
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>

          {/* Desktop back/forward + page title (lg+) */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => router.back()}
                aria-label="Go back"
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-300 hover:bg-violet-950/40 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => router.forward()}
                aria-label="Go forward"
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-300 hover:bg-violet-950/40 transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {pageMeta && (
              <div className="flex items-center gap-2">
                <pageMeta.Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: "var(--a-400)" }}
                />
                <span className="text-xl font-bold text-white tracking-tight leading-none">
                  {pageMeta.label}
                </span>
              </div>
            )}
          </div>

          {/* Desktop nav links (sm–lg) */}
          <div className="hidden sm:flex lg:hidden items-center gap-0.5 flex-shrink-0">
            {navLink("/analytics", <BarChart2 className="w-3.5 h-3.5" />, "Analytics")}
            {navLink("/calendar",  <Calendar  className="w-3.5 h-3.5" />, "Calendar")}
            {navLink("/friends",   <Users     className="w-3.5 h-3.5" />, "Friends")}
            {navLink("/profile",   <User      className="w-3.5 h-3.5" />, "Profile")}
          </div>

          {/* ── CENTER logo (desktop only, absolute) ──────────────── */}
          <Link
            href="/dashboard"
            aria-label="HabitAI Dashboard"
            className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center gap-3 group"
          >
            <div
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-violet-600 to-purple-800 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:brightness-110 flex-shrink-0"
              style={{
                boxShadow:
                  "0 0 0 1.5px rgba(167,139,250,0.45), 0 0 0 3px rgba(139,92,246,0.12), 0 0 28px 8px rgba(139,92,246,0.35), 0 4px 16px rgba(0,0,0,0.55)",
              }}
            >
              <Sparkles className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
            </div>
            <span
              className="font-black text-white tracking-tight leading-none"
              style={{ fontSize: "clamp(1rem, 5vw, 1.35rem)" }}
            >
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>

          {/* ── Spacer ────────────────────────────────────────────── */}
          <div className="flex-1" />

          {/* ── RIGHT ────────────────────────────────────────────── */}
          <div className="flex items-center gap-2.5">

            {/* Compact XP pill — mobile only */}
            <MobileNavXP />

            {/* Full XP widget — desktop only */}
            <NavXP />

            {/* PWA Install button — shown when installable (Chrome/Edge/Android), hidden if already installed or iOS */}
            {canInstall && !isInstalled && (
              <button
                onClick={promptInstall}
                aria-label="Install HabitAI app"
                title="Install app"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-violet-300 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-600/30 hover:border-violet-500/50 rounded-lg transition-all flex-shrink-0"
              >
                <span>📲</span>
                <span>Install App</span>
              </button>
            )}

            {/* Mobile install button */}
            {canInstall && !isInstalled && (
              <button
                onClick={promptInstall}
                aria-label="Install HabitAI app"
                title="Install app"
                className="sm:hidden flex items-center justify-center w-8 h-8 text-violet-400 hover:text-white hover:bg-violet-950/40 rounded-lg transition-all flex-shrink-0"
              >
                <span className="text-base leading-none">📲</span>
              </button>
            )}

            {/* AI Coaching — desktop only */}
            <button
              onClick={openAIInsight}
              aria-label="AI Coaching"
              title="AI Coaching"
              className="hidden sm:flex items-center justify-center w-8 h-8 text-violet-400 hover:text-white hover:bg-violet-950/40 rounded-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* User menu */}
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 px-1.5 py-1.5 rounded-xl hover:bg-violet-950/50 transition-all"
              >
                {/* Avatar */}
                {avatarId ? (
                  <AvatarDisplay avatarId={avatarId} size="sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-900/30">
                    <span className="text-white text-[11px] font-bold tracking-tight">{initials}</span>
                  </div>
                )}
                {/* Plan badge — always visible next to avatar */}
                <PlanBadge tier={tier} />
                {/* Chevron — desktop only (saves space on mobile) */}
                <ChevronDown
                  className={`hidden sm:block w-3 h-3 text-slate-500 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-[#0f0f1a] border border-violet-900/30 rounded-2xl shadow-2xl shadow-violet-950/60 overflow-hidden z-50">
                  {/* Account header */}
                  <div className="px-4 py-3.5 border-b border-violet-900/20">
                    <div className="flex items-center gap-3">
                      {avatarId ? (
                        <AvatarDisplay avatarId={avatarId} size="sm" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{initials}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {username ? `@${username}` : (userEmail || "Loading…")}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <PlanBadge tier={tier} />
                          <span className="text-[10px] text-slate-600">plan</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <MenuItem icon={<Settings className="w-3.5 h-3.5" />} label="Settings" href="/settings" onClick={() => setMenuOpen(false)} />
                    <MenuItem icon={<Users    className="w-3.5 h-3.5" />} label="Group Habits" href="/groups" onClick={() => setMenuOpen(false)} />
                    <MenuItem icon={<Users    className="w-3.5 h-3.5" />} label="Organisations" href="/organisations" onClick={() => setMenuOpen(false)} badge={tier === "pro" ? undefined : "Pro"} />
                    <MenuItem
                      icon={<CreditCard className="w-3.5 h-3.5" />}
                      label="Billing & Subscription"
                      onClick={() => { setMenuOpen(false); openUpgradeModal(); }}
                      badge={tier === "free" ? "Upgrade" : undefined}
                    />
                  </div>

                  <div className="border-t border-violet-900/20 py-1.5">
                    <MenuItem icon={<HelpCircle className="w-3.5 h-3.5" />} label="Help & Support" href="/help" onClick={() => setMenuOpen(false)} />
                    <MenuItem icon={<Keyboard  className="w-3.5 h-3.5" />} label="Keyboard Shortcuts" muted onClick={() => setMenuOpen(false)} />
                  </div>

                  <div className="border-t border-violet-900/20 py-1.5">
                    {isFree && (
                      <button
                        onClick={() => { setMenuOpen(false); openUpgradeModal(); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-violet-300 hover:bg-violet-950/50 transition-colors sm:hidden"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Upgrade plan
                      </button>
                    )}
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors rounded-lg mx-auto"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  badge?: string;
  muted?: boolean;
}

function MenuItem({ icon, label, href, external, onClick, badge, muted }: MenuItemProps) {
  const cls = `w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs transition-colors group ${
    muted
      ? "text-slate-600 cursor-default"
      : "text-slate-400 hover:text-white hover:bg-violet-950/50"
  }`;

  const inner = (
    <>
      <span className={muted ? "text-slate-700" : "text-slate-500 group-hover:text-violet-400 transition-colors"}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-600/20 text-violet-300 font-medium border border-violet-600/25">
          {badge}
        </span>
      )}
      {muted && (
        <span className="text-[10px] text-slate-700">soon</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={onClick}
        className={cls}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
