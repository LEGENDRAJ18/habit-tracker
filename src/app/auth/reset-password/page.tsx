"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendlyError";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const code   = params.get("code");

  const [ready, setReady]               = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(
    !code ? "Invalid or missing reset link. Please request a new one." : null
  );
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Exchange the one-time code for an active session as soon as the page mounts.
  useEffect(() => {
    if (!code) return;
    createClient()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setExchangeError(
            "This link has expired or already been used. Please request a new one."
          );
        } else {
          setReady(true);
        }
      });
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await createClient().auth.updateUser({ password });

    if (error) {
      setError(friendlyError(error.message));
      setLoading(false);
    } else {
      router.push("/auth/login?message=password_updated");
    }
  };

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
          <h1 className="text-2xl font-bold text-white mb-1">Choose a new password</h1>
          <p className="text-slate-400 text-sm mb-7">Make it strong — at least 8 characters.</p>

          {/* Link expired / invalid */}
          {exchangeError && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">{exchangeError}</p>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block"
                >
                  Request a new reset link →
                </Link>
              </div>
            </div>
          )}

          {/* Verifying the code */}
          {!ready && !exchangeError && (
            <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Verifying reset link…</span>
            </div>
          )}

          {/* Password form — only rendered after session is established */}
          {ready && (
            <>
              {error && (
                <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      autoFocus
                      className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= i * 3
                              ? password.length >= 12 ? "bg-green-500" : "bg-violet-500"
                              : "bg-violet-950"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    "Set new password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
