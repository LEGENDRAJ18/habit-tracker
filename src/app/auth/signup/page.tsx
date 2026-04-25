"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 flex-shrink-0" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 flex-shrink-0" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

type OAuthProvider = "google" | "apple";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const plan =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("plan")
      : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOAuth = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    setError(null);
    const next = plan ? `/dashboard?checkout=${plan}` : "/dashboard";
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setOauthLoading(null);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const next = plan ? `/dashboard?checkout=${plan}` : "/dashboard";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Email confirmation is disabled — session is live immediately.
      // Send welcome email via API (callback won't fire for this flow).
      fetch("/api/welcome-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).catch(() => {});
      router.push(next);
      router.refresh();
    } else {
      // Email confirmation required — welcome email fires from /auth/callback
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
          <p className="text-slate-400 mb-6">
            We&apos;ve sent a confirmation link to{" "}
            <span className="text-violet-400 font-medium">{email}</span>. Click the link to
            activate your account.
          </p>
          <Link href="/auth/login" className="text-sm text-violet-400 hover:text-violet-300">
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
        {/* Logo */}
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
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-slate-400 text-sm mb-7">
            Start building better habits today — it&apos;s free
          </p>

          {error && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-2.5 mb-6">
            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed text-[#1f1f1f] font-semibold text-sm py-2.5 px-4 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuth("apple")}
              disabled={!!oauthLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 px-4 rounded-xl border border-[#333] transition-all duration-200 shadow-sm"
            >
              {oauthLoading === "apple" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <AppleIcon />
              )}
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-violet-900/30" />
            <span className="text-xs text-slate-600 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-violet-900/30" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
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
                className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                          ? password.length >= 12
                            ? "bg-green-500"
                            : "bg-violet-500"
                          : "bg-violet-950"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-xs text-slate-600 text-center mt-5">
            By signing up, you agree to our{" "}
            <Link href="#" className="text-violet-500 hover:text-violet-400">Terms</Link>{" "}
            and{" "}
            <Link href="#" className="text-violet-500 hover:text-violet-400">Privacy Policy</Link>
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
