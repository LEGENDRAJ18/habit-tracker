"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Lock, Trash2, AlertCircle, CheckCircle2,
  Loader2, Eye, EyeOff, X, Bell, Download, Crown, Zap, Palette,
  Check, RotateCcw, Target, SlidersHorizontal, CreditCard, Sparkles,
  HelpCircle, ArrowRight, Smile, Gift, Copy, Share2, ChevronDown, BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { friendlyError } from "@/lib/friendlyError";
import { xpForLevel, levelName, levelEmoji, levelFromXP, xpIntoLevel, xpSpanOfLevel } from "@/lib/xp";
import { useProfile } from "@/hooks/useProfile";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { TOUR_DONE_KEY, TOUR_FORCE_KEY } from "@/components/ui/OnboardingTour";
import ReminderSettings from "@/components/dashboard/ReminderSettings";
import {
  useAppearance, ACCENT_PALETTE,
  type AccentColor, type DashboardLayout,
} from "@/contexts/AppearanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AVATARS, type AvatarId } from "@/lib/avatars";
import AvatarDisplay from "@/components/ui/AvatarDisplay";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all ${props.className ?? ""}`}
    />
  );
}

function Success({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-sm text-emerald-300">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{msg}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-800/40 rounded-xl p-3 text-sm text-red-300">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />{msg}
    </div>
  );
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        style={{
          position: "relative", width: "2.5rem", height: "1.375rem",
          borderRadius: "9999px",
          backgroundColor: value ? "var(--a-600, #7c3aed)" : "#374151",
          transition: "background-color 0.2s", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: "0.125rem",
          left: value ? "calc(100% - 1.25rem)" : "0.125rem",
          width: "1.125rem", height: "1.125rem", borderRadius: "9999px",
          backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

const cardCls = "bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-6 space-y-5";

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const [typed, setTyped] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0f0f1a] border border-red-900/40 rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-600 hover:text-slate-300"><X className="w-4 h-4" /></button>
        <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-800/40 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white text-center mb-1">Delete account?</h2>
        <p className="text-sm text-slate-400 text-center mb-5 leading-relaxed">This permanently deletes all your habits, streaks, and data. There is no undo.</p>
        <p className="text-xs text-slate-500 mb-2">Type <span className="font-bold text-slate-300">DELETE</span> to confirm</p>
        <Input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" autoFocus />
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-violet-900/30 text-slate-400 hover:text-white rounded-xl text-sm transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={typed !== "DELETE" || loading} className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function CsvExportSection() {
  const supabase = createClient();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const user = await resolveUser();
      if (!user) return;
      const [{ data: habits }, { data: logs }] = await Promise.all([
        supabase.from("habits").select("id, name, description, frequency, created_at").eq("user_id", user.id).order("created_at"),
        supabase.from("habit_logs").select("habit_id, completed_at").eq("user_id", user.id).order("completed_at"),
      ]);
      const habitMap = new Map((habits ?? []).map((h) => [h.id, h.name]));
      const rows = [
        ["habit_name", "completed_date"],
        ...(logs ?? []).map((l) => [`"${(habitMap.get(l.habit_id) ?? l.habit_id).replace(/"/g, '""')}"`, l.completed_at.split("T")[0]]),
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `habitai-export-${new Date().toISOString().split("T")[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4 border-t border-violet-900/20">
      <div>
        <p className="text-sm font-medium text-white">Export Data</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Download your full habit history as CSV</p>
      </div>
      <button onClick={handleExport} disabled={exporting}
        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-300 text-xs font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed">
        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {exporting ? "Exporting…" : "Download CSV"}
      </button>
    </div>
  );
}

// ─── Goals data + section ─────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  { id: "fitness",    emoji: "🏋️", label: "Get fit & healthy"    },
  { id: "learn",      emoji: "📚", label: "Learn & grow"          },
  { id: "mental",     emoji: "🧠", label: "Build mental wellness" },
  { id: "productive", emoji: "💰", label: "Be more productive"    },
  { id: "sleep",      emoji: "😴", label: "Improve sleep"         },
  { id: "custom",     emoji: "🎯", label: "Custom goal"           },
] as const;

function GoalsTab({ initialGoals }: { initialGoals: string[] }) {
  const supabase = createClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok?: string; err?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const knownIds = initialGoals
      .filter((g) => GOAL_OPTIONS.some((o) => o.label === g))
      .map((g) => GOAL_OPTIONS.find((o) => o.label === g)!.id as string);
    const hasCustom = initialGoals.some((g) => !GOAL_OPTIONS.some((o) => o.label === g));
    if (hasCustom) {
      knownIds.push("custom");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomGoal(initialGoals.find((g) => !GOAL_OPTIONS.some((o) => o.label === g)) ?? "");
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(knownIds);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
  }, [initialGoals, loaded]);

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const hasCustom = selected.includes("custom");
  const canSave = selected.length > 0 && (!hasCustom || customGoal.trim() !== "");

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setStatus(null);
    try {
      const user = await resolveUser();
      if (!user) return;
      const goalLabels = selected.map((id) => id === "custom" ? customGoal.trim() || "Custom goal" : GOAL_OPTIONS.find((g) => g.id === id)?.label ?? id);
      const { error } = await supabase.from("profiles").update({ goals: goalLabels, goal: goalLabels[0] ?? null }).eq("id", user.id);
      setStatus(error ? { err: friendlyError(error.message) } : { ok: "Goals saved! Habit suggestions and AI coaching will update." });
    } catch { setStatus({ err: "Failed to save goals." }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400" />My Goals
        </h2>
        <p className="text-sm text-slate-500">Your AI coaching adapts to these. Pick everything you&apos;re working towards.</p>
      </div>
      <div className={cardCls} style={{ padding: "1.25rem" }}>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((g) => {
            const isSelected = selected.includes(g.id);
            return (
              <button key={g.id} type="button" onClick={() => toggle(g.id)}
                className={`w-full text-left rounded-xl border px-3 py-3 transition-all duration-200 ${
                  isSelected ? "border-violet-500/60 bg-violet-600/15 ring-1 ring-violet-500/25" : "border-violet-900/20 bg-[#0c0c18] hover:border-violet-700/35 hover:bg-violet-950/30"
                }`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none flex-shrink-0">{g.emoji}</span>
                  <span className={`text-xs font-medium leading-snug flex-1 ${isSelected ? "text-violet-100" : "text-slate-300"}`}>{g.label}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "border-violet-500 bg-violet-500" : "border-slate-700"}`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {hasCustom && (
          <input value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} placeholder="Describe your goal…" maxLength={80}
            className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all" />
        )}
        {status?.ok  && <Success msg={status.ok} />}
        {status?.err && <Err msg={status.err} />}
        <button type="button" onClick={handleSave} disabled={saving || !canSave}
          className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--a-600, #7c3aed)" }}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save goals
        </button>
      </div>
    </div>
  );
}

// ─── Username section (self-contained) ───────────────────────────────────────

function UsernameSection() {
  const supabase = createClient();
  const [username, setUsername]   = useState("");
  const [original, setOriginal]   = useState("");
  const [saving,   setSaving]     = useState(false);
  const [status,   setStatus]     = useState<{ ok?: string; err?: string } | null>(null);
  const [loaded,   setLoaded]     = useState(false);

  useEffect(() => {
    if (loaded) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { data } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      const u = data?.username ?? "";
      setUsername(u); setOriginal(u); setLoaded(true);
    })();
  }, [loaded, supabase]);

  const valid = /^[a-z0-9_]{3,20}$/.test(username);
  const unchanged = username === original;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || unchanged) return;
    setSaving(true); setStatus(null);
    const user = await resolveUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
    if (error) {
      setStatus({ err: error.message.includes("unique") ? "That username is already taken." : friendlyError(error.message) });
    } else {
      setOriginal(username);
      setStatus({ ok: "Username saved! Friends can now find you by @" + username });
    }
    setSaving(false);
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-white mb-4">Username</h2>
      <div className={cardCls}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Your @username" hint="3–20 chars: lowercase letters, numbers, underscores. Friends search for you by this.">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium select-none">@</span>
              <Input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setStatus(null); }}
                placeholder="mannraj"
                maxLength={20}
                className="pl-7"
              />
            </div>
            {username && !valid && (
              <p className="text-[11px] text-amber-400 mt-1">Must be 3–20 lowercase letters, numbers, or underscores.</p>
            )}
          </Field>
          {status?.ok  && <Success msg={status.ok} />}
          {status?.err && <Err msg={status.err} />}
          <button type="submit" disabled={saving || !valid || unchanged}
            className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--a-600, #7c3aed)" }}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save username
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Tab content sections ─────────────────────────────────────────────────────

