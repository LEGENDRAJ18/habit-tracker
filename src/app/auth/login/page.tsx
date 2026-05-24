"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle2, ArrowRight, Mail, RefreshCw, Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendlyError";
import posthog from "posthog-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "choose" | "signup" | "login" | "check-email";

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Animated background ──────────────────────────────────────────────────────

function Background() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <div
        className="absolute rounded-full bg-violet-700/20 blur-[130px]"
        style={{ width: 700, height: 700, top: "-15%", left: "-15%", animation: "authFloat 12s ease-in-out infinite" }}
      />
      <div
        className="absolute rounded-full bg-purple-600/15 blur-[100px]"
        style={{ width: 550, height: 550, bottom: "-20%", right: "-10%", animation: "authFloat 16s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute rounded-full bg-violet-500/10 blur-[80px]"
        style={{ width: 350, height: 350, top: "40%", right: "25%", animation: "authFloat 10s ease-in-out infinite", animationDelay: "3s" }}
      />
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box  = size === "lg" ? "w-14 h-14 rounded-2xl" : size === "md" ? "w-11 h-11 rounded-xl" : "w-8 h-8 rounded-lg";
  const icon = size === "lg" ? "w-7 h-7" : size === "md" ? "w-5 h-5" : "w-4 h-4";
  const text = size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-xl";
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <div className={`${box} bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-xl shadow-violet-900/50`}>
        <Sparkles className={`${icon} text-white`} />
      </div>
      <span className={`${text} font-black text-white tracking-tight`}>
        habit<span className="text-violet-400">AI</span>
      </span>
    </Link>
  );
}

// ─── Google button ────────────────────────────────────────────────────────────

function GoogleButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 text-gray-800 font-semibold text-sm py-3.5 px-4 rounded-2xl border border-gray-200 transition-all shadow-md shadow-black/10 hover:shadow-lg hover:shadow-black/15"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-500" /> : <GoogleIcon />}
      {label}
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-violet-900/40" />
      <span className="text-xs text-slate-600 font-medium whitespace-nowrap">{text}</span>
      <div className="flex-1 h-px bg-violet-900/40" />
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-950/50 border border-red-700/40 rounded-xl p-3.5 mb-5">
      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-300 leading-snug">{message}</p>
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────

const INPUT_BASE =
  "w-full pl-11 pr-4 py-3.5 bg-[#13131f] border border-violet-900/40 rounded-2xl text-white text-sm placeholder-slate-700 focus:border-violet-500/70 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:bg-[#16162a] transition-all duration-200";

