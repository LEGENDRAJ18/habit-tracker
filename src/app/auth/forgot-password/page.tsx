"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendlyError";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(friendlyError(error.message));
      setLoading(false);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check your inbox</h1>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            We sent a password reset link to{" "}
            <span className="text-violet-400 font-medium">{email}</span>.<br />
            It expires in 1 hour.
          </p>
          <Link href="/auth/login" className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-violet-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-700/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>
        </div>

        <div className="bg-[#0f0f1a] border border-violet-900/25 rounded-2xl p-8 shadow-2xl shadow-violet-950/30">
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>

          <h1 className="text-2xl font-bold text-white mb-1">Reset your password</h1>
          <p className="text-slate-400 text-sm mb-7">
            Enter your email and we&apos;ll send a reset link.
          </p>

          {error && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