function AccountTab({
  name, setName, email, newEmail, setNewEmail,
  newPassword, setNewPassword, confirmPw, setConfirmPw,
  showPw, setShowPw, isOAuth,
  nameStatus, emailStatus, pwStatus,
  savingName, savingEmail, savingPw,
  handleSaveName, handleSaveEmail, handleSavePw,
  onDeleteClick, router,
}: {
  name: string; setName: (v: string) => void;
  email: string; newEmail: string; setNewEmail: (v: string) => void;
  newPassword: string; setNewPassword: (v: string) => void;
  confirmPw: string; setConfirmPw: (v: string) => void;
  showPw: boolean; setShowPw: (v: boolean) => void;
  isOAuth: boolean;
  nameStatus: { ok?: string; err?: string } | null;
  emailStatus: { ok?: string; err?: string } | null;
  pwStatus: { ok?: string; err?: string } | null;
  savingName: boolean; savingEmail: boolean; savingPw: boolean;
  handleSaveName: (e: React.FormEvent) => void;
  handleSaveEmail: (e: React.FormEvent) => void;
  handleSavePw: (e: React.FormEvent) => void;
  onDeleteClick: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="space-y-6">
      {/* Profile */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">Profile</h2>
        <div className={cardCls}>
          <form onSubmit={handleSaveName} className="space-y-4">
            <Field label="Display name">
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={60} />
            </Field>
            <Field label="Email address" hint="Your current email address.">
              <Input type="email" value={email} readOnly disabled className="opacity-50 cursor-not-allowed" />
            </Field>
            {nameStatus?.ok  && <Success msg={nameStatus.ok} />}
            {nameStatus?.err && <Err msg={nameStatus.err} />}
            <button type="submit" disabled={savingName || !name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--a-600, #7c3aed)" }}>
              {savingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save name
            </button>
          </form>
        </div>
      </div>

      {/* Username */}
      <UsernameSection />

      {/* Change email */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">Change Email</h2>
        <div className={cardCls}>
          <form onSubmit={handleSaveEmail} className="space-y-4">
            <Field label="New email address" hint="We'll send a confirmation link to your new address.">
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" />
            </Field>
            {emailStatus?.ok  && <Success msg={emailStatus.ok} />}
            {emailStatus?.err && <Err msg={emailStatus.err} />}
            <button type="submit" disabled={savingEmail || !newEmail.trim() || newEmail === email}
              className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--a-600, #7c3aed)" }}>
              {savingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Send confirmation
            </button>
          </form>
        </div>
      </div>

      {/* Change password */}
      {!isOAuth && (
        <div>
          <h2 className="text-base font-semibold text-white mb-4">Change Password</h2>
          <div className={cardCls}>
            <form onSubmit={handleSavePw} className="space-y-4">
              <Field label="New password" hint="Minimum 8 characters.">
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${newPassword.length >= i * 3 ? newPassword.length >= 12 ? "bg-emerald-500" : "bg-violet-500" : "bg-violet-950"}`} />
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Confirm new password">
                <Input type={showPw ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm password" />
              </Field>
              {pwStatus?.ok  && <Success msg={pwStatus.ok} />}
              {pwStatus?.err && <Err msg={pwStatus.err} />}
              <button type="submit" disabled={savingPw || !newPassword || !confirmPw}
                className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--a-600, #7c3aed)" }}>
                {savingPw && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Update password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* App tour */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">App Tour</h2>
        <div className={cardCls} style={{ padding: "1rem 1.25rem" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Retake the getting started tour</p>
              <p className="text-[11px] text-slate-500 mt-0.5">See the guided walkthrough of the app again</p>
            </div>
            <button onClick={() => { localStorage.setItem(TOUR_FORCE_KEY, "1"); localStorage.removeItem(TOUR_DONE_KEY); router.push("/dashboard"); }}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 px-3 py-1.5 border border-violet-800/40 hover:border-violet-600/50 rounded-xl transition-all bg-violet-950/30 hover:bg-violet-950/50">
              <RotateCcw className="w-3 h-3" />Restart tour
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <h2 className="text-base font-semibold text-red-400 mb-4">Danger Zone</h2>
        <div className="bg-[#0f0f1a] border border-red-900/30 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Delete account</p>
              <p className="text-xs text-slate-500 mt-0.5">Permanently deletes all your habits, streaks, and data. Cannot be undone.</p>
            </div>
            <button onClick={onDeleteClick} className="flex items-center gap-2 px-4 py-2 bg-red-950/50 hover:bg-red-950/80 border border-red-800/40 text-red-400 text-sm font-medium rounded-xl transition-all flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const {
    accent, setAccent,
    dashboardLayout, setDashboardLayout,
    showTimeEmojis, setShowTimeEmojis,
    showHabitStreak, setShowHabitStreak,
    showHabitXP, setShowHabitXP,
    showAchievementPopups, setShowAchievementPopups,
    showLevelUpAnimation, setShowLevelUpAnimation,
  } = useAppearance();

  const optionBtn = (active: boolean) =>
    `flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all capitalize ${
      active ? "border-transparent text-white" : "bg-transparent border-violet-900/20 text-slate-500 hover:text-slate-300 hover:border-violet-900/40"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-400" />Appearance
        </h2>
        <p className="text-sm text-slate-500">Customize how HabitAI looks for you.</p>
      </div>

      {/* Theme color */}
      <div className={cardCls}>
        <div>
          <p className="text-sm font-semibold text-white mb-1">Theme Color</p>
          <p className="text-xs text-slate-500 mb-4">Changes buttons, nav highlights, progress bars, checkmarks, and badges across the entire app. The HabitAI logo stays purple.</p>
          <div className="grid grid-cols-4 gap-2.5">
            {(Object.entries(ACCENT_PALETTE) as [AccentColor, typeof ACCENT_PALETTE[AccentColor]][]).map(([key, p]) => (
              <button key={key} onClick={() => setAccent(key)} title={p.name}
                className={`relative flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all ${
                  accent === key ? "border-white/20 bg-white/5" : "border-violet-900/20 hover:bg-white/3 hover:border-violet-900/40"
                }`}>
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: p.swatch, boxShadow: accent === key ? `0 0 16px ${p.swatch}99, 0 0 6px ${p.swatch}66` : "none" }} />
                <span className={`text-[10px] font-medium ${accent === key ? "text-white" : "text-slate-500"}`}>{p.name}</span>
                {accent === key && (
                  <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                    <Check className="w-2 h-2 text-black" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard layout */}
        <div className="border-t border-violet-900/20 pt-5">
          <p className="text-sm font-semibold text-white mb-1">Dashboard Layout</p>
          <p className="text-xs text-slate-500 mb-3">Adjusts spacing and card size on the dashboard.</p>
          <div className="flex gap-2.5">
            {(["compact", "comfortable", "spacious"] as DashboardLayout[]).map((l) => (
              <button key={l} onClick={() => setDashboardLayout(l)} className={optionBtn(dashboardLayout === l)}
                style={dashboardLayout === l ? { backgroundColor: "rgba(var(--a-r),var(--a-g),var(--a-b),0.2)", borderColor: "var(--a-600)", color: "var(--a-300,#c4b5fd)" } : undefined}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Habit card display */}
        <div className="border-t border-violet-900/20 pt-5 space-y-4">
          <p className="text-sm font-semibold text-white">Habit Cards</p>
          <ToggleRow label="Show time-of-day emojis" sub="Morning ☀️  Afternoon 🌤  Evening 🌙" value={showTimeEmojis} onChange={setShowTimeEmojis} />
          <ToggleRow label="Show streak count" sub="Current streak displayed on each habit card" value={showHabitStreak} onChange={setShowHabitStreak} />
          <ToggleRow label="Show XP value" sub="XP reward shown on each habit card" value={showHabitXP} onChange={setShowHabitXP} />
        </div>

        {/* Notifications */}
        <div className="border-t border-violet-900/20 pt-5 space-y-4">
          <p className="text-sm font-semibold text-white">In-App Notifications</p>
          <ToggleRow label="Achievement popups" sub="Celebration popup when you earn an achievement" value={showAchievementPopups} onChange={setShowAchievementPopups} />
          <ToggleRow label="Level up animation" sub="Play an animation when you level up" value={showLevelUpAnimation} onChange={setShowLevelUpAnimation} />
        </div>
      </div>
    </div>
  );
}

function AccessibilityTab() {
  const {
    reduceMotion, setReduceMotion,
    highContrast, setHighContrast,
  } = useAppearance();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-violet-400" />Accessibility
        </h2>
        <p className="text-sm text-slate-500">Adjust the app to better suit your needs.</p>
      </div>
      <div className={cardCls}>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-white">Motion &amp; Effects</p>
          <ToggleRow
            label="Reduce motion"
            sub="Disables animations and transitions throughout the app"
            value={reduceMotion}
            onChange={setReduceMotion}
          />
          <ToggleRow
            label="High contrast"
            sub="Increases contrast for better readability"
            value={highContrast}
            onChange={setHighContrast}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Referral Section ─────────────────────────────────────────────────────────

function ReferralSection() {
  const [data, setData]       = useState<{ code: string; link: string; total: number; rewarded: number; pending: number; earnedDays: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  function copyLink() {
    if (!data?.link) return;
    navigator.clipboard.writeText(data.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareLink() {
    if (!data?.link) return;
    if (navigator.share) {
      void navigator.share({ title: "Join me on HabitAI", text: "Build better habits with AI coaching — use my link for a free 14-day Plus trial!", url: data.link });
    } else {
      copyLink();
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <Gift className="w-4 h-4 text-violet-400" />
        Refer a Friend
      </h2>
      <div style={{ background: "#0f0f1a", border: "1px solid rgba(109,40,217,0.2)", borderRadius: "1rem", padding: "1.25rem" }}>
        <p className="text-sm text-slate-400 mb-4 leading-relaxed">
          Share your link and your friend gets <strong className="text-violet-300">14 days of Plus free</strong>. You earn rewards for every successful referral.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
            <span className="text-sm text-slate-500">Loading your link…</span>
          </div>
        ) : data?.link ? (
          <div className="space-y-3">
            {/* Referral link box */}
            <div className="flex items-center gap-2 bg-violet-950/40 border border-violet-800/30 rounded-xl px-3 py-2.5">
              <span className="text-xs text-slate-400 truncate flex-1 font-mono">{data.link}</span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0 touch-manipulation min-h-[36px] px-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={shareLink}
              className="w-full py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-700/40 text-violet-300 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[44px] active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              Share my referral link
            </button>

            {/* Earned days banner */}
            {(data.earnedDays > 0) && (
              <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/30 rounded-xl px-3.5 py-2.5">
                <span className="text-lg leading-none">🎉</span>
                <p className="text-sm text-emerald-300 font-semibold">
                  You&apos;ve earned <span className="text-emerald-200">{data.earnedDays} days</span> of free Plus from {data.rewarded} referral{data.rewarded !== 1 ? "s" : ""}!
                </p>
              </div>
            )}

            {/* Stats */}
            {(data.total > 0) && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: "Total", value: data.total, color: "#a78bfa" },
                  { label: "Pending", value: data.pending, color: "#94a3b8" },
                  { label: "Rewarded", value: data.rewarded, color: "#34d399" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-violet-950/30 border border-violet-900/20 rounded-xl p-2.5 text-center">
                    <p style={{ color }} className="text-lg font-bold">{value}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-slate-600 leading-relaxed">
              Referral code: <span className="font-mono text-violet-600">{data.code}</span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-600">Could not load referral link — try refreshing.</p>
        )}
      </div>
    </div>
  );
}

function InstallAppSection() {
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();
  if (isInstalled || (!canInstall && !isIOS)) return null;
  return (
    <div>
      <h2 className="text-base font-semibold text-white mb-4">Get the App</h2>
      <div className={cardCls} style={{ padding: "1.25rem" }}>
        {isIOS ? (
          /* iOS — no beforeinstallprompt, guide user through Safari Share sheet */
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-600/25 flex items-center justify-center flex-shrink-0 text-lg">
                📲
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Add to Home Screen</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Install HabitAI as a full-screen app on your iPhone or iPad — no App Store required.
                </p>
              </div>
            </div>
            <div className="bg-violet-950/20 border border-violet-800/20 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">How to install on iOS</p>
              {[
                { step: "1", text: <>Open this page in <strong className="text-white">Safari</strong> (not Chrome)</> },
                { step: "2", text: <>Tap the <strong className="text-white">Share</strong> button (the box with an arrow at the bottom of the screen)</> },
                { step: "3", text: <>Scroll down and tap <strong className="text-white">Add to Home Screen</strong></> },
                { step: "4", text: <>Tap <strong className="text-white">Add</strong> — HabitAI will appear on your home screen</> },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Chrome / Edge / Android */
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-600/25 flex items-center justify-center flex-shrink-0 text-lg">
                📲
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Install HabitAI</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Add HabitAI to your home screen for a full-screen, offline-ready experience — no App Store needed.
                </p>
              </div>
            </div>
            <button
              onClick={promptInstall}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-lg shadow-violet-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feature Glossary ─────────────────────────────────────────────────────────

type GlossaryTier = "free" | "plus" | "pro";

const GLOSSARY_TIER_BADGE: Record<GlossaryTier, string> = {
  free: "bg-slate-800 text-slate-300 border-slate-700",
  plus: "bg-violet-900/50 text-violet-300 border-violet-700/50",
  pro:  "bg-amber-900/40 text-amber-300 border-amber-700/40",
};

interface GlossaryEntry {
  id: string;
  title: string;
  tier: GlossaryTier;
  tierLabel: string;
  summary: string;
}

// Tier requirements are pulled from the actual gating code (not marketing
// copy) — see the routes/components named in each comment if these ever need
// re-verifying against a quota or gate that's changed.
const FEATURE_GLOSSARY: GlossaryEntry[] = [
  {
    id: "streak-freeze",
    title: "🧊 Streak Freeze",
    tier: "plus", tierLabel: "PLUS+", // api/streak-freeze/apply
    summary: "One free pass each week that keeps your streak alive if you miss a day — so a single busy day doesn't wipe out weeks of progress.",
  },
  {
    id: "skip-tokens",
    title: "⏭️ Skip Tokens",
    tier: "free", tierLabel: "ALL TIERS", // useHabits.ts skipHabitToday — Free 1/wk, Plus 3/wk, Pro unlimited
    summary: "Mark a habit as intentionally skipped instead of broken — protects your streak with no XP earned. Free gets 1 a week, Plus gets 3, Pro is unlimited.",
  },
  {
    id: "smart-timing",
    title: "⚡ Smart Timing",
    tier: "pro", tierLabel: "PRO",
    summary: "Learns the hour you actually complete each habit and moves your reminder to that time instead of a generic one, so nudges arrive when you're most likely to act.",
  },
  {
    id: "habit-dna",
    title: "🧬 Habit DNA",
    tier: "plus", tierLabel: "PLUS+", // Free sees a locked preview
    summary: "A breakdown of your habit patterns — which ones stick, which fade, and what that says about how you build routines. Free sees a locked preview.",
  },
  {
    id: "monthly-wrapped",
    title: "🎉 Monthly Wrapped",
    tier: "pro", tierLabel: "PRO",
    summary: "A Spotify-Wrapped-style recap of your month — completions, streaks, top habit, and XP — built automatically at the start of each month.",
  },
  {
    id: "xp-levels",
    title: "⭐ XP & Levels",
    tier: "free", tierLabel: "ALL TIERS",
    summary: "Every habit you complete earns XP, which adds up over time and never resets — your Level is just the badge that XP total unlocks.",
  },
  {
    id: "ai-coaching",
    title: "🤖 AI Coaching",
    tier: "free", tierLabel: "ALL TIERS", // api/ai-insight/route.ts — DAILY_LIMIT_FREE=1, DAILY_LIMIT_PLUS=5, Pro unlimited
    summary: "Ask your AI coach for personalized insights on your habits and patterns — Free gets 1 question a day, Plus gets 5, Pro is unlimited.",
  },
  {
    id: "goal-program",
    title: "🎯 Goal Program",
    tier: "pro", tierLabel: "PRO",
    summary: "Turns one big goal into a phased, multi-week plan of habits with weekly milestones, built and adjusted by AI as you go.",
  },
  {
    id: "voice-notes",
    title: "🎙️ Voice Notes",
    tier: "pro", tierLabel: "PRO",
    summary: "Talk instead of type — describe how a habit went out loud, and AI transcribes it and gives you coaching feedback based on what you actually said.",
  },
  {
    id: "group-habits",
    title: "👥 Group Habits",
    tier: "plus", tierLabel: "PLUS+",
    summary: "Create or join a small group with friends, teammates, or students to track the same habits together and see who's showing up each day.",
  },
  {
    id: "habit-battles",
    title: "⚔️ Habit Battles",
    tier: "plus", tierLabel: "PLUS+",
    summary: "Challenge a friend to a head-to-head habit streak — whoever stays consistent longer wins, for accountability with a bit of friendly competition.",
  },
  {
    id: "deep-ai-memory",
    title: "🧠 Deep AI Memory",
    tier: "pro", tierLabel: "PRO", // api/ai-insight/route.ts mode "memory_coaching"
    summary: "Your AI coach remembers past conversations across sessions instead of starting fresh each time, so its advice builds on what it already knows about you.",
  },
];

function GlossaryItem({ entry }: { entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-violet-900/20 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-violet-950/20 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-slate-200 truncate">{entry.title}</span>
          <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${GLOSSARY_TIER_BADGE[entry.tier]}`}>
            {entry.tierLabel}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed">
          {entry.summary}
        </div>
      )}
    </div>
  );
}

function FeatureGlossarySection() {
  return (
    <div>
      <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-violet-400" />Feature Glossary
      </h2>
      <p className="text-sm text-slate-500 mb-4">What every feature does, in plain English — and which plan unlocks it.</p>
      <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl overflow-hidden">
        {FEATURE_GLOSSARY.map((entry) => (
          <GlossaryItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function HelpTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-violet-400" />Help &amp; Support
        </h2>
        <p className="text-sm text-slate-500">Find answers, contact support, or browse the FAQ.</p>
      </div>

      {/* Feature Glossary — plain-English reference for every feature and its tier */}
      <FeatureGlossarySection />

      {/* XP & Levels explainer */}
      <LevelGuideSection />

      {/* How to use guide */}
      <div className={cardCls} style={{ padding: "1.25rem" }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center flex-shrink-0 text-xl">
            📖
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-0.5">How to use HabitAI</p>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Complete interactive guide: every feature, every page, every button explained — Getting Started, Dashboard, AI Coach, Battles, Plans and more.
            </p>
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all"
              style={{ backgroundColor: "var(--a-600, #7c3aed)" }}
            >
              Open Full Guide 📖
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className={cardCls} style={{ padding: "1.25rem" }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-900/30 border border-violet-700/30 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-0.5">Help Center &amp; FAQ</p>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Find answers to common questions about habits, streaks, XP, AI coaching, billing, and more.
            </p>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all"
              style={{ backgroundColor: "var(--a-600, #7c3aed)" }}
            >
              Open Help Center
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className={cardCls} style={{ padding: "1.25rem" }}>
        <p className="text-sm font-semibold text-white mb-1">Contact Support</p>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Need something specific? Email us and we&apos;ll respond within 24 hours.
        </p>
        <a
          href="mailto:support@habitai.app"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-violet-300 border border-violet-700/40 hover:border-violet-500/60 hover:text-violet-200 hover:bg-violet-950/40 rounded-xl transition-all"
        >
          support@habitai.app
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className={cardCls} style={{ padding: "1.25rem" }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-600/25 flex items-center justify-center flex-shrink-0 text-xl">
            📝
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-0.5">Give Feedback</p>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Share what you love, what&apos;s broken, or what you&apos;d like to see next. Takes 2 minutes and directly shapes the roadmap.
            </p>
            <a
              href="https://forms.gle/AsS3J4uug48sG4EM9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all"
              style={{ backgroundColor: "#059669" }}
            >
              Open Feedback Form
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Level Guide ──────────────────────────────────────────────────────────────

function LevelGuideSection() {
  const supabase = createClient();
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoaded(true); return; }
      const { data } = await supabase.from("profiles").select("xp, level").eq("id", user.id).single();
      if (data) { setXp(data.xp ?? 0); setLevel(data.level ?? 1); }
      setLoaded(true);
    })();
  }, [supabase]);

  const curLevel = levelFromXP(xp);
  const intoLevel = xpIntoLevel(xp);
  const span = xpSpanOfLevel(xp);
  const pct = span > 0 ? Math.round((intoLevel / span) * 100) : 100;

  const LEVEL_TABLE = [
    { lvl: 1, xp: 0,     name: "Beginner",   emoji: "🌱" },
    { lvl: 2, xp: 100,   name: "Beginner",   emoji: "🌱" },
    { lvl: 3, xp: 250,   name: "Rising",     emoji: "🌿" },
    { lvl: 4, xp: 500,   name: "Rising",     emoji: "🌿" },
    { lvl: 5, xp: 1000,  name: "Committed",  emoji: "💪" },
    { lvl: 6, xp: 2000,  name: "Committed",  emoji: "💪" },
    { lvl: 7, xp: 3500,  name: "Dedicated",  emoji: "🔥" },
    { lvl: 8, xp: 5000,  name: "Dedicated",  emoji: "🔥" },
    { lvl: 9, xp: 7500,  name: "Elite",      emoji: "⚡" },
    { lvl: 10, xp: 10000, name: "Elite",     emoji: "⚡" },
    { lvl: 11, xp: 13000, name: "Legend",    emoji: "👑" },
  ];

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-violet-400" />
        <p className="text-sm font-semibold text-white">How XP &amp; Levels Work ⚡</p>
      </div>
      {/* Concept explainer */}
      <div className="bg-violet-950/30 border border-violet-800/20 rounded-xl p-3 mb-1">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-violet-300">XP (Experience Points)</span> is the score you collect every time you do something in HabitAI — completing habits, logging in, hitting milestones.
          XP adds up and <span className="text-white font-medium">never resets</span>.
          <br className="my-1" />
          <span className="font-semibold text-white">Levels</span> are the rank your total XP unlocks.
          Think of it like a game: XP are the points, your Level is the badge those points earn you.
        </p>
      </div>

      {/* Current level progress */}
      {loaded && (
        <div className="bg-violet-950/40 border border-violet-800/25 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{levelEmoji(curLevel)}</span>
              <div>
                <p className="text-sm font-bold text-white">Level {curLevel} · {levelName(curLevel)}</p>
                <p className="text-[11px] text-slate-500">{xp.toLocaleString()} XP total</p>
              </div>
            </div>
            {curLevel < 11 && (
              <p className="text-xs text-slate-500 text-right">
                <span className="text-violet-300 font-semibold">{intoLevel}</span> / {span} XP<br />
                <span className="text-[10px]">to level {curLevel + 1}</span>
              </p>
            )}
          </div>
          {curLevel < 11 && (
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: "var(--a-500, #8b5cf6)" }}
              />
            </div>
          )}
        </div>
      )}

      {/* XP sources */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-400 mt-1">How to earn XP</p>
        {[
          { label: "Complete a habit",        xp: "+10 XP" },
          { label: "Complete all habits today", xp: "+25 XP bonus" },
          { label: "Daily login",             xp: "+5 XP" },
          { label: "7-day streak",            xp: "+50 XP bonus" },
          { label: "30-day streak",           xp: "+200 XP bonus" },
          { label: "Lucky bonus (12% chance)", xp: "+20 XP" },
        ].map(({ label, xp: xpVal }) => (
          <div key={label} className="flex items-center justify-between py-1.5 border-b border-violet-900/15 last:border-0">
            <span className="text-xs text-slate-400">{label}</span>
            <span className="text-xs font-bold text-violet-300">{xpVal}</span>
          </div>
        ))}
      </div>

      {/* Level table */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-400 mt-1">Level thresholds</p>
        <div className="overflow-hidden rounded-xl border border-violet-900/20">
          {LEVEL_TABLE.map((row, i) => {
            const isCurrentLevel = row.lvl === curLevel;
            return (
              <div
                key={row.lvl}
                className={`flex items-center gap-3 px-3 py-2 text-xs ${
                  isCurrentLevel
                    ? "bg-violet-900/40 border-l-2 border-violet-500"
                    : i % 2 === 0 ? "bg-violet-950/20" : "bg-transparent"
                }`}
              >
                <span className="text-sm leading-none w-5 flex-shrink-0">{row.emoji}</span>
                <span className={`font-bold w-14 flex-shrink-0 ${isCurrentLevel ? "text-violet-300" : "text-slate-400"}`}>
                  Level {row.lvl}
                </span>
                <span className={`flex-1 ${isCurrentLevel ? "text-white font-medium" : "text-slate-500"}`}>{row.name}</span>
                <span className={`font-semibold text-right ${isCurrentLevel ? "text-violet-300" : "text-slate-600"}`}>
                  {row.xp.toLocaleString()} XP
                </span>
                {isCurrentLevel && (
                  <span className="text-[9px] font-bold text-violet-400 bg-violet-900/50 px-1.5 py-0.5 rounded-full flex-shrink-0">YOU</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-1">Level 11+ costs 3,000 XP per level</p>
      </div>

      {/* Identity Score */}
      <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3 space-y-1">
        <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Identity Score
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Your Identity Score (shown on Analytics) measures how consistently you show up across all your habits.
          100% means you completed every habit every possible day. It weighs recent days more than older ones.
        </p>
      </div>

      {/* Streak explanation */}
      <div className="bg-orange-950/25 border border-orange-800/20 rounded-xl p-3 space-y-1">
        <p className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
          🔥 Streak System
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Your streak counts consecutive days where you completed at least one habit.
          Missing a day resets it to zero — but you get one streak freeze per week to protect it.
          Streaks above 7 and 30 days award bonus XP.
        </p>
      </div>
    </div>
  );
}

function PlanTab({
  tier, reminderLoading, reminderEnabled, reminderHour, reminderMinute, saveReminderPrefs,
}: {
  tier: string; reminderLoading: boolean;
  reminderEnabled: boolean; reminderHour: number; reminderMinute: number;
  saveReminderPrefs: (enabled: boolean, hour: number, minute?: number) => Promise<void>;
}) {
  const supabase = createClient();
  const isPaid = tier === "plus" || tier === "pro";
  const { formatPrice, currency, loading: currencyLoading } = useCurrency();
  const plusPrice = currencyLoading ? "$4.99" : formatPrice(4.99);
  const proPrice  = currencyLoading ? "$9.99"  : formatPrice(9.99);

  const [weeklyEmail,         setWeeklyEmail]         = useState(false);
  const [streakRoast,         setStreakRoast]          = useState(false);
  const [battleNotifications, setBattleNotifications] = useState(true);
  const [togglesLoaded,       setTogglesLoaded]       = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) { setTogglesLoaded(true); return; }
      supabase.from("profiles").select("weekly_email_enabled, streak_roast_enabled, battle_notifications_enabled").eq("id", user.id).single()
        .then(({ data }) => {
          if (data) {
            setWeeklyEmail(data.weekly_email_enabled ?? false);
            setStreakRoast(data.streak_roast_enabled ?? false);
            setBattleNotifications(data.battle_notifications_enabled ?? true);
          }
          setTogglesLoaded(true);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveToggle(field: "weekly_email_enabled" | "streak_roast_enabled" | "battle_notifications_enabled", value: boolean) {
    const user = await resolveUser();
    if (!user) return;

    if (field === "weekly_email_enabled") {
      const res = await fetch("/api/settings/weekly-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: value }),
      });
      if (!res.ok) setWeeklyEmail(!value); // revert optimistic toggle — e.g. Free tier rejected by the API
      return;
    }

    await supabase.from("profiles").update({ [field]: value }).eq("id", user.id);
  }

  const planInfo = {
    free:  { label: "Free",  badge: "bg-slate-800 text-slate-300 border-slate-700",  desc: "Unlimited habits, AI coach, friends & leaderboard" },
    plus:  { label: "Plus",  badge: "bg-violet-900/50 text-violet-300 border-violet-700/50", desc: "Unlimited habits, AI coaching, email reminders" },
    pro:   { label: "Pro",   badge: "bg-amber-900/40 text-amber-300 border-amber-700/40",    desc: "Everything in Plus, unlimited AI, data export" },
  };
  const plan = planInfo[tier as keyof typeof planInfo] ?? planInfo.free;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-violet-400" />Your Plan
        </h2>
        <p className="text-sm text-slate-500">Manage your subscription and billing.</p>
      </div>

      {/* Current plan card */}
      <div className={cardCls} style={{ padding: "1.25rem" }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Current plan</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold text-white`}>{plan.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${plan.badge}`}>{plan.label.toUpperCase()}</span>
            </div>
          </div>
          {isPaid && (
            <Link href="/billing" className="text-xs text-slate-500 hover:text-violet-300 transition-colors border border-violet-900/30 hover:border-violet-700/40 px-3 py-1.5 rounded-xl">
              Manage billing →
            </Link>
          )}
        </div>
        <p className="text-xs text-slate-500">{plan.desc}</p>

        {!isPaid && (
          <div className="mt-4 pt-4 border-t border-violet-900/20 space-y-3">
            <p className="text-xs font-semibold text-slate-300">Upgrade to unlock more</p>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/billing?plan=plus"
                className="flex flex-col gap-1 p-3.5 rounded-xl border border-violet-600/40 bg-violet-950/40 hover:bg-violet-950/60 hover:border-violet-500/60 transition-all group">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-sm font-bold text-white">Plus</span>
                </div>
                <span className="text-[11px] text-slate-400 leading-snug">Unlimited Battles, group habits, weekly email</span>
                <span className="text-sm font-bold text-violet-300 mt-1">{plusPrice}/mo</span>
              </Link>
              <Link href="/billing?plan=pro"
                className="flex flex-col gap-1 p-3.5 rounded-xl border border-amber-600/40 bg-amber-950/20 hover:bg-amber-950/30 hover:border-amber-500/60 transition-all group">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-bold text-white">Pro</span>
                </div>
                <span className="text-[11px] text-slate-400 leading-snug">Deep AI memory, University Goal Mode, voice check-ins</span>
                <span className="text-sm font-bold text-amber-300 mt-1">{proPrice}/mo</span>
              </Link>
            </div>
            <p className="text-[11px] text-slate-600 text-center">Plus: 7-day free trial · Cancel anytime · Pro: no trial period</p>
            <p className="text-[10px] text-slate-700 text-center">Prices shown in {currency} · Charged in USD by Stripe</p>
          </div>
        )}
      </div>

      {/* Email reminders */}
      {!reminderLoading && (
        isPaid ? (
          <ReminderSettings enabled={reminderEnabled} hour={reminderHour} minute={reminderMinute} onSave={saveReminderPrefs} />
        ) : (
          <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-semibold text-white">Email Reminders</p>
              <span className="ml-auto inline-flex items-center gap-1 bg-violet-900/40 border border-violet-700/40 text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Zap className="w-2.5 h-2.5" />Plus
              </span>
            </div>
            <p className="text-xs text-slate-500">Daily email reminders for your habits. Available on Plus and Pro plans.</p>
          </div>
        )
      )}

      {/* CSV export */}
      {!reminderLoading && (
        tier === "pro" ? (
          <div className={cardCls} style={{ padding: "1.25rem" }}>
            <div className="flex items-center gap-2 mb-1">
              <Download className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-semibold text-white">Export Data</p>
              <span className="ml-auto inline-flex items-center gap-1 bg-amber-900/30 border border-amber-600/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Crown className="w-2.5 h-2.5" />Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Download your full habit history as a CSV file.</p>
            <CsvExportSection />
          </div>
        ) : (
          <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-semibold text-white">Export Data</p>
              <span className="ml-auto inline-flex items-center gap-1 bg-amber-900/30 border border-amber-600/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Crown className="w-2.5 h-2.5" />Pro
              </span>
            </div>
            <p className="text-xs text-slate-500">Download your full habit history as CSV. Exclusive to Pro.</p>
          </div>
        )
      )}

      {/* Notification preferences */}
      {togglesLoaded && (
        <div className={cardCls} style={{ padding: "1.25rem" }}>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-semibold text-white">Notification Preferences</p>
          </div>
          <div className="space-y-4 divide-y divide-violet-900/20">
            {isPaid ? (
              <ToggleRow
                label="Weekly Email Report"
                sub="Every Sunday — personalised summary of your week, stats, and one tip. Sent to your account email."
                value={weeklyEmail}
                onChange={(v) => { setWeeklyEmail(v); void saveToggle("weekly_email_enabled", v); }}
              />
            ) : (
              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">Weekly Email Report</p>
                  <span className="inline-flex items-center gap-1 bg-violet-900/40 border border-violet-700/40 text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Zap className="w-2.5 h-2.5" />Plus
                  </span>
                </div>
                <p className="text-xs text-slate-500">Every Sunday — personalised summary of your week. Available on Plus and Pro plans.</p>
              </div>
            )}
            <div className="pt-4">
              <ToggleRow
                label="Streak Roast Notifications"
                sub="When you break a streak, your friends get a fun notification to nudge you. All in good spirit!"
                value={streakRoast}
                onChange={(v) => { setStreakRoast(v); void saveToggle("streak_roast_enabled", v); }}
              />
            </div>
            <div className="pt-4">
              <ToggleRow
                label="Battle Notifications"
                sub="Get notified when someone challenges you to a Habit Battle, or when a battle result comes in."
                value={battleNotifications}
                onChange={(v) => { setBattleNotifications(v); void saveToggle("battle_notifications_enabled", v); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Level Guide */}
      <LevelGuideSection />
    </div>
  );
}

function AvatarTab() {
  const supabase = createClient();
  const [selected, setSelected] = useState<AvatarId>("ghost");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok?: string; err?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_id").eq("id", user.id).single();
      if (data?.avatar_id) setSelected(data.avatar_id as AvatarId);
      setLoaded(true);
    })();
  }, [loaded, supabase]);

  const handleSave = async () => {
    setSaving(true); setStatus(null);
    const user = await resolveUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({ avatar_id: selected }).eq("id", user.id);
    setStatus(error ? { err: friendlyError(error.message) } : { ok: "Avatar saved!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Smile className="w-4 h-4 text-violet-400" />Profile Picture
        </h2>
        <p className="text-sm text-slate-500">Choose an animated avatar that represents you.</p>
      </div>
      <div className={cardCls}>
        {/* Current preview */}
        <div className="flex items-center gap-4 pb-5 border-b border-violet-900/20">
          <AvatarDisplay avatarId={selected} size="lg" />
          <div>
            <p className="text-sm font-bold text-white">{AVATARS.find(a => a.id === selected)?.name}</p>
            <p className="text-xs text-slate-500">Your current avatar</p>
          </div>
        </div>
        {/* Grid of options */}
        <div className="grid grid-cols-3 gap-3 pt-5">
          {AVATARS.map((av) => (
            <button
              key={av.id}
              onClick={() => setSelected(av.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                selected === av.id
                  ? "border-violet-500/60 bg-violet-600/15 ring-1 ring-violet-500/25"
                  : "border-violet-900/20 bg-[#0c0c18] hover:border-violet-700/40 hover:bg-violet-950/30"
              }`}
            >
              <AvatarDisplay avatarId={av.id} size="md" />
              <span className={`text-[11px] font-medium ${selected === av.id ? "text-violet-200" : "text-slate-500"}`}>
                {av.name}
              </span>
              {selected === av.id && (
                <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
              )}
            </button>
          ))}
        </div>
        {status?.ok  && <Success msg={status.ok} />}
        {status?.err && <Err msg={status.err} />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--a-600, #7c3aed)" }}
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save avatar
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Mode switcher tab ────────────────────────────────────────────────────────

type UserMode = "student" | "parent" | "teacher" | "personal";

const MODE_INFO: { id: UserMode; emoji: string; label: string; tagline: string; color: string; border: string }[] = [
  { id: "student",  emoji: "🎓", label: "Student",        tagline: "Academic excellence",  color: "text-indigo-300",  border: "border-indigo-500/50"  },
  { id: "parent",   emoji: "👨‍👩‍👧", label: "Parent",         tagline: "Monitor & encourage", color: "text-emerald-300", border: "border-emerald-500/50" },
  { id: "teacher",  emoji: "👨‍🏫", label: "Teacher / Coach", tagline: "Lead your team",      color: "text-amber-300",   border: "border-amber-500/50"   },
  { id: "personal", emoji: "🙋", label: "Personal",        tagline: "Self improvement",    color: "text-violet-300",  border: "border-violet-500/50"  },
];

function ModeTab() {
  const supabase = createClient();
  const [current, setCurrent] = useState<UserMode>("personal");
  const [saving,  setSaving]  = useState(false);
  const [status,  setStatus]  = useState<{ ok?: string; err?: string } | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    if (loaded) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { data } = await supabase.from("profiles").select("user_mode").eq("id", user.id).single();
      if (data?.user_mode) setCurrent(data.user_mode as UserMode);
      setLoaded(true);
    })();
  }, [loaded, supabase]);

  const handleSwitch = async (mode: UserMode) => {
    if (mode === current) return;
    setSaving(true); setStatus(null);
    const user = await resolveUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({ user_mode: mode }).eq("id", user.id);
    if (error) {
      setStatus({ err: "Failed to switch mode. Please try again." });
    } else {
      setCurrent(mode);
      setStatus({ ok: `Switched to ${MODE_INFO.find((m) => m.id === mode)?.label} mode! Refresh your dashboard to see the changes.` });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <span className="text-base leading-none">🎓</span>Your Mode
        </h2>
        <p className="text-sm text-slate-500">Your dashboard, AI coaching, and habit suggestions all adapt to your selected mode. Switch anytime — your data is never lost.</p>
      </div>

      <div className={cardCls} style={{ padding: "1.25rem" }}>
        <div className="space-y-3">
          {MODE_INFO.map((mode) => {
            const isActive = current === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => !saving && void handleSwitch(mode.id)}
                disabled={saving}
                className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                  isActive
                    ? `${mode.border} bg-violet-950/30 ring-1 ring-violet-500/20`
                    : "border-violet-900/20 bg-[#0c0c18] hover:border-violet-700/35 hover:bg-violet-950/20"
                } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none flex-shrink-0">{mode.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold ${mode.color}`}>{mode.label}</p>
                      <span className={`text-[10px] ${mode.color} opacity-60`}>· {mode.tagline}</span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="flex-shrink-0 text-[10px] font-bold text-violet-300 bg-violet-900/40 border border-violet-600/30 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                  {saving && !isActive && <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
        {status?.ok  && <Success msg={status.ok} />}
        {status?.err && <Err msg={status.err} />}
      </div>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

type NotifPrefs = {
  morning_alarm?: boolean;
  morning_alarm_time?: string;
  habit_reminders?: boolean;
  final_nudge?: boolean;
  final_nudge_time?: string;
  streak_protection?: boolean;
  weekly_motivation?: boolean;
  battle_notifications?: boolean;
  friend_notifications?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
};

const DEFAULT_PREFS: NotifPrefs = {
  morning_alarm: false,
  morning_alarm_time: "07:00",
  habit_reminders: true,
  final_nudge: true,
  final_nudge_time: "21:00",
  streak_protection: true,
  weekly_motivation: true,
  battle_notifications: true,
  friend_notifications: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
};

function NotificationsTab() {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [soundsOn, setSoundsOn] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("habitai_sounds") === "on"
  );
  // pushEnabled reflects whether the server actually has a saved subscription
  // row for this device (verified/created by the hook's mount-time
  // reconciliation against Notification.permission) — not just browser
  // permission. See usePushNotifications for why that distinction matters.
  const { isSubscribed: pushEnabled, reconciling: pushReconciling, requestPermission } = usePushNotifications();

  useEffect(() => {
    // Load prefs from DB
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();
      if (data?.notification_preferences) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.notification_preferences as NotifPrefs) });
      }
      setLoading(false);
    })();
  }, [supabase]);

  async function savePrefs(updated: NotifPrefs) {
    setPrefs(updated);
    setSaving(true);
    const user = await resolveUser();
    if (user) {
      await supabase.from("profiles")
        .update({ notification_preferences: updated })
        .eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(key: keyof NotifPrefs, value: boolean | string) {
    const updated = { ...prefs, [key]: value };
    void savePrefs(updated);
  }

  async function enablePush() {
    setPushEnabling(true);
    setPushFeedback(null);
    // Always runs the full subscribe→POST flow, even if Notification.permission
    // is already "granted" — see usePushNotifications.requestPermission().
    const result = await requestPermission();
    setPushEnabling(false);
    if (result === "success") {
      // pushEnabled (isSubscribed) is set by the hook itself once the POST
      // to /api/push/subscribe succeeds — nothing to set locally here.
      setPushFeedback({ ok: true, msg: "Notifications enabled!" });
      setTimeout(() => setPushFeedback(null), 4000);
    } else if (result === "denied") {
      // Browser permission denied — the existing "blocked" notice covers this
    } else if (result === "no_vapid") {
      console.error("[push] enablePush(): no_vapid");
      setPushFeedback({ ok: false, msg: "Push notifications are not configured. Please contact support." });
    } else {
      console.error("[push] enablePush(): requestPermission() returned", result);
      setPushFeedback({ ok: false, msg: "Couldn't enable notifications, please try again." });
    }
  }

  const inputCls = "bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-3 py-1.5 text-sm text-white [color-scheme:dark] transition-all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Bell className="w-4 h-4 text-violet-400" />Notifications
        </h2>
        <p className="text-sm text-slate-500">Control when and how HabitAI reminds you to build your habits.</p>
      </div>

      {/* Sound effects */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          🔊 Sound Effects
        </h3>
        <ToggleRow
          label="Habit sounds"
          sub="Play sounds when completing habits, leveling up, and hitting streaks. Off by default."
          value={soundsOn}
          onChange={(v) => {
            setSoundsOn(v);
            if (v) localStorage.setItem("habitai_sounds", "on");
            else localStorage.removeItem("habitai_sounds");
          }}
        />
      </div>

      {/* Push permission status */}
      {pushReconciling && (
        <div className="flex items-center gap-2 bg-violet-950/30 border border-violet-800/30 rounded-xl px-3 py-2.5 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Checking notification status…
        </div>
      )}

      {!pushReconciling && !pushEnabled && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-violet-950/40 border border-violet-700/30 rounded-2xl p-4">
            <Bell className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Push notifications are off</p>
              <p className="text-xs text-slate-500 mt-0.5">Enable to receive reminders, streak alerts, and weekly motivation directly to your device.</p>
              {typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied" && (
                <p className="text-[11px] text-amber-400 mt-2 leading-relaxed">
                  Notifications were blocked. Go to your browser settings → Site Settings → Notifications → find this site and allow it.
                </p>
              )}
            </div>
            {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "denied" && (
              <button
                onClick={() => void enablePush()}
                disabled={pushEnabling}
                className="flex-shrink-0 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all"
              >
                {pushEnabling ? "Enabling…" : "Enable"}
              </button>
            )}
          </div>
          {/* Device-specific PWA instructions */}
          <div className="space-y-2">
            {/* iPhone */}
            <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-slate-400 mb-2">📱 On iPhone? Install the app first:</p>
              <div className="space-y-1.5">
                {[
                  "Open this page in Safari (not Chrome)",
                  "Tap the Share button at the bottom of the screen",
                  "Scroll down and tap Add to Home Screen",
                  "Once installed, open from home screen and enable notifications here",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-violet-900/50 text-violet-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Android */}
            <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-slate-400 mb-2">🤖 On Android? Two options:</p>
              <p className="text-[10px] text-violet-400 font-semibold mb-1.5">Option A — Browser notifications (fastest):</p>
              <div className="space-y-1.5 mb-3">
                {[
                  "Open HabitAI in Chrome on Android",
                  'Tap the lock icon (🔒) in the address bar',
                  'Tap "Site settings" → "Notifications" → "Allow"',
                  "Tap Enable above and you\'re set",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-900/50 text-emerald-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-violet-400 font-semibold mb-1.5">Option B — Install as app (recommended):</p>
              <div className="space-y-1.5">
                {[
                  "Open HabitAI in Chrome on Android",
                  'Tap the 3-dot menu (⋮) in the top-right corner',
                  'Tap "Add to Home screen" and confirm',
                  "Open from your home screen — notifications work automatically",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-violet-900/50 text-violet-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {pushFeedback && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
          pushFeedback.ok
            ? "bg-emerald-950/40 border border-emerald-800/30 text-emerald-300"
            : "bg-red-950/40 border border-red-800/30 text-red-300"
        }`}>
          {pushFeedback.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Bell className="w-4 h-4 flex-shrink-0" />}
          {pushFeedback.msg}
        </div>
      )}

      {pushEnabled && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-800/30 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-300 font-medium">Push notifications are enabled on this device</p>
            {(saving || saved) && (
              <span className="ml-auto text-[10px] text-slate-500">
                {saving ? "Saving…" : "✓ Saved"}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("HabitAI Test Notification", {
                  body: "Push notifications are working! You will receive reminders here.",
                  icon: "/icon-192.png",
                });
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 border border-violet-800/40 hover:border-violet-600/50 text-violet-400 hover:text-violet-300 text-xs font-semibold rounded-xl transition-all hover:bg-violet-950/30"
          >
            <Bell className="w-3.5 h-3.5" />
            Send test notification
          </button>
        </div>
      )}

      {/* Morning alarm */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          ☀️ Morning Alarm
        </h3>
        <ToggleRow
          label="Daily briefing"
          sub="Get a morning summary of your habits for the day."
          value={prefs.morning_alarm ?? false}
          onChange={(v) => update("morning_alarm", v)}
        />
        {prefs.morning_alarm && (
          <div className="flex items-center justify-between gap-4 pt-1">
            <p className="text-sm text-slate-400">Alarm time</p>
            <input
              type="time"
              value={prefs.morning_alarm_time ?? "07:00"}
              onChange={(e) => update("morning_alarm_time", e.target.value)}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* Habit reminders */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          🔔 Habit Reminders
        </h3>
        <ToggleRow
          label="Per-habit reminders"
          sub="Get a notification at each habit's custom reminder time (set when creating or editing a habit)."
          value={prefs.habit_reminders !== false}
          onChange={(v) => update("habit_reminders", v)}
        />
        <div className="border-t border-violet-900/20 pt-4">
          <ToggleRow
            label="Final nudge"
            sub="One last reminder if you still have incomplete habits by the end of the day."
            value={prefs.final_nudge !== false}
            onChange={(v) => update("final_nudge", v)}
          />
          {prefs.final_nudge !== false && (
            <div className="flex items-center justify-between gap-4 mt-3">
              <p className="text-sm text-slate-400">Nudge time</p>
              <input
                type="time"
                value={prefs.final_nudge_time ?? "21:00"}
                onChange={(e) => update("final_nudge_time", e.target.value)}
                className={inputCls}
              />
            </div>
          )}
        </div>
      </div>

      {/* Streak & weekly */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          🔥 Streak &amp; Motivation
        </h3>
        <ToggleRow
          label="Streak protection"
          sub="Alert when you haven't opened the app in 24 hours and your streak is at risk."
          value={prefs.streak_protection !== false}
          onChange={(v) => update("streak_protection", v)}
        />
        <div className="border-t border-violet-900/20 pt-4">
          <ToggleRow
            label="Weekly motivation"
            sub="A kickoff nudge on Monday morning and a closing push on Sunday evening."
            value={prefs.weekly_motivation !== false}
            onChange={(v) => update("weekly_motivation", v)}
          />
        </div>
      </div>

      {/* Social */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          ⚔️ Social &amp; Battles
        </h3>
        <ToggleRow
          label="Battle notifications"
          sub="Alerts when you receive a challenge, fall behind, or win a Habit Battle."
          value={prefs.battle_notifications !== false}
          onChange={(v) => update("battle_notifications", v)}
        />
        <div className="border-t border-violet-900/20 pt-4">
          <ToggleRow
            label="Friend activity"
            sub="When a friend hits a milestone or sends you an encouragement."
            value={prefs.friend_notifications !== false}
            onChange={(v) => update("friend_notifications", v)}
          />
        </div>
      </div>

      {/* Quiet hours */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          🌙 Quiet Hours
        </h3>
        <ToggleRow
          label="Enable quiet hours"
          sub="No notifications during this window — even if a habit reminder is due."
          value={prefs.quiet_hours_enabled ?? false}
          onChange={(v) => update("quiet_hours_enabled", v)}
        />
        {prefs.quiet_hours_enabled && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Start</p>
              <input
                type="time"
                value={prefs.quiet_hours_start ?? "22:00"}
                onChange={(e) => update("quiet_hours_start", e.target.value)}
                className={`w-full ${inputCls}`}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">End</p>
              <input
                type="time"
                value={prefs.quiet_hours_end ?? "07:00"}
                onChange={(e) => update("quiet_hours_end", e.target.value)}
                className={`w-full ${inputCls}`}
              />
            </div>
          </div>
        )}
        <p className="text-[11px] text-slate-600 leading-snug -mt-1">
          Tip: Set reminder times on individual habits by editing them in your dashboard.
        </p>
      </div>

      {/* Notification Previews */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          👁️ Preview notifications
        </h3>
        <p className="text-xs text-slate-500 -mt-1">This is what your notifications will look like.</p>
        <div className="space-y-2">
          {[
            {
              emoji: "🔔", title: "Time for: Morning run!",
              body: "Your reminder is here. Tap to mark it done and keep your streak!",
              show: prefs.habit_reminders !== false,
            },
            {
              emoji: "☀️", title: "Good morning! Your habits await",
              body: "You have 4 habits to complete today. Let's go!",
              show: prefs.morning_alarm === true,
            },
            {
              emoji: "🌙", title: "Last chance tonight!",
              body: "2 habits left for today. You're so close!",
              show: prefs.final_nudge !== false,
            },
            {
              emoji: "🔥", title: "Your streak is at risk",
              body: "You haven't opened HabitAI in 24 hours. Tap to keep your streak alive!",
              show: prefs.streak_protection !== false,
            },
            {
              emoji: "🎯", title: "One day from 30 days!",
              body: "Morning run: You're on a 29-day streak. Don't stop now!",
              show: prefs.streak_protection !== false,
            },
            {
              emoji: "⚔️", title: "You've been challenged!",
              body: "alex_m challenged you to a 7-day Habit Battle: 'Run every day'. Accept?",
              show: prefs.battle_notifications !== false,
            },
            {
              emoji: "💪", title: "New week, new wins",
              body: "Start the week strong — even one habit counts!",
              show: prefs.weekly_motivation !== false,
            },
          ]
            .filter((n) => n.show)
            .map((n) => (
              <div
                key={n.title}
                className="flex items-start gap-2.5 bg-black/30 border border-white/[0.05] rounded-xl p-3"
              >
                <div className="w-8 h-8 rounded-xl bg-[#1a1a2e] border border-violet-900/30 flex items-center justify-center flex-shrink-0 text-sm">
                  {n.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white leading-tight">{n.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

type Tab = "account" | "appearance" | "accessibility" | "goals" | "avatar" | "plan" | "mode" | "notifications" | "help";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "account",       label: "Account",       icon: <User            className="w-3.5 h-3.5" /> },
  { id: "appearance",    label: "Appearance",     icon: <Palette         className="w-3.5 h-3.5" /> },
  { id: "accessibility", label: "Accessibility",  icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  { id: "goals",         label: "My Goals",       icon: <Target          className="w-3.5 h-3.5" /> },
  { id: "avatar",        label: "Avatar",         icon: <Smile           className="w-3.5 h-3.5" /> },
  { id: "plan",          label: "Plan",           icon: <CreditCard      className="w-3.5 h-3.5" /> },
  { id: "mode",          label: "Mode",           icon: <span className="text-[13px] leading-none">🎓</span> },
  { id: "notifications", label: "Notifications",  icon: <Bell            className="w-3.5 h-3.5" /> },
  { id: "help",          label: "Help",           icon: <HelpCircle      className="w-3.5 h-3.5" /> },
];

export default function SettingsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { reminderEnabled, reminderHour, reminderMinute, saveReminderPrefs, profileLoading: reminderLoading, tier, goals } = useProfile();

  const [activeTab, setActiveTab] = useState<Tab>("account");

  const [email,       setEmail]       = useState("");
  const [name,        setName]        = useState("");
  const [newEmail,    setNewEmail]    = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [isOAuth,     setIsOAuth]     = useState(false);

  const [nameStatus,  setNameStatus]  = useState<{ ok?: string; err?: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ ok?: string; err?: string } | null>(null);
  const [pwStatus,    setPwStatus]    = useState<{ ok?: string; err?: string } | null>(null);

  const [savingName,  setSavingName]  = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPw,    setSavingPw]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const user = session?.user;
        if (!user) { router.push("/auth/login"); return; }
        setEmail(user.email ?? "");
        setName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "");
        setIsOAuth((user.identities ?? []).some((i) => i.provider !== "email"));
        setPageLoading(false);
      })
      .catch(() => router.push("/auth/login"));
  }, [supabase, router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true); setNameStatus(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSavingName(false);
    setNameStatus(error ? { err: friendlyError(error.message) } : { ok: "Name updated successfully." });
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return;
    setSavingEmail(true); setEmailStatus(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    setEmailStatus(error ? { err: friendlyError(error.message) } : { ok: "Confirmation email sent. Click the link to complete the change." });
    if (!error) setNewEmail("");
  };

  const handleSavePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setPwStatus({ err: "Password must be at least 8 characters." }); return; }
    if (newPassword !== confirmPw) { setPwStatus({ err: "Passwords do not match." }); return; }
    setSavingPw(true); setPwStatus(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    setPwStatus(error ? { err: friendlyError(error.message) } : { ok: "Password updated successfully." });
    if (!error) { setNewPassword(""); setConfirmPw(""); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-account", { method: "DELETE" });
      if (res.ok) { await supabase.auth.signOut(); router.push("/?deleted=1"); return; }
      const data = await res.json().catch(() => ({}));
      setNameStatus({ err: data.error ? friendlyError(data.error) : "Could not delete account. Please try again." });
    } catch {
      setNameStatus({ err: "Network error. Please check your connection and try again." });
    }
    setDeleting(false); setShowDelete(false);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] pb-nav">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/80 via-[#0d0d1a] to-[#0d0d1a] border border-slate-700/30 p-4 mb-4">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-700/40 border border-slate-600/30 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">Settings</h1>
              {name && <p className="text-[11px] text-slate-500 mt-0.5">{email}</p>}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto gap-1 bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-1.5 mb-6 scrollbar-none">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === t.id ? "bg-[#0f0f1a] shadow-sm" : "text-slate-500 hover:text-slate-300"
              }`}
              style={activeTab === t.id ? { color: "var(--a-300, #c4b5fd)" } : undefined}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div key={activeTab} style={{ animation: "stepIn 0.2s ease-out both" }}>
          {activeTab === "account" && (
            <>
              <AccountTab
                name={name} setName={setName} email={email}
                newEmail={newEmail} setNewEmail={setNewEmail}
                newPassword={newPassword} setNewPassword={setNewPassword}
                confirmPw={confirmPw} setConfirmPw={setConfirmPw}
                showPw={showPw} setShowPw={setShowPw} isOAuth={isOAuth}
                nameStatus={nameStatus} emailStatus={emailStatus} pwStatus={pwStatus}
                savingName={savingName} savingEmail={savingEmail} savingPw={savingPw}
                handleSaveName={handleSaveName} handleSaveEmail={handleSaveEmail} handleSavePw={handleSavePw}
                onDeleteClick={() => setShowDelete(true)} router={router}
              />
              <ReferralSection />
              <InstallAppSection />
            </>
          )}
          {activeTab === "appearance"    && <AppearanceTab />}
          {activeTab === "accessibility" && <AccessibilityTab />}
          {activeTab === "goals"         && !reminderLoading && <GoalsTab initialGoals={goals} />}
          {activeTab === "avatar"        && <AvatarTab />}
          {activeTab === "plan"          && (
            <PlanTab
              tier={tier} reminderLoading={reminderLoading}
              reminderEnabled={reminderEnabled} reminderHour={reminderHour} reminderMinute={reminderMinute}
              saveReminderPrefs={saveReminderPrefs}
            />
          )}
          {activeTab === "mode" && <ModeTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "help" && <HelpTab />}
        </div>
      </div>

      {showDelete && <DeleteModal onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={deleting} />}
    </div>
  );
}
