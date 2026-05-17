"use client";

import { Bell, X } from "lucide-react";

interface Props {
  onAllow: () => void;
  onDismiss: () => void;
}

export default function PushPermissionPrompt({ onAllow, onDismiss }: Props) {
  return (
    <div
      className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[calc(100vw-32px)] max-w-sm"
      style={{ animation: "toastSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <div className="bg-[#0f0f1a] border border-violet-700/40 rounded-2xl p-4 shadow-2xl shadow-violet-950/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-900/40 mt-0.5">
            <Bell className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              Stay on track with reminders
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">
              Get a nudge at 8 pm if your habits aren&apos;t done, and an alert if your streak is at risk.
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0 -mt-0.5"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-xl border border-slate-800/60 hover:border-slate-700"
          >
            Not now
          </button>
          <button
            onClick={onAllow}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-900/30"
          >
            <Bell className="w-3.5 h-3.5" />
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
