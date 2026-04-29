import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

interface SharePayload {
  type: "streak" | "level" | "daily";
  value: number;
  username: string;
}

function decodePayload(id: string): SharePayload | null {
  try {
    // Restore base64 padding
    const b64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const pad  = b64.length % 4;
    const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as SharePayload;
  } catch {
    return null;
  }
}

function achievementMeta(p: SharePayload): { emoji: string; title: string; desc: string } {
  if (p.type === "streak") {
    return {
      emoji: "🔥",
      title: `${p.value}-Day Streak`,
      desc:  `${p.username} has completed their habits ${p.value} days in a row on HabitAI.`,
    };
  }
  if (p.type === "level") {
    return {
      emoji: "⚡",
      title: `Reached Level ${p.value}`,
      desc:  `${p.username} levelled up to Level ${p.value} on HabitAI by staying consistent.`,
    };
  }
  return {
    emoji: "🎯",
    title: "All Habits Complete",
    desc:  `${p.username} completed every single habit today on HabitAI.`,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const payload = decodePayload(id);
  if (!payload) {
    return { title: "HabitAI Achievement" };
  }
  const { emoji, title, desc } = achievementMeta(payload);
  return {
    title:       `${emoji} ${payload.username} — ${title} · HabitAI`,
    description: desc,
    openGraph: {
      title:       `${emoji} ${payload.username} — ${title}`,
      description: desc,
      url:         `${APP_URL}/share/${id}`,
      images:      [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card:        "summary_large_image",
      title:       `${emoji} ${payload.username} — ${title}`,
      description: desc,
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = decodePayload(id);

  // ── Invalid / tampered link ──────────────────────────────────────────────
  if (!payload) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-2xl mb-3">🤔</p>
          <h1 className="text-xl font-bold text-white mb-2">Invalid share link</h1>
          <p className="text-slate-500 text-sm mb-6">This achievement link is invalid or has expired.</p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
            Go to HabitAI →
          </Link>
        </div>
      </div>
    );
  }

  const { emoji, title, desc } = achievementMeta(payload);

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-700/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center"
            style={{ boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black text-white tracking-tight">
            habit<span className="text-violet-400">AI</span>
          </span>
        </div>

        {/* Achievement card */}
        <div className="bg-gradient-to-br from-violet-950/70 to-[#0f0f1a] border border-violet-700/35 rounded-3xl p-8 text-center mb-6 shadow-2xl shadow-violet-950/50"
          style={{ boxShadow: "0 0 0 1px rgba(139,92,246,0.15), 0 24px 60px rgba(0,0,0,0.6), 0 0 80px rgba(139,92,246,0.1)" }}>

          {/* Glow ring behind emoji */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute w-24 h-24 rounded-full bg-violet-600/15 blur-xl" />
            <span className="relative text-6xl">{emoji}</span>
          </div>

          <h1 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">{desc}</p>

          {/* Username badge */}
          <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-700/30 rounded-full px-4 py-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">
                {payload.username.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-semibold text-violet-200">{payload.username}</span>
          </div>
        </div>

        {/* Social proof nudge */}
        <p className="text-center text-sm text-slate-500 mb-5">
          Join {payload.username} on HabitAI
        </p>

        {/* CTA */}
        <Link
          href="/auth/signup"
          className="flex items-center justify-center gap-2 w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl text-base transition-all shadow-xl shadow-violet-900/40 hover:-translate-y-0.5 mb-3"
        >
          Create your free account
          <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="text-center text-xs text-slate-600">
          Free forever · No credit card required
        </p>

        {/* Footer link */}
        <div className="text-center mt-8">
          <Link href="/" className="text-xs text-slate-700 hover:text-slate-500 transition-colors">
            Learn more about HabitAI →
          </Link>
        </div>
      </div>
    </div>
  );
}
