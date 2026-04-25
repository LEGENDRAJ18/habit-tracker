"use client";

import { useState } from "react";
import { X, Download, Link2, Check } from "lucide-react";

interface Props {
  type: "streak" | "level";
  value: number;
  tier?: string;
  onClose: () => void;
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function ShareAchievement({ type, value, tier, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const cardUrl = `/api/share-card?type=${type}&value=${value}${tier ? `&tier=${encodeURIComponent(tier)}` : ""}`;

  const shareText = type === "streak"
    ? `I just hit a ${value}-day habit streak on @HabitAI! 🔥 Consistency compounds. Build yours → `
    : `I just reached Level ${value} on @HabitAI! ⚡ Making habits a game makes them stick → `;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + appUrl)}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await fetch(cardUrl).then((r) => r.blob());
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `habitai-${type}-${value}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText + appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-sm bg-[#0f0f1a] border border-violet-700/40 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-violet-950/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-900/20">
          <p className="text-sm font-semibold text-white">Share your achievement</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Card preview */}
          <div className="relative rounded-xl overflow-hidden border border-violet-800/30 mb-5 bg-[#09090f] aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardUrl}
              alt="Share card preview"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-violet-900/30"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Downloading…" : "Download image"}
            </button>

            {/* Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#1a1a2e] hover:bg-[#232340] border border-[#1d9bf0]/30 hover:border-[#1d9bf0]/60 text-[#1d9bf0] font-semibold rounded-xl text-sm transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
              Share on Twitter / X
            </a>

            {/* Discord */}
            <a
              href="https://discord.gg/habitai"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#1a1a2e] hover:bg-[#232340] border border-[#5865F2]/30 hover:border-[#5865F2]/60 text-[#8891F7] font-semibold rounded-xl text-sm transition-all"
            >
              <DiscordIcon />
              Share in Discord community
            </a>

            {/* Copy link */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy text"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
