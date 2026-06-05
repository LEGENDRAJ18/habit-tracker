import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SparkleEffect from "@/components/share/SparkleEffect";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShareRow {
  achievement_emoji:       string;
  achievement_name:        string;
  achievement_description: string;
  user_display_name:       string;
  user_streak:             number;
  user_level:              number;
  user_xp:                 number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#7c3aed", "#db2777", "#ea580c",
  "#16a34a", "#0891b2", "#d97706",
];

function avatarColor(name: string): string {
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("share_tokens")
    .select("achievement_name, achievement_description, user_display_name")
    .eq("token", id)
    .maybeSingle();

  if (!data) return { title: "HabitAI Achievement" };

  const title = `${data.user_display_name} — ${data.achievement_name} · HabitAI`;
  return {
    title,
    description: data.achievement_description,
    openGraph: {
      title,
      description: data.achievement_description,
      url:         `${APP_URL}/share/${id}`,
      images:      [{ url: `${APP_URL}/api/og/share/${id}`, width: 1200, height: 630 }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description: data.achievement_description,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("share_tokens")
    .select("*")
    .eq("token", id)
    .maybeSingle<ShareRow>();

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🤔</p>
          <h1 className="text-xl font-bold text-white mb-2">This link has expired</h1>
          <p className="text-slate-500 text-sm mb-6">
            This achievement share link is no longer valid.
          </p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
            Go to HabitAI →
          </Link>
        </div>
      </div>
    );
  }

  const {
    achievement_emoji:       emoji,
    achievement_name:        name,
    achievement_description: description,
    user_display_name:       displayName,
    user_streak:             streak,
    user_level:              level,
    user_xp:                 xp,
  } = data;

  const initials = displayName.slice(0, 2).toUpperCase();
  const color    = avatarColor(displayName);

  return (
    <div className="min-h-screen bg-[#09090f] relative overflow-hidden">
      {/* Sparkle animation (client component) */}
      <SparkleEffect />

      {/* Ambient background glows */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-700/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-800/6 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-14 flex flex-col items-center">

        {/* ── Logo ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-12">
          <div
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center"
            style={{ boxShadow: "0 0 24px rgba(139,92,246,0.5)" }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">
            habit<span className="text-violet-400">AI</span>
          </span>
        </div>

        {/* ── Hero card ─────────────────────────────────────────────────────── */}
        <div
          className="w-full bg-gradient-to-br from-violet-950/80 via-[#0f0f1a] to-[#0a0a18] border border-violet-700/30 rounded-3xl p-8 text-center mb-5"
          style={{
            boxShadow: "0 0 0 1px rgba(139,92,246,0.12), 0 32px 80px rgba(0,0,0,0.7), 0 0 100px rgba(139,92,246,0.1)",
          }}
        >
          {/* Emoji with glow ring */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute w-28 h-28 rounded-full bg-violet-600/15 blur-2xl" />
            <span className="relative leading-none" style={{ fontSize: 80 }}>{emoji}</span>
          </div>

          {/* Achievement title */}
          <h1 className="text-2xl font-black text-white mb-2 tracking-tight">{name}</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">{description}</p>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-violet-700/25 to-transparent mb-6" />

          {/* User attribution */}
          <div className="flex flex-col items-center gap-2.5">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
              style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}55` }}
            >
              {initials}
            </div>
            <p className="text-sm text-slate-400">
              <span className="text-white font-semibold">{displayName}</span> just earned this on HabitAI
            </p>

            {/* Streak + Level badges */}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 bg-orange-950/50 border border-orange-700/30 text-orange-300 text-xs font-semibold px-3 py-1 rounded-full">
                🔥 {streak}-day streak
              </span>
              <span className="inline-flex items-center gap-1 bg-violet-950/60 border border-violet-700/30 text-violet-300 text-xs font-semibold px-3 py-1 rounded-full">
                ⚡ Level {level}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="w-full grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Current Streak", value: `${streak} days`, emoji: "🔥" },
            { label: "Level",          value: `Level ${level}`, emoji: "⚡" },
            { label: "Total XP",       value: xp.toLocaleString(), emoji: "✨" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-3.5 text-center"
            >
              <p className="text-xl mb-1 leading-none">{s.emoji}</p>
              <p className="text-sm font-bold text-white leading-none mb-0.5">{s.value}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── CTA section ───────────────────────────────────────────────────── */}
        <div className="w-full text-center mb-10">
          <p className="text-lg font-bold text-white mb-1">
            Want to build habits like {displayName}?
          </p>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Join HabitAI free — AI coaching, streak tracking, and friends
            to keep you accountable.
          </p>

          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-2xl text-base transition-all shadow-2xl shadow-violet-900/50 hover:-translate-y-0.5 mb-3"
            style={{ boxShadow: "0 8px 40px rgba(139,92,246,0.45)" }}
          >
            Start for free
            <ArrowRight className="w-5 h-5" />
          </Link>

          <p className="text-xs text-slate-600">
            No credit card required &nbsp;·&nbsp; Free forever
          </p>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-700">
            Made with{" "}
            <Link href="/" className="text-violet-600 hover:text-violet-500 transition-colors font-medium">
              HabitAI
            </Link>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-700">
            <Link href="/terms"   className="hover:text-slate-500 transition-colors">Terms</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-slate-500 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
