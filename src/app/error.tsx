"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-700/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-950/40 border border-red-500/20 flex items-center justify-center">
          <span className="text-3xl">⚡</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          We hit an unexpected error. Our team has been notified.
          <br />Please try refreshing — it usually fixes it.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-900/40"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-violet-800/40 hover:border-violet-600/60 text-slate-400 hover:text-white font-medium rounded-xl transition-all text-sm"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
