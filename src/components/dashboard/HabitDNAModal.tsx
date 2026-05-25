"use client";

import { useRef } from "react";
import { X, Lock, Download, Share2, Star, Clock, Calendar, Zap, Award, TrendingUp } from "lucide-react";
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

function ScoreBadge({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-[#0a0a14] border border-violet-900/25 rounded-xl p-3 text-center">
      <p className={`text-xl font-black leading-none ${color} mb-1`}>{value}</p>
      <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">{label}</p>
    </div>
  );
}

function downloadDNACard(dna: ReturnType<typeof useHabitDNA>, habits: Habit[], totalXP: number) {
  const canvas  = document.createElement("canvas");
  canvas.width  = 600;
  canvas.height = 820;
  const ctx     = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#09090f";
  ctx.fillRect(0, 0, 600, 820);

  // Gradient overlay
  const grad = ctx.createLinearGradient(0, 0, 600, 820);
  grad.addColorStop(0, "rgba(139,92,246,0.18)");
  grad.addColorStop(1, "rgba(109,40,217,0.04)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 820);

  // Border
  ctx.strokeStyle = "rgba(139,92,246,0.4)";
  ctx.lineWidth   = 2;
  ctx.roundRect(4, 4, 592, 812, 20);
  ctx.stroke();

  // Header
  ctx.font        = "bold 14px sans-serif";
  ctx.fillStyle   = "rgba(167,139,250,0.8)";
  ctx.textAlign   = "center";
  ctx.fillText("✦ HABIT DNA ✦", 300, 52);

  ctx.font      = "bold 32px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Your Habit Profile", 300, 92);

  ctx.font      = "13px sans-serif";
  ctx.fillStyle = "rgba(148,163,184,0.7)";
  ctx.fillText(`${habits.length} active habit${habits.length !== 1 ? "s" : ""} · habitAI`, 300, 116);

  // Divider
  ctx.beginPath();
  ctx.strokeStyle = "rgba(139,92,246,0.2)";
  ctx.lineWidth   = 1;
  ctx.moveTo(60, 136); ctx.lineTo(540, 136);
  ctx.stroke();

  const stats = [
    { label: "Overall Consistency", value: `${dna.overallConsistency}%` },
    { label: "Total Completions",   value: `${dna.totalCompletions}` },
    { label: "Longest Streak",      value: `${dna.longestStreak}d` },
    { label: "XP Earned",           value: `${totalXP.toLocaleString()}` },
    { label: "Best Habit",          value: dna.bestHabit?.name?.slice(0, 20) ?? "—" },
    { label: "Peak Performance",    value: `${dna.mostConsistentDay}s` },
  ];

  stats.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = 80 + col * 160;
    const y   = 180 + row * 100;

    ctx.fillStyle = "rgba(15,15,26,0.8)";
    ctx.roundRect(x - 65, y - 32, 130, 70, 12);
    ctx.fill();

    ctx.font      = "bold 18px sans-serif";
    ctx.fillStyle = "#a78bfa";
    ctx.textAlign = "center";
    ctx.fillText(s.value, x, y);

    ctx.font      = "10px sans-serif";
    ctx.fillStyle = "rgba(100,116,139,0.8)";
    ctx.fillText(s.label.toUpperCase(), x, y + 22);
  });

  // Personality tags
  if (dna.personalityTags.length > 0) {
    ctx.font      = "bold 12px sans-serif";
    ctx.fillStyle = "rgba(139,92,246,0.6)";
    ctx.textAlign = "center";
    ctx.fillText("PERSONALITY", 300, 410);

    const tagY = 440;
    const totalW = dna.personalityTags.slice(0, 3).reduce((sum, t) => sum + ctx.measureText(t).width + 32, 0);
    let tagX = (600 - totalW) / 2;
    dna.personalityTags.slice(0, 3).forEach((tag) => {
      const w = ctx.measureText(tag).width + 32;
      ctx.fillStyle = "rgba(139,92,246,0.2)";
      ctx.roundRect(tagX, tagY - 16, w, 28, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(139,92,246,0.35)";
      ctx.lineWidth = 1;
      ctx.roundRect(tagX, tagY - 16, w, 28, 14);
      ctx.stroke();
      ctx.font      = "11px sans-serif";
      ctx.fillStyle = "#a78bfa";
      ctx.textAlign = "left";
      ctx.fillText(tag, tagX + 16, tagY + 6);
      tagX += w + 8;
    });
  }

  // Footer
  ctx.font      = "11px sans-serif";
  ctx.fillStyle = "rgba(100,116,139,0.5)";
  ctx.textAlign = "center";
  ctx.fillText("habitaiapp.com · Track your identity, not just your habits", 300, 780);

  const link = document.createElement("a");
  link.download = "habit-dna.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function HabitDNAModal({ habits, logs, tier, totalXP, onClose, onUpgrade }: Props) {
  const dna       = useHabitDNA(habits, logs);
  const isPaidTier = tier === "plus" || tier === "pro";
  const cardRef   = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    const text = `My Habit DNA on habitAI:\n🏆 ${dna.overallConsistency}% overall consistency\n🔥 ${dna.longestStreak}-day longest streak\n⚡ ${totalXP.toLocaleString()} XP earned\n${dna.personalityTags.slice(0, 2).join(" · ")}\nhabitaiapp.com`;
    if (navigator.share) {
      try { await navigator.share({ title: "My Habit DNA", text }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-[#0d0d1a] border border-violet-700/30 rounded-3xl shadow-2xl shadow-violet-950/60 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-violet-900/20 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/25 border border-violet-500/35 flex items-center justify-center"
                   style={{ boxShadow: "0 0 18px rgba(139,92,246,0.35)" }}>
                <Zap className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Habit DNA</h2>
                <p className="text-[11px] text-violet-400/70">Your behavioral fingerprint</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-violet-950/50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!dna.ready && (
            <div className="bg-violet-950/30 border border-violet-800/25 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-white mb-1">Not enough data yet</p>
              <p className="text-xs text-slate-400">Habit DNA unlocks after 30 days of tracking. You have {dna.daysOfData} day{dna.daysOfData !== 1 ? "s" : ""} so far — keep going!</p>
            </div>
          )}

          {/* Free preview: blurred stats teaser */}
          {dna.ready && !isPaidTier && (
            <div className="relative">
              {/* Blurred preview */}
              <div className="filter blur-sm pointer-events-none select-none">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <ScoreBadge value="87%" label="Consistency" color="text-violet-400" />
                  <ScoreBadge value="142" label="Completions" color="text-emerald-400" />
                  <ScoreBadge value="21d" label="Best Streak" color="text-orange-400" />
                </div>
                <div className="bg-violet-950/30 border border-violet-800/25 rounded-2xl p-4 mb-3">
                  <p className="text-xs font-bold text-violet-400 mb-2">PERSONALITY TAGS</p>
                  <div className="flex flex-wrap gap-2">
                    {["Morning Champion 🌅", "Fitness Warrior 💪", "Consistency King 👑"].map((t) => (
                      <span key={t} className="text-xs bg-violet-950/60 border border-violet-800/30 text-violet-300 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              {/* Lock overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
                <div className="bg-[#0f0f1a]/90 backdrop-blur-sm border border-violet-700/40 rounded-2xl px-6 py-5 text-center max-w-xs">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/25 border border-violet-500/30 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-5 h-5 text-violet-300" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1.5">Plus Feature</p>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">Unlock your full Habit DNA — consistency scores, personality tags, and a shareable card.</p>
                  <button
                    onClick={onUpgrade}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    Upgrade to Plus →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full DNA — Plus/Pro */}
          {dna.ready && isPaidTier && (
            <div ref={cardRef} className="space-y-4">
              {/* Overall consistency */}
              <div className="bg-gradient-to-br from-violet-950/60 to-[#0f0f1a] border border-violet-700/30 rounded-2xl p-5 text-center">
                <p className="text-[10px] text-violet-400/70 uppercase tracking-wider font-bold mb-1">Overall Consistency</p>
                <p className="text-5xl font-black text-white mb-1"
                   style={{ background: "linear-gradient(135deg, #a78bfa, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {dna.overallConsistency}%
                </p>
                <p className="text-xs text-slate-500">across all {habits.length} habit{habits.length !== 1 ? "s" : ""}</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <ScoreBadge value={dna.totalCompletions} label="Completions" color="text-violet-400" />
                <ScoreBadge value={`${dna.longestStreak}d`} label="Best Streak" color="text-orange-400" />
                <ScoreBadge value={`${totalXP.toLocaleString()}`} label="XP Earned" color="text-amber-400" />
              </div>

              {/* Key insights */}
              <div className="space-y-2">
                {dna.bestHabit && (
                  <div className="flex items-center gap-3 bg-emerald-950/20 border border-emerald-800/25 rounded-xl px-4 py-2.5">
                    <Star className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wider">Best Habit</p>
                      <p className="text-sm text-white font-medium truncate">{dna.bestHabit.name} <span className="text-emerald-400">({dna.bestHabit.score}%)</span></p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-blue-950/20 border border-blue-800/25 rounded-xl px-4 py-2.5">
                  <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-400/70 font-semibold uppercase tracking-wider">Most Consistent Day</p>
                    <p className="text-sm text-white font-medium">{dna.mostConsistentDay}</p>
                  </div>
                </div>
                {dna.peakTime && (
                  <div className="flex items-center gap-3 bg-amber-950/20 border border-amber-800/25 rounded-xl px-4 py-2.5">
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider">Peak Performance Time</p>
                      <p className="text-sm text-white font-medium">{dna.peakTime}</p>
                    </div>
                  </div>
                )}
                {dna.worstHabit && (
                  <div className="flex items-center gap-3 bg-red-950/20 border border-red-800/25 rounded-xl px-4 py-2.5">
                    <TrendingUp className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider">Most Room to Grow</p>
                      <p className="text-sm text-white font-medium truncate">{dna.worstHabit.name} <span className="text-red-400">({dna.worstHabit.score}%)</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Personality tags */}
              {dna.personalityTags.length > 0 && (
                <div className="bg-violet-950/30 border border-violet-800/25 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Personality Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dna.personalityTags.map((tag) => (
                      <span key={tag} className="text-xs bg-violet-950/60 border border-violet-700/30 text-violet-300 px-3 py-1.5 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => downloadDNACard(dna, habits, totalXP)}
                  className="flex items-center justify-center gap-2 py-2.5 bg-violet-950/50 border border-violet-700/30 hover:border-violet-600/50 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Card
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
