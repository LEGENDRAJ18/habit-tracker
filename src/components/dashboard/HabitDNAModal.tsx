"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X, Lock, Download, Share2, Star, Clock, Calendar, Sparkles, Award, TrendingUp } from "lucide-react";
import type { Habit, Plan } from "@/types";
import { useHabitDNA } from "@/hooks/useHabitDNA";

interface Props {
  habits: Habit[];
  logs: Array<{ habit_id: string; completed_at: string }>;
  tier: Plan;
  totalXP: number;
  onClose: () => void;
  onUpgrade: () => void;
}

function useCountUp(target: number, delay = 400, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let raf: number;
    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(eased * target));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, delay, duration]);
  return value;
}

function ConsistencyRing({ value, daysOfData }: { value: number; daysOfData: number }) {
  const displayed = useCountUp(value);
  const r = 66;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - displayed / 100);

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: 176, height: 176 }}>
      <div className="absolute inset-0 rounded-full" style={{
        background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
      }} />
      <svg className="absolute inset-0 -rotate-90" width="176" height="176" viewBox="0 0 176 176">
        <defs>
          <linearGradient id="ringGrad" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
          <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="88" cy="88" r={r} fill="none" stroke="rgba(109,40,217,0.1)" strokeWidth="9" />
        <circle
          cx="88" cy="88" r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          filter="url(#ringGlow)"
        />
      </svg>
      <div className="relative z-10 text-center pointer-events-none">
        <p
          className="font-black leading-none"
          style={{
            fontSize: "3rem",
            background: "linear-gradient(135deg, #a78bfa, #e879f9)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 12px rgba(167,139,250,0.45))",
          }}
        >
          {displayed}%
        </p>
        <p className="text-[10px] text-violet-400/60 font-bold uppercase tracking-widest mt-1.5">consistency</p>
        {daysOfData > 0 && <p className="text-[9px] text-slate-600 mt-0.5">{daysOfData}d tracked</p>}
      </div>
    </div>
  );
}

function StatChip({ value, label, colorClass, delay }: {
  value: string | number; label: string; colorClass: string; delay: number;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-2xl p-3 backdrop-blur-sm"
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.05)",
        animation: `dnaFadeUp 0.45s ease-out ${delay}ms both`,
      }}
    >
      <p className={`text-xl font-black leading-none ${colorClass}`}>{value}</p>
      <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold text-center">{label}</p>
    </div>
  );
}

