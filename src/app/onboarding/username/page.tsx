"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ArrowRight, Loader2, CheckCircle2, AlertCircle, AtSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AVATARS, type AvatarId } from "@/lib/avatars";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/i;

function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextUrl = params.get("next") ?? "/dashboard";

  const [username, setUsername]     = useState("");
  const [avatarId, setAvatarId]     = useState<AvatarId>("ghost");
  const [checking, setChecking]     = useState(false);
  const [available, setAvailable]   = useState<boolean | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username || !USERNAME_RE.test(username)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailable(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecking(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailable(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends/search?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        setAvailable(!data.user);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  const handleContinue = async () => {
    if (!USERNAME_RE.test(username) || available !== true) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setError("Not authenticated."); setSaving(false); return; }
      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, username: username.toLowerCase(), avatar_id: avatarId }, { onConflict: "id" });
      if (dbErr) {
        setError(dbErr.message.includes("unique") ? "That username is already taken." : dbErr.message);
        setSaving(false);
        return;
      }
      router.push(nextUrl);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const isValidFormat = USERNAME_RE.test(username);
  const canContinue   = isValidFormat && available === true && !saving;

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute rounded-full bg-violet-700/20 blur-[130px]" style={{ width: 600, height: 600, top: "-10%", left: "-10%" }} />
        <div className="absolute rounded-full bg-purple-600/15 blur-[100px]" style={{ width: 500, height: 500, bottom: "-15%", right: "-8%" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-xl shadow-violet-900/50">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              habit<span className="text-violet-400">AI</span>
            </span>
          </div>
        </div>

        <div className="bg-[#0c0c18]/90 backdrop-blur-xl border border-violet-800/25 rounded-3xl p-7 shadow-2xl shadow-violet-950/40">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-black text-white mb-2">Choose your identity</h1>
            <p className="text-sm text-slate-500">Pick a username and avatar that represents you</p>
          </div>

          {/* Avatar grid */}
          <div className="mb-6">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Choose an avatar</p>
            <div className="grid grid-cols-9 gap-1.5">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setAvatarId(av.id)}
                  className={`relative aspect-square rounded-xl bg-gradient-to-br ${av.bg} flex items-center justify-center transition-all ${
                    avatarId === av.id
                      ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-[#0c0c18] scale-110"
                      : "opacity-60 hover:opacity-100 hover:scale-105"
                  }`}
                >
                  <span className={`text-lg leading-none ${av.animClass}`}>{av.emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Username input */}
          <div className="mb-6">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Username</p>
            <div className="relative group">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-violet-400 transition-colors pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                  setError(null);
                }}
                placeholder="your_username"
                maxLength={20}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full pl-11 pr-10 py-3.5 bg-[#13131f] border border-violet-900/40 rounded-2xl text-white text-sm placeholder-slate-700 focus:border-violet-500/70 focus:outline-none focus:ring-2 focus:ring-violet-500/15 transition-all"
              />
              {/* Status icon */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {checking && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
                {!checking && isValidFormat && available === true  && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {!checking && isValidFormat && available === false && <AlertCircle  className="w-4 h-4 text-red-400" />}
              </div>
            </div>
            {/* Hint */}
            <div className="mt-2 min-h-[1.1rem]">
              {!username && (
                <p className="text-[11px] text-slate-600">3–20 characters, letters, numbers, underscores</p>
              )}
              {username && !isValidFormat && (
                <p className="text-[11px] text-red-400">3–20 chars, only letters, numbers, underscores</p>
              )}
              {isValidFormat && available === false && !checking && (
                <p className="text-[11px] text-red-400">That username is already taken</p>
              )}
              {isValidFormat && available === true && !checking && (
                <p className="text-[11px] text-emerald-400">Username available!</p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-700/35 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Setting up your account…</>
            ) : (
              <>Let&apos;s go! <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push(nextUrl)}
            className="w-full mt-3 py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingUsernamePage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
