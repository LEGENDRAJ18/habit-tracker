"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, UserPlus, Layers, CheckSquare, RefreshCw, Sparkles, TrendingUp,
  Swords, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAILS  = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "mannrajsj@gmail.com,surjeetsj@gmail.com")
  .split(",").map((e) => e.trim()).filter(Boolean);
const REFRESH_MS    = 10_000;

interface Stats {
  totalUsers:       number;
  todayUsers:       number;
  totalHabits:      number;
  todayCompletions: number;
  activeBattles:    number;
  orgsCount:        number;
  tiers:            { free: number; plus: number; pro: number };
  weeklySignups:    Array<{ date: string; count: number }>;
  updatedAt:        string;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, accent = false,
}: {
  label:   string;
  value:   number;
  sub?:    string;
  icon:    React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border transition-all ${
        accent
          ? "bg-violet-600/15 border-violet-500/40 shadow-lg shadow-violet-900/20"
          : "bg-[#0c0c18] border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
        <div className={accent ? "text-violet-400" : "text-slate-600"}>{icon}</div>
      </div>
      <p className="text-3xl font-black text-white tabular-nums">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 border border-slate-800 bg-[#0c0c18] animate-pulse">
      <div className="h-3 w-24 bg-slate-800 rounded mb-4" />
      <div className="h-8 w-16 bg-slate-800 rounded" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  const [ready,       setReady]       = useState(false);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown,   setCountdown]   = useState(REFRESH_MS / 1000);

  // ── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
        router.replace("/dashboard");
        return;
      }
      setReady(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Stats = await res.json();
      setStats(data);
      setLastRefresh(new Date());
      setFetchError(null);
      setCountdown(REFRESH_MS / 1000);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh + countdown ─────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    const refreshId  = setInterval(fetchStats, REFRESH_MS);
    const countdownId = setInterval(
      () => setCountdown((c) => (c <= 1 ? REFRESH_MS / 1000 : c - 1)),
      1000
    );
    return () => { clearInterval(refreshId); clearInterval(countdownId); };
  }, [ready, fetchStats]);

  // ── Spinner while checking auth ──────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const tierTotal = stats ? stats.tiers.free + stats.tiers.plus + stats.tiers.pro : 1;

  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute rounded-full bg-violet-700/10 blur-[130px]"
             style={{ width: 600, height: 600, top: "-10%", left: "-10%" }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700
                            flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-slate-500">HabitAI · Internal use only</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastRefresh && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500">
                  Updated {lastRefresh.toLocaleTimeString()}
                </p>
                <p className="text-xs text-slate-700">
                  Next refresh in {countdown}s
                </p>
              </div>
            )}
            <button
              onClick={() => { setLoading(true); fetchStats(); }}
              title="Refresh now"
              className="p-2.5 rounded-xl bg-violet-900/30 hover:bg-violet-900/50 border
                         border-violet-800/30 hover:border-violet-600/40 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-violet-400" />
            </button>
          </div>
        </div>

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {fetchError && (
          <div className="mb-6 px-4 py-3 bg-red-950/40 border border-red-700/40 rounded-xl
                          text-sm text-red-300 flex items-center gap-2">
            <span className="text-red-400">⚠</span> {fetchError}
          </div>
        )}

        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Total Users"
              value={stats.totalUsers}
              sub="all time sign-ups"
              icon={<Users className="w-4 h-4" />}
              accent
            />
            <StatCard
              label="Signed Up Today"
              value={stats.todayUsers}
              sub="new today (UTC)"
              icon={<UserPlus className="w-4 h-4" />}
            />
            <StatCard
              label="Total Habits"
              value={stats.totalHabits}
              sub="across all users"
              icon={<Layers className="w-4 h-4" />}
            />
            <StatCard
              label="Completions Today"
              value={stats.todayCompletions}
              sub="habit logs (UTC)"
              icon={<CheckSquare className="w-4 h-4" />}
              accent
            />
            <StatCard
              label="Active Battles"
              value={stats.activeBattles}
              sub="live right now"
              icon={<Swords className="w-4 h-4" />}
            />
            <StatCard
              label="Organisations"
              value={stats.orgsCount}
              sub="total created"
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>
        ) : null}

        {/* ── Plan breakdown ───────────────────────────────────────────────── */}
        <div className="bg-[#0c0c18] border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              Plan Breakdown
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-3 w-12 bg-slate-800 rounded" />
                  <div className="h-2 bg-slate-800 rounded-full" />
                  <div className="h-6 w-8 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-6">
              {(["free", "plus", "pro"] as const).map((tier) => {
                const count = stats.tiers[tier];
                const pct   = tierTotal > 0 ? Math.round((count / tierTotal) * 100) : 0;
                const barColor =
                  tier === "pro"  ? "from-amber-500 to-yellow-400" :
                  tier === "plus" ? "from-violet-600 to-purple-400" :
                                    "from-slate-600 to-slate-500";
                const label =
                  tier === "pro" ? "Pro ⭐" : tier === "plus" ? "Plus ✦" : "Free";

                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{label}</span>
                      <span className="text-xs text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-2xl font-black text-white tabular-nums">
                      {count.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">users</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* ── Weekly signups chart ─────────────────────────────────────────── */}
        {stats?.weeklySignups && stats.weeklySignups.length > 0 && (
          <div className="bg-[#0c0c18] border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Daily Signups (last 7 days)
              </p>
            </div>
            {(() => {
              const max = Math.max(...stats.weeklySignups.map((d) => d.count), 1);
              return (
                <div className="flex items-end gap-2 h-24">
                  {stats.weeklySignups.map((day) => {
                    const pct = max > 0 ? (day.count / max) * 100 : 0;
                    const label = new Date(day.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short" });
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-[10px] text-slate-500 tabular-nums">{day.count}</p>
                        <div className="w-full rounded-t-md overflow-hidden flex items-end" style={{ height: 60 }}>
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-violet-700 to-violet-500 transition-all duration-700"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-600">{label}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-700">
          Auto-refreshes every 10 seconds · all times UTC
          {stats?.updatedAt
            ? ` · Last fetch: ${new Date(stats.updatedAt).toLocaleString()}`
            : ""}
        </p>
      </div>
    </div>
  );
}
