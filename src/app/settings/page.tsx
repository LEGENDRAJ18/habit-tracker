"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Lock, Trash2, AlertCircle,
  CheckCircle2, Loader2, Eye, EyeOff, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/ui/BottomNav";
import { useProfile } from "@/hooks/useProfile";
import ReminderSettings from "@/components/dashboard/ReminderSettings";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const { reminderEnabled, reminderHour, reminderMinute, saveReminderPrefs, profileLoading: reminderLoading } = useProfile();

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
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-semibold text-white">Account Settings</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Email Reminders ──────────────────────────────────────────────── */}
        {!reminderLoading && (
          <ReminderSettings
            enabled={reminderEnabled}
            hour={reminderHour}
            minute={reminderMinute}
            onSave={saveReminderPrefs}
          />
        )}

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