function InsightRow({ icon, label, value, colorClass, delay }: {
  icon: ReactNode; label: string; value: string; colorClass: string; delay: number;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: "rgba(8,6,18,0.7)",
        border: "1px solid rgba(255,255,255,0.04)",
        animation: `dnaFadeUp 0.45s ease-out ${delay}ms both`,
      }}
    >
      <div className={`${colorClass} flex-shrink-0 opacity-80`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={`text-[9px] font-bold uppercase tracking-widest ${colorClass} opacity-70`}>{label}</p>
        <p className="text-sm text-slate-200 font-semibold truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function downloadDNACard(dna: ReturnType<typeof useHabitDNA>, habits: Habit[], totalXP: number) {
  const DPR = 2;
  const W = 600, H = 900;
  const canvas = document.createElement("canvas");
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(DPR, DPR);

  // Base
  ctx.fillStyle = "#07070f";
  ctx.fillRect(0, 0, W, H);

  // Top radial glow
  const topGlow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 380);
  topGlow.addColorStop(0, "rgba(109,40,217,0.38)");
  topGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  // Ring ambient glow
  const centreGlow = ctx.createRadialGradient(W / 2, 210, 0, W / 2, 210, 200);
  centreGlow.addColorStop(0, "rgba(167,139,250,0.15)");
  centreGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = centreGlow;
  ctx.fillRect(0, 0, W, H);

  // Border — manual rounded rect for broad compatibility
  const drawRounded = (x: number, y: number, w: number, h: number, br: number) => {
    ctx.beginPath();
    ctx.moveTo(x + br, y);
    ctx.lineTo(x + w - br, y); ctx.quadraticCurveTo(x + w, y, x + w, y + br);
    ctx.lineTo(x + w, y + h - br); ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + br, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - br);
    ctx.lineTo(x, y + br); ctx.quadraticCurveTo(x, y, x + br, y);
    ctx.closePath();
  };
  ctx.strokeStyle = "rgba(139,92,246,0.45)";
  ctx.lineWidth = 1.5;
  drawRounded(5, 5, W - 10, H - 10, 22);
  ctx.stroke();

  ctx.textAlign = "center";

  // Header label
  ctx.font = "700 11px -apple-system, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(167,139,250,0.65)";
  ctx.fillText("✦  HABIT DNA  ✦", W / 2, 48);

  // Title
  ctx.font = "700 26px -apple-system, Helvetica, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText("Your Behavioral Fingerprint", W / 2, 80);

  // Sub
  ctx.font = "400 12px -apple-system, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(148,163,184,0.5)";
  ctx.fillText(`${habits.length} habit${habits.length !== 1 ? "s" : ""} · habitaiapp.com`, W / 2, 100);

  // Ring track
  const cx = W / 2, cy = 208, ringR = 72;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(109,40,217,0.12)";
  ctx.lineWidth = 9;
  ctx.stroke();

  // Ring progress arc
  const arcEnd = -Math.PI / 2 + (2 * Math.PI * dna.overallConsistency) / 100;
  const arcGrad = ctx.createLinearGradient(cx - ringR, cy, cx + ringR, cy);
  arcGrad.addColorStop(0, "#a78bfa");
  arcGrad.addColorStop(1, "#e879f9");
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, -Math.PI / 2, arcEnd);
  ctx.strokeStyle = arcGrad;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.stroke();

  // Number inside ring
  const numGrad = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0);
  numGrad.addColorStop(0, "#a78bfa");
  numGrad.addColorStop(1, "#e879f9");
  ctx.font = "900 64px -apple-system, Helvetica, sans-serif";
  ctx.fillStyle = numGrad;
  ctx.fillText(`${dna.overallConsistency}%`, cx, cy + 22);
  ctx.font = "700 9px -apple-system, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(167,139,250,0.55)";
  ctx.fillText("CONSISTENCY", cx, cy + 42);

  // Fade divider
  const divG = ctx.createLinearGradient(60, 0, W - 60, 0);
  divG.addColorStop(0, "rgba(0,0,0,0)");
  divG.addColorStop(0.5, "rgba(139,92,246,0.3)");
  divG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.strokeStyle = divG;
  ctx.lineWidth = 1;
  ctx.moveTo(60, 278); ctx.lineTo(W - 60, 278);
  ctx.stroke();

  // Stats
  const stats = [
    { label: "COMPLETIONS", value: `${dna.totalCompletions}`, color: "#a78bfa" },
    { label: "BEST STREAK",  value: `${dna.longestStreak}d`,  color: "#fb923c" },
    { label: "XP EARNED",    value: totalXP >= 1000 ? `${(totalXP / 1000).toFixed(1)}k` : `${totalXP}`, color: "#fbbf24" },
  ];
  stats.forEach((s, i) => {
    const sx = 100 + i * 200, sy = 320;
    ctx.fillStyle = "rgba(10,5,20,0.8)";
    drawRounded(sx - 80, sy - 34, 160, 76, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(109,40,217,0.18)";
    ctx.lineWidth = 1;
    drawRounded(sx - 80, sy - 34, 160, 76, 14);
    ctx.stroke();
    ctx.font = "900 22px -apple-system, Helvetica, sans-serif";
    ctx.fillStyle = s.color;
    ctx.textAlign = "center";
    ctx.fillText(s.value, sx, sy + 6);
    ctx.font = "700 8px -apple-system, Helvetica, sans-serif";
    ctx.fillStyle = "rgba(100,116,139,0.65)";
    ctx.fillText(s.label, sx, sy + 26);
  });

  // Insights
  const insights: { label: string; value: string }[] = [];
  if (dna.bestHabit)  insights.push({ label: "Best Habit",            value: `${dna.bestHabit.name.slice(0, 30)} — ${dna.bestHabit.score}%` });
  insights.push(      { label: "Most Consistent Day",  value: dna.mostConsistentDay });
  if (dna.peakTime)   insights.push({ label: "Peak Performance Time", value: dna.peakTime });
  if (dna.worstHabit) insights.push({ label: "Room to Grow",          value: `${dna.worstHabit.name.slice(0, 30)} — ${dna.worstHabit.score}%` });

  let iy = 442;
  ctx.textAlign = "left";
  insights.forEach((ins) => {
    ctx.font = "700 9px -apple-system, Helvetica, sans-serif";
    ctx.fillStyle = "rgba(167,139,250,0.5)";
    ctx.fillText(ins.label.toUpperCase(), 60, iy);
    ctx.font = "500 13px -apple-system, Helvetica, sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(ins.value, 60, iy + 18);
    iy += 48;
  });

  // Personality tags
  if (dna.personalityTags.length > 0) {
    iy += 16;
    ctx.font = "700 10px -apple-system, Helvetica, sans-serif";
    ctx.fillStyle = "rgba(167,139,250,0.55)";
    ctx.textAlign = "center";
    ctx.fillText("PERSONALITY TAGS", W / 2, iy);
    iy += 28;

    ctx.font = "600 12px -apple-system, Helvetica, sans-serif";
    const tags = dna.personalityTags.slice(0, 3);
    const tagWidths = tags.map((t) => ctx.measureText(t).width + 28);
    const totalW = tagWidths.reduce((s, w) => s + w, 0) + (tags.length - 1) * 8;
    let tx = (W - totalW) / 2;
    tags.forEach((tag, ti) => {
      const tw = tagWidths[ti];
      ctx.fillStyle = "rgba(109,40,217,0.22)";
      drawRounded(tx, iy - 14, tw, 28, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(167,139,250,0.35)";
      ctx.lineWidth = 1;
      drawRounded(tx, iy - 14, tw, 28, 14);
      ctx.stroke();
      ctx.fillStyle = "#a78bfa";
      ctx.textAlign = "center";
      ctx.fillText(tag, tx + tw / 2, iy + 6);
      tx += tw + 8;
    });
  }

  // Footer
  ctx.font = "400 10px -apple-system, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(100,116,139,0.35)";
  ctx.textAlign = "center";
  ctx.fillText("habitaiapp.com  ·  Track your identity, not just your habits", W / 2, H - 26);

  const link = document.createElement("a");
  link.download = "habit-dna.png";
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
}

// Static ring for the blurred free preview
const MOCK_R = 66;
const MOCK_CIRC = 2 * Math.PI * MOCK_R;

export default function HabitDNAModal({ habits, logs, tier, totalXP, onClose, onUpgrade }: Props) {
  const dna   = useHabitDNA(habits, logs);
  const isPaid = tier === "plus" || tier === "pro";

  const handleShare = async () => {
    const text = `My Habit DNA:\n🏆 ${dna.overallConsistency}% consistency\n🔥 ${dna.longestStreak}-day streak\n⚡ ${totalXP.toLocaleString()} XP\n${dna.personalityTags.slice(0, 2).join(" · ")}\nhabitaiapp.com`;
    if (navigator.share) {
      try { await navigator.share({ title: "My Habit DNA", text }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg bg-[#0b0b18] border border-violet-700/20 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{
          animation: "dnaSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
          boxShadow: "0 0 0 1px rgba(139,92,246,0.08), 0 32px 64px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.04] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-600/8 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(232,121,249,0.18))",
                  border: "1px solid rgba(167,139,250,0.25)",
                  boxShadow: "0 0 18px rgba(139,92,246,0.28)",
                }}
              >
                <Sparkles className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-none">Habit DNA</h2>
                <p className="text-[10px] text-violet-400/55 mt-0.5">Your behavioral fingerprint</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ── Not enough data ── */}
          {!dna.ready && (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(109,40,217,0.07)", border: "1px solid rgba(109,40,217,0.18)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(167,139,250,0.2)" }}
              >
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-sm font-bold text-white mb-1">Not enough data yet</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Habit DNA unlocks after 30 days of tracking.<br />
                You&apos;re at {dna.daysOfData} day{dna.daysOfData !== 1 ? "s" : ""} — keep building!
              </p>
              <div className="mt-4 bg-violet-950/40 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((dna.daysOfData / 30) * 100, 100)}%`,
                    background: "linear-gradient(90deg, #7c3aed, #a855f7)",
                    transition: "width 1.2s ease-out",
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-2">{dna.daysOfData} / 30 days</p>
            </div>
          )}

          {/* ── Free preview (blurred) ── */}
          {dna.ready && !isPaid && (
            <div className="relative">
              {/* Blurred mock */}
              <div className="filter blur-[3px] pointer-events-none select-none space-y-4" aria-hidden>
                <div
                  className="rounded-2xl py-5 px-4 text-center"
                  style={{ background: "rgba(10,8,20,0.7)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="relative flex items-center justify-center mx-auto" style={{ width: 176, height: 176 }}>
                    <svg className="absolute inset-0 -rotate-90" width="176" height="176" viewBox="0 0 176 176">
                      <defs>
                        <linearGradient id="mockRingGrad" x1="1" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="100%" stopColor="#e879f9" />
                        </linearGradient>
                      </defs>
                      <circle cx="88" cy="88" r={MOCK_R} fill="none" stroke="rgba(109,40,217,0.1)" strokeWidth="9" />
                      <circle cx="88" cy="88" r={MOCK_R} fill="none" stroke="url(#mockRingGrad)" strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={`${MOCK_CIRC * 0.87} ${MOCK_CIRC * 0.13}`} />
                    </svg>
                    <div className="relative z-10 text-center">
                      <p className="font-black leading-none text-5xl"
                         style={{ background: "linear-gradient(135deg,#a78bfa,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        87%
                      </p>
                      <p className="text-[10px] text-violet-400/60 font-bold uppercase tracking-widest mt-1.5">consistency</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[["142", "Completions", "text-violet-400"], ["21d", "Best Streak", "text-orange-400"], ["2.4k", "XP Earned", "text-amber-400"]].map(([v, l, c]) => (
                    <div key={l} className="rounded-2xl p-3 text-center" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p className={`text-xl font-black ${c}`}>{v}</p>
                      <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(8,6,18,0.7)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  {["⭐ Morning Run — 94%", "📅 Best day: Monday", "⏰ Peak time: 7–9 AM"].map((t) => (
                    <p key={t} className="text-sm text-slate-300">{t}</p>
                  ))}
                </div>
              </div>
              {/* Upgrade overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="rounded-2xl px-6 py-6 text-center w-72"
                  style={{
                    background: "rgba(9,7,20,0.94)",
                    border: "1px solid rgba(139,92,246,0.4)",
                    boxShadow: "0 0 48px rgba(139,92,246,0.18)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(232,121,249,0.15))",
                      border: "1px solid rgba(167,139,250,0.25)",
                    }}
                  >
                    <Lock className="w-5 h-5 text-violet-300" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">Plus Feature</p>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Unlock your full Habit DNA — ring chart, personality tags, insights, and a downloadable shareable card.
                  </p>
                  <button
                    onClick={onUpgrade}
                    className="w-full py-2.5 font-bold rounded-xl text-sm text-white transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                    }}
                  >
                    Upgrade to Plus →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Full DNA (Plus / Pro) ── */}
          {dna.ready && isPaid && (
            <div className="space-y-4">
              {/* Consistency ring */}
              <div
                className="rounded-2xl py-5 px-4 text-center"
                style={{
                  background: "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.14) 0%, rgba(10,8,20,0.8) 60%)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  animation: "dnaFadeUp 0.4s ease-out both",
                }}
              >
                <ConsistencyRing value={dna.overallConsistency} daysOfData={dna.daysOfData} />
                <p className="text-[10px] text-slate-600 mt-2">
                  across all {habits.length} habit{habits.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Stat chips */}
              <div className="grid grid-cols-3 gap-2">
                <StatChip value={dna.totalCompletions} label="Completions" colorClass="text-violet-400" delay={80} />
                <StatChip value={`${dna.longestStreak}d`} label="Best Streak" colorClass="text-orange-400" delay={140} />
                <StatChip value={totalXP >= 1000 ? `${(totalXP / 1000).toFixed(1)}k` : totalXP} label="XP Earned" colorClass="text-amber-400" delay={200} />
              </div>

              {/* Insight rows */}
              <div className="space-y-1.5">
                {dna.bestHabit && (
                  <InsightRow icon={<Star className="w-4 h-4" />} label="Best Habit"
                    value={`${dna.bestHabit.name} — ${dna.bestHabit.score}%`} colorClass="text-emerald-400" delay={260} />
                )}
                <InsightRow icon={<Calendar className="w-4 h-4" />} label="Most Consistent Day"
                  value={dna.mostConsistentDay} colorClass="text-blue-400" delay={310} />
                {dna.peakTime && (
                  <InsightRow icon={<Clock className="w-4 h-4" />} label="Peak Performance Time"
                    value={dna.peakTime} colorClass="text-amber-400" delay={360} />
                )}
                {dna.worstHabit && (
                  <InsightRow icon={<TrendingUp className="w-4 h-4" />} label="Room to Grow"
                    value={`${dna.worstHabit.name} — ${dna.worstHabit.score}%`} colorClass="text-rose-400" delay={410} />
                )}
              </div>

              {/* Personality tags */}
              {dna.personalityTags.length > 0 && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(8,5,18,0.75)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    animation: "dnaFadeUp 0.45s ease-out 460ms both",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Personality Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dna.personalityTags.map((tag, i) => (
                      <span
                        key={tag}
                        className="text-xs px-3 py-1.5 rounded-full font-semibold text-violet-200"
                        style={{
                          background: `linear-gradient(135deg, rgba(109,40,217,${0.22 + i * 0.04}), rgba(139,92,246,0.12))`,
                          border: "1px solid rgba(167,139,250,0.22)",
                          boxShadow: "0 0 10px rgba(139,92,246,0.1)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div
                className="grid grid-cols-2 gap-2"
                style={{ animation: "dnaFadeUp 0.45s ease-out 510ms both" }}
              >
                <button
                  onClick={() => downloadDNACard(dna, habits, totalXP)}
                  className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-300 hover:text-white rounded-2xl transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-2xl transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    boxShadow: "0 4px 18px rgba(139,92,246,0.38)",
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dnaSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes dnaFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
