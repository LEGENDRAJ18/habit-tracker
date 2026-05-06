"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, User, Mail, Lock, Trash2, AlertCircle,
  CheckCircle2, Loader2, Eye, EyeOff, X, Bell, Download,
  Crown, Zap, Palette, Check, RotateCcw, Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/ui/BottomNav";
import { useProfile } from "@/hooks/useProfile";
import { TOUR_STORAGE_KEY, TOUR_SESSION_KEY } from "@/components/ui/OnboardingTour";
import ReminderSettings from "@/components/dashboard/ReminderSettings";
import {
  useAppearance, ACCENT_PALETTE,
  type AccentColor, type FontSize, type DashboardLayout,
} from "@/contexts/AppearanceContext";

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
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
      className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
    />
  );
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function Success({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-sm text-emerald-300">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      {msg}
    </div>
  );
}

function Error({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-800/40 rounded-xl p-3 text-sm text-red-300">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {msg}
    </div>
  );
}

// ─── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({
  onConfirm,
  onCancel,
  loading,
}: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const [typed, setTyped] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0f0f1a] border border-red-900/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-600 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-800/40 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white text-center mb-1">Delete account?</h2>
        <p className="text-sm text-slate-400 text-center mb-5 leading-relaxed">
          This permanently deletes all your habits, streaks, and data. There is no undo.
        </p>
        <p className="text-xs text-slate-500 mb-2">
          Type <span className="font-bold text-slate-300">DELETE</span> to confirm
        </p>
        <Input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-violet-900/30 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={typed !== "DELETE" || loading}
            className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Export (Pro) ─────────────────────────────────────────────────────────

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
        ...(logs ?? []).map((l) => [
          `"${(habitMap.get(l.habit_id) ?? l.habit_id).replace(/"/g, '""')}"`,
          l.completed_at.split("T")[0],
        ]),
      ];

      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `habitai-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-[#0f0f1a] border border-amber-600/25 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Download className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-white">Export Data</h2>
        <span className="ml-auto inline-flex items-center gap-1 bg-amber-900/30 border border-amber-600/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Crown className="w-2.5 h-2.5" />Pro
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Download your complete habit completion history as a CSV file.</p>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-300 text-xs font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {exporting ? "Exporting…" : "Download CSV"}
      </button>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label, sub, value, onChange,
}: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white">{label}</p>
        {sub && <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        style={{
          position:        "relative",
          width:           "2.5rem",
          height:          "1.375rem",
          borderRadius:    "9999px",
          backgroundColor: value ? "var(--a-600, #7c3aed)" : "#374151",
          transition:      "background-color 0.2s",
          flexShrink:      0,
        }}
      >
        <span
          style={{
            position:        "absolute",
            top:             "0.125rem",
            left:            value ? "calc(100% - 1.25rem)" : "0.125rem",
            width:           "1.125rem",
            height:          "1.125rem",
            borderRadius:    "9999px",
            backgroundColor: "white",
            boxShadow:       "0 1px 3px rgba(0,0,0,0.4)",
            transition:      "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}

// ─── Appearance section ───────────────────────────────────────────────────────

function AppearanceSection() {
  const router = useRouter();
  const {
    accent,              setAccent,
    fontSize,            setFontSize,
    dashboardLayout,     setDashboardLayout,
    showTimeEmojis,      setShowTimeEmojis,
    showHabitStreak,     setShowHabitStreak,
    showHabitXP,         setShowHabitXP,
    showAchievementPopups, setShowAchievementPopups,
    showLevelUpAnimation,  setShowLevelUpAnimation,
  } = useAppearance();

  const cardCls = "bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-6 space-y-6";

  const optionBtn = (active: boolean) =>
    `flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all capitalize ${
      active
        ? "border-transparent text-white"
        : "bg-transparent border-violet-900/20 text-slate-500 hover:text-slate-300 hover:border-violet-900/40"
    }`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4" style={{ color: "var(--a-400)" }} />
        <h2 className="text-sm font-semibold text-white">Appearance</h2>
      </div>

      <div className={cardCls}>

        {/* ── Theme Color ───────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-3">Theme Color</p>
          <div className="grid grid-cols-4 gap-2.5">
            {(Object.entries(ACCENT_PALETTE) as [AccentColor, typeof ACCENT_PALETTE[AccentColor]][]).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setAccent(key)}
                title={p.name}
                className={`relative flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all ${
                  accent === key
                    ? "border-white/20 bg-white/5"
                    : "border-violet-900/20 hover:bg-white/3 hover:border-violet-900/40"
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full"
                  style={{
                    backgroundColor: p.swatch,
                    boxShadow: accent === key ? `0 0 16px ${p.swatch}99, 0 0 6px ${p.swatch}66` : "none",
                  }}
                />
                <span className={`text-[10px] font-medium ${accent === key ? "text-white" : "text-slate-500"}`}>
                  {p.name}
                </span>
                {accent === key && (
                  <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                    <Check className="w-2 h-2 text-black" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-2.5">Applied to buttons, nav highlights, and progress bars</p>
        </div>

        {/* ── Font Size ─────────────────────────────────────────────────── */}
        <div className="border-t border-violet-900/20 pt-5">
          <p className="text-xs font-medium text-slate-400 mb-3">Font Size</p>
          <div className="flex gap-2.5">
            {(["small", "medium", "large"] as FontSize[]).map((s) => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={optionBtn(fontSize === s)}
                style={fontSize === s ? {
                  backgroundColor: "rgba(var(--a-r), var(--a-g), var(--a-b), 0.2)",
                  borderColor:     "var(--a-600)",
                  color:           "var(--a-300, #c4b5fd)",
                } : undefined}
              >
                {s === "small" ? "Small" : s === "medium" ? "Medium" : "Large"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            {fontSize === "small" ? "14px — more content visible"
              : fontSize === "large" ? "18px — easier to read"
              : "16px — default"}
          </p>
        </div>

        {/* ── Dashboard Layout ──────────────────────────────────────────── */}
        <div className="border-t border-violet-900/20 pt-5">
          <p className="text-xs font-medium text-slate-400 mb-3">Dashboard Layout</p>
          <div className="flex gap-2.5">
            {(["compact", "comfortable", "spacious"] as DashboardLayout[]).map((l) => (
              <button
                key={l}
                onClick={() => setDashboardLayout(l)}
                className={optionBtn(dashboardLayout === l)}
                style={dashboardLayout === l ? {
                  backgroundColor: "rgba(var(--a-r), var(--a-g), var(--a-b), 0.2)",
                  borderColor:     "var(--a-600)",
                  color:           "var(--a-300, #c4b5fd)",
                } : undefined}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-2">Adjusts spacing and card size on the dashboard</p>
        </div>

        {/* ── Habit Display ─────────────────────────────────────────────── */}
        <div className="border-t border-violet-900/20 pt-5 space-y-4">
          <p className="text-xs font-medium text-slate-400">Habit Card Display</p>
          <ToggleRow
            label="Show time-of-day emojis"
            sub="Morning ☀️  Afternoon 🌤  Evening 🌙"
            value={showTimeEmojis}
            onChange={setShowTimeEmojis}
          />
          <ToggleRow
            label="Show streak on each habit"
            sub="Displays the current streak count on habit cards"
            value={showHabitStreak}
            onChange={setShowHabitStreak}
          />
          <ToggleRow
            label="Show XP value on each habit"
            sub="Shows XP reward for completing each habit"
            value={showHabitXP}
            onChange={setShowHabitXP}
          />
        </div>

        {/* ── In-App Notifications ──────────────────────────────────────── */}
        <div className="border-t border-violet-900/20 pt-5 space-y-4">
          <p className="text-xs font-medium text-slate-400">In-App Notifications</p>
          <ToggleRow
            label="Achievement popups"
            sub="Show a celebration popup when you earn an achievement"
            value={showAchievementPopups}
            onChange={setShowAchievementPopups}
          />
          <ToggleRow
            label="Level up animation"
            sub="Play an animation when you level up"
            value={showLevelUpAnimation}
            onChange={setShowLevelUpAnimation}
          />
        </div>

        {/* ── Onboarding tour ───────────────────────────────────────────── */}
        <div className="border-t border-violet-900/20 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-white">Retake the app tour</p>
              <p className="text-[11px] text-slate-600 mt-0.5">See the getting started guide again</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem(TOUR_STORAGE_KEY);
                sessionStorage.removeItem(TOUR_SESSION_KEY);
                router.push("/dashboard");
              }}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 px-3 py-1.5 border border-violet-800/40 hover:border-violet-600/50 rounded-xl transition-all bg-violet-950/30 hover:bg-violet-950/50"
            >
              <RotateCcw className="w-3 h-3" />
              Restart tour
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Goals ────────────────────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  { id: "fitness",    emoji: "🏋️", label: "Get fit & healthy"    },
  { id: "learn",      emoji: "📚", label: "Learn & grow"          },
  { id: "mental",     emoji: "🧠", label: "Build mental wellness" },
  { id: "productive", emoji: "💰", label: "Be more productive"    },
  { id: "sleep",      emoji: "😴", label: "Improve sleep"         },
  { id: "custom",     emoji: "🎯", label: "Custom goal"           },
] as const;

function GoalsSection({ initialGoals }: { initialGoals: string[] }) {
  const supabase = createClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok?: string; err?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const hasCustom = initialGoals.some(
      (g) => !GOAL_OPTIONS.some((o) => o.label === g)
    );
    const knownIds = initialGoals
      .filter((g) => GOAL_OPTIONS.some((o) => o.label === g))
      .map((g) => GOAL_OPTIONS.find((o) => o.label === g)!.id as string);
    if (hasCustom) {
      knownIds.push("custom");
      const customLabel = initialGoals.find(
        (g) => !GOAL_OPTIONS.some((o) => o.label === g)
      );
      setCustomGoal(customLabel ?? "");
    }
    setSelected(knownIds);
    setLoaded(true);
  }, [initialGoals, loaded]);

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const hasCustom = selected.includes("custom");
  const canSave = selected.length > 0 && (!hasCustom || customGoal.trim() !== "");

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setStatus(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const goalLabels = selected.map((id) => {
        if (id === "custom") return customGoal.trim() || "Custom goal";
        return GOAL_OPTIONS.find((g) => g.id === id)?.label ?? id;
      });
      const { error } = await supabase
        .from("profiles")
        .update({ goals: goalLabels, goal: goalLabels[0] ?? null })
        .eq("id", user.id);
      setStatus(error ? { err: error.message } : { ok: "Goals saved!" });
    } catch {
      setStatus({ err: "Failed to save goals." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">My Goals</h2>
      </div>
      <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-sm text-slate-300 font-medium mb-1">What are you working towards?</p>
          <p className="text-xs text-slate-500">Your habits and AI coaching will be tailored to these goals.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((g) => {
            const isSelected = selected.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggle(g.id)}
                className={`w-full text-left rounded-xl border px-3 py-3 transition-all duration-200 ${
                  isSelected
                    ? "border-violet-500/60 bg-violet-600/18 ring-1 ring-violet-500/25"
                    : "border-violet-900/20 bg-[#0c0c18] hover:border-violet-700/35 hover:bg-violet-950/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none flex-shrink-0">{g.emoji}</span>
                  <span className={`text-xs font-medium leading-snug flex-1 ${isSelected ? "text-violet-100" : "text-slate-300"}`}>
                    {g.label}
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? "border-violet-500 bg-violet-500" : "border-slate-700"
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {hasCustom && (
          <input
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            placeholder="Describe your custom goal…"
            maxLength={80}
            className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
          />
        )}
        {status?.ok  && <Success msg={status.ok} />}
        {status?.err && <Error   msg={status.err} />}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save goals
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const { reminderEnabled, reminderHour, reminderMinute, saveReminderPrefs, profileLoading: reminderLoading, tier, goals } = useProfile();

  const [email,       setEmail]       = useState("");
  const [name,        setName]        = useState("");
  const [newEmail,    setNewEmail]    = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [isOAuth,     setIsOAuth]     = useState(false);

  const [nameStatus,    setNameStatus]    = useState<{ ok?: string; err?: string } | null>(null);
  const [emailStatus,   setEmailStatus]   = useState<{ ok?: string; err?: string } | null>(null);
  const [pwStatus,      setPwStatus]      = useState<{ ok?: string; err?: string } | null>(null);

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
      // Detect OAuth users (they can't change password)
      const identities = user.identities ?? [];
      setIsOAuth(identities.some((i) => i.provider !== "email"));
      setPageLoading(false);
    });
  }, [supabase, router]);

  // ── Save name ──────────────────────────────────────────────────────────────
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    setNameStatus(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSavingName(false);
    setNameStatus(error ? { err: error.message } : { ok: "Name updated successfully." });
  };

  // ── Save email ─────────────────────────────────────────────────────────────
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return;
    setSavingEmail(true);
    setEmailStatus(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    setEmailStatus(
      error
        ? { err: error.message }
        : { ok: "Confirmation email sent to your new address. Click the link to complete the change." },
    );
    if (!error) setNewEmail("");
  };

  // ── Save password ──────────────────────────────────────────────────────────
  const handleSavePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPwStatus({ err: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPw) {
      setPwStatus({ err: "Passwords do not match." });
      return;
    }
    setSavingPw(true);
    setPwStatus(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    setPwStatus(error ? { err: error.message } : { ok: "Password updated successfully." });
    if (!error) { setNewPassword(""); setConfirmPw(""); }
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch("/api/delete-account", { method: "DELETE" });
    if (res.ok) {
      await supabase.auth.signOut();
      router.push("/?deleted=1");
    } else {
      const data = await res.json();
      alert(data.error ?? "Something went wrong.");
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  const sectionCls = "bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-6 space-y-5";

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-slate-500 hover:text-white text-xs transition-colors py-1.5 px-2 -ml-2 rounded-lg hover:bg-violet-950/40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Dashboard</span>
          </Link>
          <span className="text-slate-700 text-sm">/</span>
          <span className="text-sm font-semibold text-white">⚙️ Settings</span>
        </div>
      </div>

      {/* Page hero */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">⚙️ Settings</h1>
        <p className="text-sm text-slate-500 mt-1.5">Manage your account, appearance, and preferences</p>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-8 space-y-6">

        {/* ── Email Reminders ──────────────────────────────────────────────── */}
        {!reminderLoading && (
          (tier === "plus" || tier === "pro") ? (
            <ReminderSettings
              enabled={reminderEnabled}
              hour={reminderHour}
              minute={reminderMinute}
              onSave={saveReminderPrefs}
            />
          ) : (
            <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">Email Reminders</h2>
                <span className="ml-auto inline-flex items-center gap-1 bg-violet-900/40 border border-violet-700/40 text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Zap className="w-2.5 h-2.5" />Plus
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Get daily email reminders for your habits. Available on Plus and Pro.</p>
              <Link
                href="/billing"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-300 text-xs font-semibold rounded-xl transition-all"
              >
                <Zap className="w-3 h-3" />
                Upgrade to Plus — $7/mo
              </Link>
            </div>
          )
        )}

        {/* ── CSV Export (Pro) ─────────────────────────────────────────────── */}
        {!reminderLoading && (
          tier === "pro" ? (
            <CsvExportSection />
          ) : (
            <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Export Data</h2>
                <span className="ml-auto inline-flex items-center gap-1 bg-amber-900/30 border border-amber-600/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Crown className="w-2.5 h-2.5" />Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Download your full habit history as CSV. Available exclusively on Pro.</p>
              <Link
                href="/billing"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-300 text-xs font-semibold rounded-xl transition-all"
              >
                <Crown className="w-3 h-3" />
                Upgrade to Pro — $12/mo
              </Link>
            </div>
          )
        )}

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <AppearanceSection />

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Profile</h2>
          </div>
          <div className={sectionCls}>
            <form onSubmit={handleSaveName} className="space-y-4">
              <Field label="Display name">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={60}
                />
              </Field>
              <Field label="Email address" hint="Your current email address.">
                <Input type="email" value={email} readOnly disabled className="opacity-50 cursor-not-allowed" />
              </Field>
              {nameStatus?.ok  && <Success msg={nameStatus.ok} />}
              {nameStatus?.err && <Error   msg={nameStatus.err} />}
              <button
                type="submit"
                disabled={savingName || !name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all"
              >
                {savingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save name
              </button>
            </form>
          </div>
        </div>

        {/* ── My Goals ─────────────────────────────────────────────────────── */}
        {!reminderLoading && <GoalsSection initialGoals={goals} />}

        {/* ── Change email ────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Change Email</h2>
          </div>
          <div className={sectionCls}>
            <form onSubmit={handleSaveEmail} className="space-y-4">
              <Field
                label="New email address"
                hint="We'll send a confirmation link to your new address."
              >
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                />
              </Field>
              {emailStatus?.ok  && <Success msg={emailStatus.ok} />}
              {emailStatus?.err && <Error   msg={emailStatus.err} />}
              <button
                type="submit"
                disabled={savingEmail || !newEmail.trim() || newEmail === email}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all"
              >
                {savingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send confirmation
              </button>
            </form>
          </div>
        </div>

        {/* ── Change password ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Change Password</h2>
          </div>
          <div className={sectionCls}>
            {isOAuth ? (
              <p className="text-sm text-slate-500">
                Your account uses Google or Apple sign-in. Password changes are managed through your
                provider.
              </p>
            ) : (
              <form onSubmit={handleSavePw} className="space-y-4">
                <Field label="New password" hint="Minimum 8 characters.">
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {newPassword && (
                    <div className="flex gap-1 mt-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            newPassword.length >= i * 3
                              ? newPassword.length >= 12 ? "bg-emerald-500" : "bg-violet-500"
                              : "bg-violet-950"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="Confirm new password">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Confirm password"
                  />
                </Field>
                {pwStatus?.ok  && <Success msg={pwStatus.ok} />}
                {pwStatus?.err && <Error   msg={pwStatus.err} />}
                <button
                  type="submit"
                  disabled={savingPw || !newPassword || !confirmPw}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all"
                >
                  {savingPw && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Update password
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Danger zone ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
          </div>
          <div className="bg-[#0f0f1a] border border-red-900/30 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Delete account</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-950/50 hover:bg-red-950/80 border border-red-800/40 text-red-400 text-sm font-medium rounded-xl transition-all flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete account
              </button>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />

      {showDelete && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
