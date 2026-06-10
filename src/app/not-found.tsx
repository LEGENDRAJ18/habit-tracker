import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-700/8 rounded-full blur-[140px]" />
      </div>

      <div className="relative text-center max-w-md">
        {/* 404 number */}
        <p
          className="text-[120px] sm:text-[160px] font-black leading-none mb-2 select-none"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.05) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </p>

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center">
          <span className="text-3xl">🔍</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Oops! This page doesn&apos;t exist. It may have been moved or deleted.
          <br />Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-900/40"
          >
            <Home className="w-4 h-4" />
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-violet-800/40 hover:border-violet-600/60 text-slate-400 hover:text-white font-medium rounded-xl transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
