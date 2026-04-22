"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import {
  Lock, TrendingUp, Flame, Trophy, Target,
  CheckCircle2, Loader2, Star,
} from "lucide-react";
import { useAnalytics, type HeatmapDay, type StreakRow } from "@/hooks/useAnalytics";
import { useProfile } from "@/hooks/useProfile";
import DashboardNav from "@/components/dashboard/DashboardNav";
import UpgradeModal from "@/components/dashboard/UpgradeModal";

// ─── Palette ──────────────────────────────────────────────────────────────────

const BAR_COLORS = [
  "#7c3aed","#8b5cf6","#9d78f8","#a78bfa",
  "#c4b5fd","#8b5cf6","#7c3aed","#6d28d9",
];

// ─── Small reusable bits ──────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0c0c18] border border-violet-900/18 rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-[#0c0c18] border border-violet-900/18 rounded-2xl p-4 flex flex-col gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-[11px] text-slate-600 mt-1">{sub}</p>
      </div>
      <p className="text-xs text-slate-500 mt-auto">{label}</p>
    </div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function Heatmap({ days }: { days: HeatmapDay[] }) {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div>
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((day) => {
          const rate = day.total > 0 ? day.completed / day.total : -1;
          let cell: string;
          if (rate < 0 || day.total === 0) {
            cell = "bg-slate-900/60 border-slate-800/30";
          } else if (rate >= 1) {
            cell = "bg-green-500/70 border-green-400/25 shadow-sm shadow-green-500/20";
          } else if (rate > 0) {
            cell = "bg-yellow-500/55 border-yellow-400/25";
          } else {
            cell = "bg-red-950/60 border-red-800/25";
          }
          const isToday = day.date === today;
          return (
            <div key={day.date} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-full aspect-square rounded-xl border ${cell} ${
                  isToday ? "ring-2 ring-violet-500/50 ring-offset-1 ring-offset-[#0c0c18]" : ""
                } transition-all`}
                title={
                  day.total > 0
                    ? `${day.label}: ${day.completed}/${day.total} habits`
                    : `${day.label}: no habits`
                }
              />
              <span
                className={`text-[10px] font-medium ${
                  isToday ? "text-violet-400" : "text-slate-700"
                }`}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {[
          { color: "bg-green-500/70",    label: "All done"    },
          { color: "bg-yellow-500/55",   label: "Partial"     },
          { color: "bg-red-950/60",      label: "None"        },
          { color: "bg-slate-900/60",    label: "No habits"   },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${color} border border-white/5`} />
            <span className="text-[10px] text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function StreakTooltip({ active, payload }: { active?: boolean; payload?: { payload: { full: string }; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f1a] border border-violet-800/40 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-0.5">{payload[0].payload.full}</p>
      <p className="text-violet-400">
        <span className="font-bold text-sm">{payload[0].value}</span>
        <span className="text-slate-500 ml-1">day streak</span>
      </p>
    </div>
  );
}

// ─── Streak bar chart ─────────────────────────────────────────────────────────

function StreakChart({ rows }: { rows: StreakRow[] }) {
  if (rows.every((r) => r.current === 0)) {
    return (
      <p className="text-sm text-slate-600 text-center py-4">
        No active streaks yet — complete habits to build one.
      </p>
    );
  }

  const data = rows.map((r) => ({
    name:   r.name.length > 20 ? r.name.slice(0, 19) + "…" : r.name,
    full:   r.name,
    streak: r.current,
  }));

  const chartH = Math.max(100, rows.length * 52);

  return (
    <ResponsiveContainer width="100%" height={chartH}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
        barCategoryGap="28%"
      >
        <XAxis
          type="number"
          tick={{ fill: "#334155", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tickCount={5}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={148}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<StreakTooltip />} cursor={{ fill: "rgba(124,58,237,0.07)" }} />
        <Bar dataKey="streak" maxBarSize={18} radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
          <LabelList
            dataKey="streak"
            position="right"
            style={{ fill: "#64748b", fontSize: 11 }}
            formatter={(v: unknown) => (typeof v === "number" && v > 0 ? `${v}d` : "")}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Best streaks list ────────────────────────────────────────────────────────

function BestStreaksList({ rows }: { rows: StreakRow[] }) {
  const sorted = [...rows].sort((a, b) => b.best - a.best);
  if (sorted.every((r) => r.best === 0)) {
    return <p className="text-sm text-slate-600 text-center py-4">Complete habits to build streaks.</p>;
  }
  return (
    <div className="space-y-2">
      {sorted.map((row, i) => (
        <div
          key={row.habitId}
          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#0f0f1a] border border-violet-900/12"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`text-xs font-bold w-5 text-center flex-shrink-0 ${
                i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : "text-slate-600"
              }`}
            >
              #{i + 1}
            </span>
            <span className="text-sm text-slate-300 truncate">{row.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Trophy className={`w-3.5 h-3.5 ${i === 0 ? "text-amber-400" : "text-slate-600"}`} />
            <span className={`text-sm font-bold ${i === 0 ? "text-amber-400" : "text-slate-400"}`}>
              {row.best}
            </span>
            <span className="text-xs text-slate-700">d</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Most consistent card ─────────────────────────────────────────────────────

function MostConsistentCard({
  name,
  rate,
  rows,
}: {
  name: string;
  rate: number;
  rows: StreakRow[];
}) {
  const sorted = [...rows].sort((a, b) => b.last30Rate - a.last30Rate);
  return (
    <div className="space-y-2">
      {sorted.map((row, i) => {
        const pct = Math.round(row.last30Rate * 100);
        return (
          <div key={row.habitId} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span
                className={`text-xs truncate max-w-[65%] ${
                  row.name === name && i === 0 ? "text-violet-300 font-medium" : "text-slate-500"
                }`}
              >
                {row.name}
                {row.name === name && i === 0 && (
                  <Star className="inline w-3 h-3 text-violet-400 ml-1 mb-0.5" />
                )}
              </span>
              <span
                className={`text-xs font-bold ${
                  row.name === name && i === 0 ? "text-violet-400" : "text-slate-600"
                }`}
              >
                {pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-violet-950/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  row.name === name && i === 0
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-500"
                    : "bg-violet-900/60"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Full analytics content ───────────────────────────────────────────────────

function AnalyticsContent({
  weeklyRate,
  heatmapDays,
  streakRows,
  totalCompletions,
  mostConsistent,
}: {
  weeklyRate: number;
  heatmapDays: HeatmapDay[];
  streakRows: StreakRow[];
  totalCompletions: number;
  mostConsistent: { name: string; rate: number } | null;
}) {
  const maxCurrent = Math.max(0, ...streakRows.map((r) => r.current));

  return (
    <div className="space-y-5">
      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Weekly completion"
          value={`${weeklyRate}%`}
          sub="of habits this week"
          icon={<TrendingUp className="w-4 h-4 text-violet-400" />}
          accent="bg-violet-950/60 border border-violet-800/30"
        />
        <StatCard
          label="All-time completions"
          value={totalCompletions.toLocaleString()}
          sub="habits checked off"
          icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
          accent="bg-green-950/40 border border-green-800/25"
        />
        <StatCard
          label="Best active streak"
          value={maxCurrent > 0 ? `${maxCurrent}d` : "—"}
          sub="consecutive days"
          icon={<Flame className="w-4 h-4 text-orange-400" />}
          accent="bg-orange-950/40 border border-orange-800/25"
        />
      </div>

      {/* ── 7-day heatmap ──────────────────────────────────────────────────── */}
      <SectionCard title="7-Day Overview" subtitle="Habit completion for each day this week">
        <Heatmap days={heatmapDays} />
      </SectionCard>

      {/* ── Streak bar chart ────────────────────────────────────────────────── */}
      <SectionCard title="Current Streaks" subtitle="Active consecutive-day streak per habit">
        <StreakChart rows={streakRows} />
      </SectionCard>

      {/* ── Best streaks + Most consistent ─────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">
        <SectionCard title="Best Streak Ever" subtitle="All-time record per habit">
          <BestStreaksList rows={streakRows} />
        </SectionCard>

        <SectionCard
          title="Consistency (30 days)"
          subtitle="Completion rate over the last 30 days"
        >
          {mostConsistent ? (
            <MostConsistentCard {...mostConsistent} rows={streakRows} />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <Target className="w-6 h-6 text-slate-700" />
              <p className="text-sm text-slate-600">Complete habits to see consistency data.</p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const {
    loading, habits, weeklyRate, heatmapDays,
    streakRows, totalCompletions, mostConsistent,
  } = useAnalytics();
  const { tier, profileLoading } = useProfile();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isPaid = tier === "plus" || tier === "pro";

  return (
    <div className="min-h-screen bg-[#09090f]">
      <DashboardNav
        habitCount={habits.length}
        tier={tier}
        onUpgradeClick={() => setShowUpgrade(true)}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Your habit performance at a glance</p>
        </div>

        {loading || profileLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-violet-950/50 border border-violet-800/30 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-violet-500" />
            </div>
            <p className="text-slate-400 text-sm mb-1">No habits to analyse yet.</p>
            <Link href="/dashboard" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Go add your first habit →
            </Link>
          </div>
        ) : (
          <div className="relative">
            {/* Blurred layer for free users */}
            <div className={!isPaid ? "blur-sm pointer-events-none select-none" : ""}>
              <AnalyticsContent
                weeklyRate={weeklyRate}
                heatmapDays={heatmapDays}
                streakRows={streakRows}
                totalCompletions={totalCompletions}
                mostConsistent={mostConsistent}
              />
            </div>

            {/* Lock overlay */}
            {!isPaid && (
              <div className="absolute inset-0 z-10 flex items-start justify-center pt-28 px-4">
                <div className="w-full max-w-sm bg-[#0f0f1a]/96 border border-violet-700/40 rounded-2xl px-8 py-8 text-center shadow-2xl shadow-violet-950/50 backdrop-blur-sm">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-violet-950/70 border border-violet-700/40 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Unlock full analytics</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    See streaks, completion rates, heatmaps, and habit insights.
                    Upgrade to <span className="text-violet-300 font-medium">Plus</span> to unlock.
                  </p>
                  <button
                    onClick={() => setShowUpgrade(true)}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30 mb-3"
                  >
                    Upgrade to Plus →
                  </button>
                  <Link
                    href="/dashboard"
                    className="block text-xs text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
