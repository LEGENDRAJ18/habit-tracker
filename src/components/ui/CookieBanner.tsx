"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "habitai_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const supabase = useRef(createClient()).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Fast local check — if already accepted on this device, never show
    if (localStorage.getItem(STORAGE_KEY)) return;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if this user already accepted on any device
          const { data } = await supabase
            .from("profiles")
            .select("cookie_consent")
            .eq("id", user.id)
            .maybeSingle();

          if (data?.cookie_consent) {
            // Accepted elsewhere — sync locally and stay hidden
            localStorage.setItem(STORAGE_KEY, "accepted");
            return;
          }
        }
      } catch { /* non-blocking */ }

      // Not accepted yet — show after a small delay to avoid hydration flash
      timerRef.current = setTimeout(() => setVisible(true), 700);
    })();

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept = async () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);

    // Persist to profile so the banner never shows on any device for this user
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ cookie_consent: true })
          .eq("id", user.id);
      }
    } catch { /* non-blocking */ }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="bg-[#0f0f1a] border border-violet-800/40 rounded-2xl shadow-2xl shadow-black/60 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-900/40 border border-violet-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Cookie className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white mb-1">Cookies &amp; Privacy</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We use cookies to keep you logged in and improve your experience.
              No tracking or ad cookies.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={accept}
                className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Accept
              </button>
              <Link
                href="/privacy"
                className="flex-1 py-1.5 text-center border border-violet-800/50 text-violet-400 hover:text-violet-300 hover:border-violet-700/60 text-xs font-medium rounded-lg transition-colors"
              >
                Learn more
              </Link>
            </div>
          </div>
          <button
            onClick={accept}
            aria-label="Dismiss"
            className="flex-shrink-0 p-1 text-slate-600 hover:text-slate-400 transition-colors rounded-lg hover:bg-violet-950/40 -mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
