"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles, LogOut, Zap, ChevronDown, BarChart2,
  Download, User, Settings, CreditCard, HelpCircle,
  Keyboard, Users, Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import type { Plan } from "@/types";
import BottomNav from "@/components/ui/BottomNav";

interface Props {
  habitCount: number;
  tier: Plan;
  onUpgradeClick?: () => void;
}

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

export default function DashboardNav({ habitCount, tier, onUpgradeClick }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const { canInstall, promptInstall } = usePWAInstall();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [initials, setInitials]     = useState("··");
  const [userEmail, setUserEmail]   = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const isFree = tier === "free";

  // Fetch user email for initials
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return;
      setUserEmail(user.email);
      setInitials(getInitials(user.email));
    });
  }, []);

  // Close dropdown on outside click
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
    <>
    <nav className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>

          {/* Nav links — hidden on mobile (bottom nav handles it) */}
          <div className="hidden sm:flex items-center gap-0.5">
            {navLink("/analytics", <BarChart2 className="w-3.5 h-3.5" />, "Analytics")}
            {navLink("/calendar",  <Calendar  className="w-3.5 h-3.5" />, "Calendar")}
            {navLink("/friends",   <Users     className="w-3.5 h-3.5" />, "Friends")}
            {navLink("/profile",   <User      className="w-3.5 h-3.5" />, "Profile")}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-violet-950/50 text-slate-400 hover:text-white transition-all text-xs"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-900/30">
                  <span className="text-white text-[11px] font-bold tracking-tight">{initials}</span>
                </div>
                <PlanBadge tier={tier} />
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-[#0f0f1a] border border-violet-900/30 rounded-2xl shadow-2xl shadow-violet-950/60 overflow-hidden z-50">
                  {/* User info header */}
                  <div className="px-4 py-3.5 border-b border-violet-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{userEmail || "Loading…"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <PlanBadge tier={tier} />
                          <span className="text-[10px] text-slate-600">plan</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu items — section 1 */}
                  <div className="py-1.5">
                    <MenuItem icon={<Settings className="w-3.5 h-3.5" />} label="Account Settings" href="/profile" onClick={() => setMenuOpen(false)} />
                    <MenuItem
                      icon={<CreditCard className="w-3.5 h-3.5" />}
                      label="Billing & Subscription"
                      onClick={() => { setMenuOpen(false); onUpgradeClick?.(); }}
                      badge={tier === "free" ? "Upgrade" : undefined}
                    />
                  </div>

                  <div className="border-t border-violet-900/20 py-1.5">
                    <MenuItem icon={<HelpCircle className="w-3.5 h-3.5" />} label="Help & Support" href="https://github.com/LEGENDRAJ18/habit-tracker/issues" external onClick={() => setMenuOpen(false)} />
                    <MenuItem icon={<Keyboard  className="w-3.5 h-3.5" />} label="Keyboard Shortcuts" muted onClick={() => setMenuOpen(false)} />
                  </div>

                  {/* Section 2 — destructive */}
                  <div className="border-t border-violet-900/20 py-1.5">
                    {isFree && (
                      <button
                        onClick={() => { setMenuOpen(false); onUpgradeClick?.(); }}
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
    <BottomNav />
    </>
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
