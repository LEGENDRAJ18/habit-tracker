"use client";

import { useState, useEffect } from "react";
import {
  X, Copy, Check, Loader2, Share2,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface Props {
  type: "streak" | "level" | "daily";
  value: number;
  tier?: string;
  userStreak: number;
  userLevel: number;
  userXp: number;
  onClose: () => void;
}

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#7c3aed", "#db2777", "#ea580c",
  "#16a34a", "#0891b2", "#d97706",
];

function avatarColor(name: string): string {
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Social icons ──────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

// ── Mini preview card ─────────────────────────────────────────────────────────

function MiniPreview({
  emoji, name, description, displayName, streak, level, xp,
}: {
  emoji: string;
  name: string;
  description: string;
  displayName: string;
  streak: number;
  level: number;
  xp: number;
}) {
  const color = avatarColor(displayName);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative rounded-2xl overflow-hidden border border-violet-700/30 bg-gradient-to-br from-violet-950/70 to-[#09090f] p-5 text-center shadow-lg">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative">
        {/* Emoji */}
        <div className="text-5xl mb-2 leading-none">{emoji}</div>

        {/* Name + desc */}
        <p className="text-sm font-bold text-white mb-0.5">{name}</p>
        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">{description}</p>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-violet-700/30 to-transparent mb-3" />

        {/* User row */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
          <span className="text-[11px] text-slate-400">
            <span className="text-slate-200 font-medium">{displayName}</span> on HabitAI
          </span>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "Streak", value: `${streak}🔥` },
            { label: "Level",  value: `⚡ ${level}` },
            { label: "XP",     value: xp.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="bg-violet-950/50 border border-violet-900/30 rounded-lg py-1.5 px-1">
              <p className="text-[10px] font-semibold text-white">{s.value}</p>
              <p className="text-[8px] text-slate-600 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShareAchievement({
  type, value, tier, userStreak, userLevel, userXp, onClose,
}: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

  const [token,       setToken]       = useState<string | null>(null);
  const [generating,  setGenerating]  = useState(true);
  const [genError,    setGenError]    = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [displayName, setDisplayName] = useState("Habit Builder");

  // Achievement display derived before token fetch
  const meta = (() => {
    if (type === "streak") return {
      emoji: value >= 30 ? "💎" : "🔥",
      name: `${value}-Day Streak`,
      description: value >= 30
        ? `${value} consecutive days of habit completion.`
        : `${value} days in a row without breaking the chain.`,
    };
    if (type === "level") return {
      emoji: "⚡",
      name: tier ? `${tier} Tier Reached` : `Level ${value} Reached`,
      description: `Reached level ${value} on HabitAI through daily consistency.`,
    };
    return {
      emoji: "🎯",
      name: "Perfect Day",
      description: "Completed every single habit today.",
    };
  })();

  // Generate token on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/share/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type, value, tier,
            userStreak, userLevel, userXp,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.token) {
          setToken(data.token);
          // Try to get display name from the same response context
        } else {
          setGenError(true);
        }
      } catch {
        if (!cancelled) setGenError(true);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get display name from auth
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        const raw = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
        const name = raw.split(/[\s_\-+@]/)[0]?.trim();
        if (name) setDisplayName(name);
      });
    });
  }, []);

  const shareLink = token ? `${appUrl}/share/${token}` : "";

  const shareText = type === "streak"
    ? `I just hit a ${value}-day habit streak on HabitAI 🔥 Consistency compounds.`
    : type === "level"
    ? `I just reached Level ${value} on HabitAI ⚡ Building habits daily.`
    : `I completed ALL my habits today on HabitAI 🎯 One day at a time.`;

  const handleCopy = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast("Link copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleNativeShare = async () => {
    if (!shareLink || !navigator.share) return;
    try {
      await navigator.share({ title: meta.name, text: shareText, url: shareLink });
    } catch { /* user dismissed */ }
  };

  const twitterUrl  = shareLink
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + " " + shareLink)}`
    : "";
  const whatsappUrl = shareLink
    ? `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareLink)}`
    : "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-16 p-4 overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-violet-700/35 rounded-2xl shadow-2xl shadow-violet-950/60 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-900/20">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-semibold text-white">Share your achievement</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Loading / error state */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <p className="text-xs text-slate-500">Creating your share link…</p>
            </div>
          )}

          {!generating && genError && (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">
                Couldn&apos;t generate a share link. Check your connection and try again.
              </p>
            </div>
          )}

          {!generating && !genError && token && (
            <>
              {/* Preview card */}
              <MiniPreview
                emoji={meta.emoji}
                name={meta.name}
                description={meta.description}
                displayName={displayName}
                streak={userStreak}
                level={userLevel}
                xp={userXp}
              />

              {/* Share link */}
              <div className="flex items-center gap-2 bg-violet-950/40 border border-violet-800/30 rounded-xl px-3 py-2.5">
                <span className="flex-1 text-xs text-slate-500 truncate font-mono">
                  {shareLink}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0 font-medium"
                >
                  {copied
                    ? <><Check className="w-3.5 h-3.5 text-emerald-400" />Copied!</>
                    : <><Copy className="w-3.5 h-3.5" />Copy</>}
                </button>
              </div>

              {/* Social share buttons */}
              <div className="space-y-2">
                {/* Big copy button */}
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-violet-900/30"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Link copied!" : "Copy share link"}
                </button>

                {/* Native share on mobile */}
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a2e] hover:bg-[#232340] border border-violet-700/25 hover:border-violet-600/40 text-slate-200 font-medium rounded-xl text-sm transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Share via…
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 bg-[#1a1a2e] hover:bg-[#232340] border border-[#1d9bf0]/25 hover:border-[#1d9bf0]/55 text-[#1d9bf0] font-medium rounded-xl text-xs transition-all"
                  >
                    <XIcon />
                    Twitter / X
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 bg-[#1a1a2e] hover:bg-[#232340] border border-[#25D366]/25 hover:border-[#25D366]/55 text-[#25D366] font-medium rounded-xl text-xs transition-all"
                  >
                    <WhatsAppIcon />
                    WhatsApp
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
