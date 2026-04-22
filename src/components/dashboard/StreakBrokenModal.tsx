"use client";

import { Shield } from "lucide-react";

interface Props {
  onUpgrade: () => void;
  onDismiss: () => void;
}

export default function StreakBrokenModal({ onUpgrade, onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onDismiss()}
    >
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-slate-700/40 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="text-5xl mb-4 leading-none">😢</div>
          <h2 className="text-xl font-bold text-white mb-2">Your streak broke</h2>
          <p className="text-sm text-slate-400 mb-5">
            You missed a day and lost your streak. Upgrade to Plus to get automatic
            streak protection — never lose your progress again.
          </p>

          <div className="flex items-start gap-3 bg-violet-950/40 border border-violet-700/30 rounded-xl p-4 mb-5 text-left">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-violet-200">Streak Protection</p>
              <p className="text-xs text-violet-400/70 mt-0.5">
                1 automatic freeze per week so life can happen without breaking your habits.
              </p>
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all mb-2.5"
          >
            Upgrade to Plus →
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
