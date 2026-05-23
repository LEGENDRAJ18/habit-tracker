"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Lock, Trash2, AlertCircle, CheckCircle2,
  Loader2, Eye, EyeOff, X, Bell, Download, Crown, Zap, Palette,
  Check, RotateCcw, Target, SlidersHorizontal, CreditCard, Sparkles,
  HelpCircle, ArrowRight, Smile,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { TOUR_STORAGE_KEY, TOUR_SESSION_KEY } from "@/components/ui/OnboardingTour";
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
      <div className="relative bg-[#0f0f1a] border border-red-900/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
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
      const { data: { user } } = await supabase.auth.getUser();
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
      setCustomGoal(initialGoals.find((g) => !GOAL_OPTIONS.some((o) => o.label === g)) ?? "");
    }
    setSelected(knownIds);
    setLoaded(true);
  }, [initialGoals, loaded]);

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const hasCustom = selected.includes("custom");
  const canSave = selected.length > 0 && (!hasCustom || customGoal.trim() !== "");

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setStatus(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const goalLabels = selected.map((id) => id === "custom" ? customGoal.trim() || "Custom goal" : GOAL_OPTIONS.find((g) => g.id === id)?.label ?? id);
      const { error } = await supabase.from("profiles").update({ goals: goalLabels, goal: goalLabels[0] ?? null }).eq("id", user.id);
      setStatus(error ? { err: error.message } : { ok: "Goals saved! Habit suggestions and AI coaching will update." });
    } catch { setStatus({ err: "Failed to save goals." }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">My Goals</h2>
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
      const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
    if (error) {
      setStatus({ err: error.message.includes("unique") ? "That username is already taken." : error.message });
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
            <button onClick={() => { localStorage.removeItem(TOUR_STORAGE_KEY); sessionStorage.removeItem(TOUR_SESSION_KEY); localStorage.removeItem("habitai-tour-p1"); localStorage.removeItem("habitai-tour-p2-step"); router.push("/dashboard"); }}
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
        <h2 className="text-base font-semibold text-white mb-1">Appearance</h2>
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
        <h2 className="text-base font-semibold text-white mb-1">Accessibility</h2>
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

function InstallAppSection() {
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();
  if (isInstalled || (!canInstall && !isIOS)) return null;
  return (
    <div>
      <h2 className="text-base font-semibold text-white mb-4">Install App</h2>
      <div className={cardCls} style={{ padding: "1rem 1.25rem" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Add to Home Screen</p>
            {isIOS ? (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Tap the <strong className="text-slate-300">Share</strong> button in Safari, then{" "}
                <strong className="text-slate-300">Add to Home Screen</strong> for a full-screen app experience.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-0.5">Install HabitAI as an app for faster, offline-ready access</p>
            )}
          </div>
          {!isIOS && (
            <button
              onClick={promptInstall}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-violet-300 border border-violet-700/40 hover:border-violet-500/60 hover:text-violet-200 hover:bg-violet-950/40 rounded-xl transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HelpTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Help &amp; Support</h2>
        <p className="text-sm text-slate-500">Find answers, contact support, or browse the FAQ.</p>
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
  const isPaid = tier === "plus" || tier === "pro";
  const { formatPrice, currency, loading: currencyLoading } = useCurrency();
  const plusPrice = currencyLoading ? "$5.99" : formatPrice(5.99);
  const proPrice  = currencyLoading ? "$9.99"  : formatPrice(9.99);

  const planInfo = {
    free:  { label: "Free",  badge: "bg-slate-800 text-slate-300 border-slate-700",  desc: "Up to 3 habits, basic streak tracking" },
    plus:  { label: "Plus",  badge: "bg-violet-900/50 text-violet-300 border-violet-700/50", desc: "Unlimited habits, AI coaching, email reminders" },
    pro:   { label: "Pro",   badge: "bg-amber-900/40 text-amber-300 border-amber-700/40",    desc: "Everything in Plus, unlimited AI, data export" },
  };
  const plan = planInfo[tier as keyof typeof planInfo] ?? planInfo.free;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Your Plan</h2>
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
                <span className="text-[11px] text-slate-400 leading-snug">AI coaching, unlimited habits, reminders</span>
                <span className="text-sm font-bold text-violet-300 mt-1">{plusPrice}/mo</span>
              </Link>
              <Link href="/billing?plan=pro"
                className="flex flex-col gap-1 p-3.5 rounded-xl border border-amber-600/40 bg-amber-950/20 hover:bg-amber-950/30 hover:border-amber-500/60 transition-all group">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-bold text-white">Pro</span>
                </div>
                <span className="text-[11px] text-slate-400 leading-snug">Unlimited AI, data export, priority support</span>
                <span className="text-sm font-bold text-amber-300 mt-1">{proPrice}/mo</span>
              </Link>
            </div>
            <p className="text-[11px] text-slate-600 text-center">7-day money-back guarantee · No lock-in</p>
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_id").eq("id", user.id).single();
      if (data?.avatar_id) setSelected(data.avatar_id as AvatarId);
      setLoaded(true);
    })();
  }, [loaded, supabase]);

  const handleSave = async () => {
    setSaving(true); setStatus(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ avatar_id: selected }).eq("id", user.id);
    setStatus(error ? { err: "Failed to save." } : { ok: "Avatar saved!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Profile Picture</h2>
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

type Tab = "account" | "appearance" | "accessibility" | "goals" | "avatar" | "plan" | "help";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "account",       label: "Account",       icon: <User            className="w-3.5 h-3.5" /> },
  { id: "appearance",    label: "Appearance",     icon: <Palette         className="w-3.5 h-3.5" /> },
  { id: "accessibility", label: "Accessibility",  icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  { id: "goals",         label: "My Goals",       icon: <Target          className="w-3.5 h-3.5" /> },
  { id: "avatar",        label: "Avatar",         icon: <Smile           className="w-3.5 h-3.5" /> },
  { id: "plan",          label: "Plan",           icon: <CreditCard      className="w-3.5 h-3.5" /> },
  { id: "help",          label: "Help",           icon: <HelpCircle      className="w-3.5 h-3.5" /> },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setEmail(user.email ?? "");
      setName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "");
      setIsOAuth((user.identities ?? []).some((i) => i.provider !== "email"));
      setPageLoading(false);
    });
  }, [supabase, router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true); setNameStatus(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSavingName(false);
    setNameStatus(error ? { err: error.message } : { ok: "Name updated successfully." });
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return;
    setSavingEmail(true); setEmailStatus(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    setEmailStatus(error ? { err: error.message } : { ok: "Confirmation email sent. Click the link to complete the change." });
    if (!error) setNewEmail("");
  };

  const handleSavePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setPwStatus({ err: "Password must be at least 8 characters." }); return; }
    if (newPassword !== confirmPw) { setPwStatus({ err: "Passwords do not match." }); return; }
    setSavingPw(true); setPwStatus(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    setPwStatus(error ? { err: error.message } : { ok: "Password updated successfully." });
    if (!error) { setNewPassword(""); setConfirmPw(""); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch("/api/delete-account", { method: "DELETE" });
    if (res.ok) { await supabase.auth.signOut(); router.push("/?deleted=1"); }
    else {
      const data = await res.json();
      alert(data.error ?? "Something went wrong.");
      setDeleting(false); setShowDelete(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
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
          {activeTab === "help" && <HelpTab />}
        </div>
      </div>

      {showDelete && <DeleteModal onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={deleting} />}
    </div>
  );
}