// ─── Check-email screen ───────────────────────────────────────────────────────

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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setResendLoading(false);
    setResendDone(true);
    setResendCooldown(60);
  };

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <Background />
      <div className="relative w-full max-w-md" style={{ animation: "stepIn 0.4s ease-out both" }}>
        <div className="text-center mb-8"><Logo /></div>
        <div className="bg-[#0c0c18]/90 backdrop-blur-xl border border-violet-800/25 rounded-3xl p-8 shadow-2xl shadow-violet-950/40 text-center">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute w-24 h-24 rounded-full bg-violet-600/15 blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
              <Mail className="w-7 h-7 text-violet-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">One more step! 🎉</h1>
          <p className="text-slate-400 text-sm mb-1">We sent a confirmation link to</p>
          <p className="text-violet-400 font-semibold text-sm mb-4">{email}</p>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Check your inbox — it should arrive in under a minute.
            <br />Once confirmed you&apos;ll be taken straight to your dashboard.
          </p>
          <div className="bg-violet-950/30 border border-violet-900/20 rounded-2xl p-4 mb-5">
            <p className="text-xs text-slate-500 mb-3">Didn&apos;t get it? Check your spam folder or resend below.</p>
            {resendDone && resendCooldown > 0 ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm py-2">
                <CheckCircle2 className="w-4 h-4" /> Sent! Check your inbox.
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-violet-700/40 hover:border-violet-600/60 hover:bg-violet-950/40 disabled:opacity-50 text-violet-300 text-sm font-medium rounded-xl transition-all"
              >
                {resendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend confirmation email"}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600">
            Wrong email?{" "}
            <button onClick={onBack} className="text-violet-400 hover:text-violet-300 transition-colors">
              Go back and change it
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main auth form ───────────────────────────────────────────────────────────

function AuthForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const supabase = createClient();

  const plan           = params.get("plan");
  const successMessage =
    params.get("message") === "password_updated"
      ? "Password updated — sign in with your new password."
      : null;

  const initialStep: Step = params.get("mode") === "login" ? "login"
    : params.get("mode") === "signup" ? "signup"
    : "choose";

  const [authChecking, setAuthChecking] = useState(true);
  const [step,         setStep]         = useState<Step>(initialStep);
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const emailRef    = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const nextUrl = plan ? `/dashboard?checkout=${plan}` : "/dashboard";

  // Check auth state before showing any form — prevents flash of login page
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Already logged in — middleware should have redirected, but handle the
        // edge case where the client-side check fires before the server redirect.
        router.replace(nextUrl);
        // Keep authChecking = true so we never render the form during redirect
      } else {
        setAuthChecking(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus first field when step changes
  useEffect(() => {
    if (step === "signup")  setTimeout(() => emailRef.current?.focus(), 80);
    if (step === "login")   setTimeout(() => emailRef.current?.focus(), 80);
  }, [step]);

  const goTo = (s: Step) => { setStep(s); setError(null); setPassword(""); };

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}` },
    });
    setGoogleLoading(false);
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(friendlyError(error.message));
      setLoading(false);
    } else {
      router.push(nextUrl);
      router.refresh();
    }
  };

  // ── Signup ────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      }),
    });

    const data = await res.json() as {
      session?: { access_token: string; refresh_token: string } | null;
      user?: Record<string, unknown> | null;
      error?: string;
    };

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    posthog.capture("user_signed_up", { method: "email" });

    if (data.session) {
      await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      fetch("/api/welcome-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).catch(() => {});
      router.push("/onboarding");
      router.refresh();
    } else {
      setStep("check-email");
      setLoading(false);
    }
  };

  // ── Password strength ─────────────────────────────────────────────────────
  const pwStrength = password.length === 0 ? 0
    : password.length < 8  ? 1
    : password.length < 12 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3;

  const pwStrengthColor = ["", "bg-red-500", "bg-amber-500", "bg-violet-500", "bg-emerald-500"][pwStrength];
  const pwStrengthLabel = ["", "Too short", "Okay", "Good", "Strong"][pwStrength];

  // ── Auth loading screen (never flash the form while checking) ────────────
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Background />
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-xl shadow-violet-900/50 animate-pulse">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
        </div>
      </div>
    );
  }

  // ── Check-email screen ────────────────────────────────────────────────────
  if (step === "check-email") {
    return <CheckEmailScreen email={email} onBack={() => goTo("signup")} plan={plan} />;
  }

  // ── CHOOSE STEP ───────────────────────────────────────────────────────────
  if (step === "choose") {
    return (
      <div className="min-h-screen bg-[#09090f] flex flex-col items-center justify-center p-5 sm:p-8">
        <Background />

        <div key="choose" className="relative w-full max-w-lg" style={{ animation: "stepIn 0.4s ease-out both" }}>
          {/* Logo + headline */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              Build habits that<br />
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                actually stick
              </span>
            </h1>
            <p className="text-slate-500 text-sm mt-3">AI-powered coaching. Free forever.</p>
          </div>

          {/* Option cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => goTo("signup")}
              className="group relative text-left p-6 rounded-3xl bg-gradient-to-br from-violet-900/50 to-purple-950/40 border border-violet-600/30 hover:border-violet-500/60 hover:from-violet-900/70 hover:to-purple-950/60 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-950/30 hover:shadow-violet-900/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-bold text-white mb-1.5">I&apos;m new here</h3>
              <p className="text-sm text-slate-400 leading-snug">Create your free account and start your journey</p>
              <div className="flex items-center gap-1.5 mt-4 text-violet-400 text-xs font-semibold">
                Get started free
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => goTo("login")}
              className="group relative text-left p-6 rounded-3xl bg-[#0e0e1c]/80 border border-violet-900/30 hover:border-violet-700/50 hover:bg-violet-950/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-4xl mb-4">👋</div>
              <h3 className="text-lg font-bold text-white mb-1.5">Welcome back</h3>
              <p className="text-sm text-slate-400 leading-snug">Sign in and continue building your streak</p>
              <div className="flex items-center gap-1.5 mt-4 text-slate-500 group-hover:text-violet-400 text-xs font-semibold transition-colors">
                Sign in
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          <p className="text-center text-xs text-slate-700">
            Free forever &nbsp;·&nbsp; No credit card required &nbsp;·&nbsp; Cancel anytime
          </p>
        </div>
      </div>
    );
  }

  // ── SIGNUP STEP ───────────────────────────────────────────────────────────
  if (step === "signup") {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
        <Background />

        <div key="signup" className="relative w-full max-w-md" style={{ animation: "stepIn 0.35s ease-out both" }}>
          <div className="flex justify-center mb-7"><Logo /></div>

          <div className="bg-[#0c0c18]/90 backdrop-blur-xl border border-violet-800/25 rounded-3xl p-7 sm:p-8 shadow-2xl shadow-violet-950/40">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-white mb-1.5">
                Start building better habits ✨
              </h1>
              <p className="text-sm text-slate-500">
                Join thousands building better habits 🚀
              </p>
            </div>

            {successMessage && (
              <div className="flex items-start gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 mb-5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-300">{successMessage}</p>
              </div>
            )}
            {error && <ErrorBanner message={error} />}

            {/* Google */}
            <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Continue with Google" />

            <Divider text="or sign up with email" />

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Email */}
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-violet-400 transition-colors pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  autoComplete="email"
                  className={INPUT_BASE}
                />
              </div>

              {/* Password */}
              <div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-violet-400 transition-colors pointer-events-none" />
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={`${INPUT_BASE} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {password && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength ? pwStrengthColor : "bg-violet-950/60"}`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${["","text-red-400","text-amber-400","text-violet-400","text-emerald-400"][pwStrength]}`}>
                      {pwStrengthLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email.includes("@")}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40 hover:shadow-violet-900/60 hover:scale-[1.01] active:scale-[0.99] mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Creating your account…</>
                ) : (
                  <>Start My Journey <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Footer links */}
            <p className="text-center text-xs text-slate-600 mt-4">
              Free forever. No credit card needed.
            </p>
            <p className="text-center text-xs text-slate-600 mt-2">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-violet-500 hover:text-violet-400 transition-colors">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-violet-500 hover:text-violet-400 transition-colors">Privacy Policy</Link>
            </p>
            <p className="text-center text-xs text-slate-500 mt-4">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => goTo("login")}
                className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                Welcome back →
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── LOGIN STEP ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <Background />

      <div key="login" className="relative w-full max-w-md" style={{ animation: "stepIn 0.35s ease-out both" }}>
        <div className="flex justify-center mb-7"><Logo /></div>

        <div className="bg-[#0c0c18]/90 backdrop-blur-xl border border-violet-800/25 rounded-3xl p-7 sm:p-8 shadow-2xl shadow-violet-950/40">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-white mb-1.5">Welcome back 👋</h1>
            <p className="text-sm text-slate-500">Sign in to continue your habit streak</p>
          </div>

          {successMessage && (
            <div className="flex items-start gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-300">{successMessage}</p>
            </div>
          )}
          {error && <ErrorBanner message={error} />}

          {/* Google */}
          <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Sign in with Google" />

          <Divider text="or sign in with email" />

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-violet-400 transition-colors pointer-events-none" />
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
                className={INPUT_BASE}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span /> {/* spacer */}
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-violet-500 hover:text-violet-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-violet-400 transition-colors pointer-events-none" />
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                  className={`${INPUT_BASE} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.includes("@")}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40 hover:shadow-violet-900/60 hover:scale-[1.01] active:scale-[0.99] mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            New here?{" "}
            <button
              type="button"
              onClick={() => goTo("signup")}
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Start your journey →
            </button>
          </p>
        </div>
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
