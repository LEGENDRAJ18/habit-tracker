"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

// Bumped to v2 so users who dismissed the old bottom banner see this new one.
const DISMISS_KEY = "habitai-install-dismissed-v2";

export default function InstallBanner() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" ? localStorage.getItem(DISMISS_KEY) === "1" : true
  );
  const [visible, setVisible]     = useState(false);

  useEffect(() => {
    const shouldShow = (canInstall || isIOS) && !isInstalled && !dismissed;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!shouldShow) { setVisible(false); return; }
    // Brief delay so the page settles before the banner slides in.
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, [canInstall, isIOS, isInstalled, dismissed]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const handleInstall = async () => {
    if (isIOS) {
      // iOS can't be auto-prompted — the banner shows manual instructions
      dismiss();
      return;
    }
    await promptInstall();
    dismiss();
  };

  if (!visible) return null;

  return (
    /* Top banner — mobile only; desktop installs via Settings */
    <div
      className="fixed top-0 inset-x-0 z-[60] px-3 pt-3 pb-0 sm:hidden"
      style={{ animation: "slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <div className="bg-[#0f0f1a] border border-violet-700/40 rounded-2xl px-4 py-3.5 shadow-2xl shadow-violet-950/60">
        <div className="flex items-center gap-3">
          {/* App icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-900/40">
            <span className="text-lg leading-none select-none">✨</span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              Add HabitAI to your home screen
            </p>
            {isIOS ? (
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                Tap&nbsp;
                <span className="inline-block bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Share
                </span>
                &nbsp;then{" "}
                <span className="text-violet-300 font-medium">Add to Home Screen</span>.
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">
                For the best experience — works offline too.
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-xl border border-slate-800/60 hover:border-slate-700"
          >
            Maybe later
          </button>
          {!isIOS && (
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
          )}
          {isIOS && (
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 bg-violet-600/20 border border-violet-600/40 text-violet-300 text-xs font-semibold rounded-xl transition-all"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
