"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "habitai-install-dismissed";

export default function InstallBanner() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();

  // Start hidden to prevent SSR flash; read localStorage after mount.
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible]     = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    setDismissed(wasDismissed);
  }, []);

  useEffect(() => {
    const shouldShow = (canInstall || isIOS) && !isInstalled && !dismissed;
    if (!shouldShow) { setVisible(false); return; }
    // Slight delay so the page settles before the banner slides in.
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [canInstall, isIOS, isInstalled, dismissed]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const handleInstall = async () => {
    if (isIOS) {
      dismiss(); // iOS can't be prompted — banner just showed the instructions
      return;
    }
    await promptInstall();
    dismiss();
  };

  if (!visible) return null;

  return (
    /* Only visible on small screens — desktop installs via nav button */
    <div
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:hidden"
      style={{ animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <div className="bg-[#0f0f1a] border border-violet-700/40 rounded-2xl px-4 py-3.5 shadow-2xl shadow-violet-950/60">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-900/40">
            <span className="text-lg leading-none select-none">✨</span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-white leading-tight">
              Install HabitAI
            </p>
            {isIOS ? (
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Tap&nbsp;<span className="inline-block bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-medium">Share</span>&nbsp;then
                {" "}<span className="text-violet-300 font-medium">Add to Home Screen</span> for the best experience.
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">
                Add to your home screen for the best experience.
              </p>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors p-1 -mt-0.5 -mr-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons — only show the install button for Chrome/Android */}
        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={dismiss}
              className="flex-1 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-xl"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
