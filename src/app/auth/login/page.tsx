"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle2, ArrowRight, Mail, RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── OAuth icon components ───────────────────────────────────────────────────

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "email" | "password" | "signup" | "check-email";
type OAuthProvider = "github" | "apple";

// ─── Background decoration ───────────────────────────────────────────────────

function Glows() {
  return (
    <>
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-violet-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-700/10 rounded-full blur-[120px] pointer-events-none" />
    </>
  );
}

function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const icon = size === "lg" ? "w-12 h-12 rounded-2xl" : "w-9 h-9 rounded-xl";
  const iconInner = size === "lg" ? "w-6 h-6" : "w-4 h-4";
  const text = size === "lg" ? "text-2xl" : "text-xl";
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <div className={`${icon} bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-900/30`}>
        <Sparkles className={`${iconInner} text-white`} />
      </div>
      <span className={`${text} font-black text-white tracking-tight`}>
        habit<span className="text-violet-400">AI</span>
      </span>
    </Link>
  );
}

// ─── "Check your email" screen ───────────────────────────────────────────────

function CheckEmailScreen({
  email,
  onBack,
  plan,
}: {
  email: string;
  onBack: () => void;
  plan: string | null;
}) {
  const supabase = createClient();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleResend = async () => {
    setResendLoading(true);
    const next = plan ? `/dashboard?checkout=${plan}` : "/dashboard";
    await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setResendLoading(false);
    setResendDone(true);
    setResendCooldown(60);
  };

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <Glows />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
        </div>

        <div className="bg-[#0f0f1a] border border-violet-900/25 rounded-2xl p-8 shadow-2xl shadow-violet-950/30 text-center">
          {/* Animated email icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute w-24 h-24 rounded-full bg-violet-600/12 blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-violet-600/15 border border-violet-600/25 flex items-center justify-center">
              <Mail className="w-7 h-7 text-violet-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">One more step! 🎉</h1>
          <p className="text-slate-400 text-sm mb-1">We sent a confirmation link to</p>
          <p className="text-violet-400 font-semibold text-sm mb-4">{email}</p>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Check your inbox — it should arrive in under a minute.
            <br />
            Once confirmed you&apos;ll be taken straight to your dashboard.
          </p>

          {/* Resend box */}
          <div className="bg-violet-950/30 border border-violet-900/20 rounded-xl p-4 mb-5">
            <p className="text-xs text-slate-500 mb-3">
              Didn&apos;t get it? Check your spam folder or resend below.
            </p>
            {resendDone && resendCooldown > 0 ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm py-2">
                <CheckCircle2 className="w-4 h-4" />
                Sent! Check your inbox.
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-violet-700/40 hover:border-violet-600/60 hover:bg-violet-950/40 disabled:opacity-50 text-violet-300 text-sm font-medium rounded-xl transition-all"
              >
                {resendLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend confirmation email"}
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600">
            Wrong email?{" "}
            <button
              onClick={onBack}
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Go back and change it
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile landing (pre-expand) ─────────────────────────────────────────────

function MobileLanding({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-screen bg-[#09090f] flex flex-col items-center justify-between p-8 pb-12">
      <Glows />
      <div className="relative w-full flex-1 flex flex-col items-center justify-center gap-0">
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-900/50 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            habit<span className="text-violet-400">AI</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Build habits that actually stick</p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={onContinue}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold rounded-2xl text-base transition-all shadow-xl shadow-violet-900/40 flex items-center justify-center gap-2"
          >
            Get started free
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onContinue}
            className="w-full py-3.5 bg-transparent border border-violet-800/40 hover:border-violet-700/60 hover:bg-violet-950/30 text-slate-300 font-medium rounded-2xl text-sm transition-all"
          >
            Sign in
          </button>
        </div>
      </div>

      <p className="relative text-xs text-slate-700 text-center">
        Free forever &nbsp;·&nbsp; No credit card required
      </p>
    </div>
  );
}

// ─── Main auth form ───────────────────────────────────────────────────────────

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const plan = params.get("plan");
  const successMessage =
    params.get("message") === "password_updated"
      ? "Password updated — sign in with your new password."
      : null;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mobile detection (only matters client-side)
  const [isMobile, setIsMobile] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-redirect returning users with a live session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const next = plan ? `/dashboard?checkout=${plan}` : "/dashboard";
        router.replace(next);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus password input when step changes to password/signup
  useEffect(() => {
    if (step === "password" || step === "signup") {
      setTimeout(() => passwordRef.current?.focus(), 80);
    }
  }, [step]);

  const nextUrl = plan ? `/dashboard?checkout=${plan}` : "/dashboard";

  const handleOAuth = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    });
    setOauthLoading(null);
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingEmail(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { exists } = await res.json();
      setStep(exists ? "password" : "signup");
    } catch {
      setStep("signup");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(nextUrl);
      router.refresh();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      fetch("/api/welcome-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).catch(() => {});
      router.push(nextUrl);
      router.refresh();
    } else {
      setStep("check-email");
      setLoading(false);
    }
  };

  const resetToEmail = () => {
    setStep("email");
    setPassword("");
    setError(null);
  };

  // ── Check-email screen ────────────────────────────────────────────────────
  if (step === "check-email") {
    return (
      <CheckEmailScreen email={email} onBack={resetToEmail} plan={plan} />
    );
  }

  // ── Mobile landing (before expand) ───────────────────────────────────────
  if (isMobile && !mobileExpanded) {
    return <MobileLanding onContinue={() => setMobileExpanded(true)} />;
  }

  // ── Full form ─────────────────────────────────────────────────────────────
  const heading =
    step === "password"
      ? "Welcome back"
      : step === "signup"
      ? "Create your account"
      : "Welcome to HabitAI";

  const subheading =
    step === "password"
      ? "Sign in to continue your habit streak"
      : step === "signup"
      ? "Start building better habits today — it’s free"
      : "Sign in or create a free account";

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <Glows />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo />
        </div>

        <div className="bg-[#0f0f1a] border border-violet-900/25 rounded-2xl p-8 shadow-2xl shadow-violet-950/30">
          <h1 className="text-2xl font-bold text-white mb-1">{heading}</h1>
          <p className="text-slate-400 text-sm mb-7">{subheading}</p>

          {successMessage && (
            <div className="flex items-start gap-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-300">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* ── Step: email ─────────────────────────────────────────────── */}
          {step === "email" && (
            <>
              {/* OAuth */}
              <div className="space-y-2.5 mb-6">
                <button
                  onClick={() => handleOAuth("github")}
                  disabled={!!oauthLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] disabled:opacity-60 text-white font-semibold text-sm py-2.5 px-4 rounded-xl border border-[#444c56] transition-all"
                >
                  {oauthLoading === "github" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitHubIcon />}
                  Continue with GitHub
                </button>
                <button
                  onClick={() => handleOAuth("apple")}
                  disabled={!!oauthLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-60 text-white font-semibold text-sm py-2.5 px-4 rounded-xl border border-[#333] transition-all"
                >
                  {oauthLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <AppleIcon />}
                  Continue with Apple
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-violet-900/30" />
                <span className="text-xs text-slate-600 font-medium">or continue with email</span>
                <div className="flex-1 h-px bg-violet-900/30" />
              </div>

              <form onSubmit={handleEmailContinue}>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus={mobileExpanded}
                    className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkingEmail || !email.includes("@")}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
                >
                  {checkingEmail ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Checking…</>
                  ) : (
                    <>Continue<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Step: password (returning user) ─────────────────────────── */}
          {step === "password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email display with change button */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email address
                </label>
                <div className="flex items-center gap-2 bg-violet-950/20 border border-violet-900/20 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-slate-300 flex-1 truncate">{email}</span>
                  <button
                    type="button"
                    onClick={resetToEmail}
                    className="text-xs text-violet-500 hover:text-violet-400 flex-shrink-0 transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">Password</label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                ) : (
                  "Sign In"
                )}
              </button>

              <p className="text-xs text-slate-600 text-center">
                Not your account?{" "}
                <button
                  type="button"
                  onClick={() => { setStep("signup"); setError(null); setPassword(""); }}
                  className="text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Create a new one instead
                </button>
              </p>
            </form>
          )}

          {/* ── Step: signup (new user) ──────────────────────────────────── */}
          {step === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Email display with change button */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email address
                </label>
                <div className="flex items-center gap-2 bg-violet-950/20 border border-violet-900/20 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-slate-300 flex-1 truncate">{email}</span>
                  <button
                    type="button"
                    onClick={resetToEmail}
                    className="text-xs text-violet-500 hover:text-violet-400 flex-shrink-0 transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Create a password
                </label>
                <div className="relative">
                  <input
                    ref={passwordRef}
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
                disabled={loading}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
                ) : (
                  "Create Account"
                )}
              </button>

              <p className="text-xs text-slate-600 text-center">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-violet-500 hover:text-violet-400">Terms</Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-violet-500 hover:text-violet-400">Privacy Policy</Link>
              </p>

              <p className="text-xs text-slate-500 text-center">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setStep("password"); setError(null); setPassword(""); }}
                  className="text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Sign in instead
                </button>
              </p>
            </form>
          )}
        </div>

        {step === "email" && (
          <p className="text-center text-xs text-slate-700 mt-4">
            Free forever &nbsp;·&nbsp; No credit card required
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
