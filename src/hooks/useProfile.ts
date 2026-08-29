"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";
import type { Plan } from "@/types";
import { applyAccentCSSVars, ACCENT_PALETTE, type AccentColor } from "@/contexts/AppearanceContext";

// ─── Profile localStorage cache ───────────────────────────────────────────────

const CACHE_KEY = "habitai_profile_v2";

interface ProfileSnapshot {
  tier: string;
  onboardingCompleted: boolean;
  goal: string | null;
  goals: string[];
  dreamUniversity: string | null;
  gradingSystem: string | null;
  userMode: string;
  subscriptionStatus: string | null;
  trialEndDate: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  lastFreezeUsed: string | null;
  freezeProtectedDate: string | null;
  username: string | null;
  avatarId: string | null;
  accentColor: string | null;
  persona: string | null;
  welcomeSeen: boolean;
  notifPromptLastAskedAt: string | null;
}

function readCache(): ProfileSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ProfileSnapshot) : null;
  } catch {
    return null;
  }
}

function writeCache(s: ProfileSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {}
}

// ─── Module-level fetch deduplication ────────────────────────────────────────
// createBrowserClient is a singleton. Multiple components call useProfile() on
// every page — AppShell, DashboardNav, TrialBanner, UpgradeModal, etc. Without
// deduplication each instance fires its own getSession() + profiles.select().
// These module-level vars ensure AT MOST ONE DB fetch runs at a time and all
// concurrent callers share the same Promise.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _fetchPromise: Promise<any | null> | null = null;
let _fetchUserId: string | null = null;
let _fetchedAt = 0;
const FETCH_TTL_MS = 30_000; // reuse for 30 s, then allow a fresh fetch

// ─── Module-level realtime singleton ─────────────────────────────────────────
// (same design as before — prevents "cannot add callbacks after subscribe")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rtUserId: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rtChannel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rtSb: any = null;
let _rtSeq = 0;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfile() {
  const [cached] = useState(() => readCache());

  const [tier, setTier]                               = useState<Plan>((cached?.tier as Plan) ?? "free");
  const [onboardingCompleted, setOnboardingCompleted] = useState(cached?.onboardingCompleted ?? true);
  const [goal, setGoal]                               = useState<string | null>(cached?.goal ?? null);
  const [goals, setGoals]                             = useState<string[]>(cached?.goals ?? []);
  const [profileLoading, setProfileLoading]           = useState(!cached);
  const [lastFreezeUsed, setLastFreezeUsed]           = useState<string | null>(cached?.lastFreezeUsed ?? null);
  const [freezeProtectedDate, setFreezeProtectedDate] = useState<string | null>(cached?.freezeProtectedDate ?? null);
  const [reminderEnabled, setReminderEnabled]         = useState(cached?.reminderEnabled ?? false);
  const [reminderHour, setReminderHour]               = useState(cached?.reminderHour ?? 8);
  const [reminderMinute, setReminderMinute]           = useState(cached?.reminderMinute ?? 0);
  const [signedUpAt, setSignedUpAt]                   = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd]     = useState(cached?.cancelAtPeriodEnd ?? false);
  const [currentPeriodEnd, setCurrentPeriodEnd]       = useState<string | null>(cached?.currentPeriodEnd ?? null);
  const [subscriptionStatus, setSubscriptionStatus]   = useState<string | null>(cached?.subscriptionStatus ?? null);
  const [trialEndDate, setTrialEndDate]               = useState<string | null>(cached?.trialEndDate ?? null);
  const [dreamUniversity, setDreamUniversity]         = useState<string | null>(cached?.dreamUniversity ?? null);
  const [gradingSystem, setGradingSystem]             = useState<string | null>(cached?.gradingSystem ?? null);
  const [userMode, setUserMode]                       = useState<"student" | "parent" | "teacher" | "personal">(
    (cached?.userMode as "student" | "parent" | "teacher" | "personal") ?? "personal"
  );
  const [username, setUsername]                       = useState<string | null>(cached?.username ?? null);
  const [avatarId, setAvatarId]                       = useState<string | null>(cached?.avatarId ?? null);
  const [persona, setPersona]                         = useState<string | null>(cached?.persona ?? null);
  const [welcomeSeen, setWelcomeSeen]                 = useState(cached?.welcomeSeen ?? true);
  const [notifPromptLastAskedAt, setNotifPromptLastAskedAt] = useState<string | null>(cached?.notifPromptLastAskedAt ?? null);

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    let cancelled = false;

    function applyData(d: {
      subscription_tier?: string | null;
      onboarding_completed?: boolean | null;
      goal?: string | null;
      goals?: string[] | null;
      last_freeze_used?: string | null;
      freeze_protected_date?: string | null;
      reminder_enabled?: boolean | null;
      reminder_hour?: number | null;
      reminder_minute?: number | null;
      subscription_cancel_at_period_end?: boolean | null;
      subscription_current_period_end?: string | null;
      subscription_status?: string | null;
      trial_end_date?: string | null;
      dream_university?: string | null;
      grading_system?: string | null;
      user_mode?: string | null;
      username?: string | null;
      avatar_id?: string | null;
      accent_color?: string | null;
      persona?: string | null;
      welcome_seen?: boolean | null;
      notif_prompt_last_asked_at?: string | null;
    }) {
      const newTier              = (d.subscription_tier as Plan | null) ?? "free";
      const newOnboarding        = d.onboarding_completed ?? false;
      const newGoal              = d.goal ?? null;
      const newGoals             = Array.isArray(d.goals) && d.goals.length > 0
        ? d.goals
        : d.goal ? [d.goal] : [];
      const newLastFreeze        = d.last_freeze_used ?? null;
      const newFreezeDate        = d.freeze_protected_date ?? null;
      const newReminderEnabled   = d.reminder_enabled ?? false;
      const newReminderHour      = d.reminder_hour ?? 8;
      const newReminderMinute    = d.reminder_minute ?? 0;
      const newCancelAtPeriodEnd = d.subscription_cancel_at_period_end ?? false;
      const newCurrentPeriodEnd  = d.subscription_current_period_end ?? null;
      const newSubStatus         = d.subscription_status ?? null;
      const newTrialEnd          = d.trial_end_date ?? null;
      const newDreamUniversity   = d.dream_university ?? null;
      const newGradingSystem     = d.grading_system ?? null;
      const newUserMode          = (d.user_mode as "student" | "parent" | "teacher" | "personal") ?? "personal";
      const newUsername          = d.username ?? null;
      const newAvatarId          = d.avatar_id ?? null;
      const newAccentColor       = (d.accent_color as AccentColor | null) ?? null;
      const newPersona           = d.persona ?? null;
      const newWelcomeSeen       = d.welcome_seen ?? true;
      const newNotifPromptLastAskedAt = d.notif_prompt_last_asked_at ?? null;

      setTier(newTier);
      setOnboardingCompleted(newOnboarding);
      setGoal(newGoal);
      setGoals(newGoals);
      setLastFreezeUsed(newLastFreeze);
      setFreezeProtectedDate(newFreezeDate);
      setReminderEnabled(newReminderEnabled);
      setReminderHour(newReminderHour);
      setReminderMinute(newReminderMinute);
      setCancelAtPeriodEnd(newCancelAtPeriodEnd);
      setCurrentPeriodEnd(newCurrentPeriodEnd);
      setSubscriptionStatus(newSubStatus);
      setTrialEndDate(newTrialEnd);
      setDreamUniversity(newDreamUniversity);
      setGradingSystem(newGradingSystem);
      setUserMode(newUserMode);
      setUsername(newUsername);
      setAvatarId(newAvatarId);
      setPersona(newPersona);
      setWelcomeSeen(newWelcomeSeen);
      setNotifPromptLastAskedAt(newNotifPromptLastAskedAt);

      // Apply accent color CSS vars immediately (no React re-render needed — it's DOM)
      if (newAccentColor && ACCENT_PALETTE[newAccentColor]) {
        if (typeof document !== "undefined") {
          applyAccentCSSVars(newAccentColor);
          // Keep AppearanceContext's own cache in sync so Settings page shows the right color
          try {
            const ap = JSON.parse(localStorage.getItem("habitai_appearance_v1") || "{}");
            if (ap.accent !== newAccentColor) {
              localStorage.setItem("habitai_appearance_v1", JSON.stringify({ ...ap, accent: newAccentColor }));
              // Notify AppearanceContext's event listener (if mounted)
              window.dispatchEvent(new CustomEvent("habitai:accent", { detail: newAccentColor }));
            }
          } catch {}
        }
      }

      writeCache({
        tier: newTier,
        onboardingCompleted: newOnboarding,
        goal: newGoal,
        goals: newGoals,
        dreamUniversity: newDreamUniversity,
        gradingSystem: newGradingSystem,
        userMode: newUserMode,
        subscriptionStatus: newSubStatus,
        trialEndDate: newTrialEnd,
        cancelAtPeriodEnd: newCancelAtPeriodEnd,
        currentPeriodEnd: newCurrentPeriodEnd,
        reminderEnabled: newReminderEnabled,
        reminderHour: newReminderHour,
        reminderMinute: newReminderMinute,
        lastFreezeUsed: newLastFreeze,
        freezeProtectedDate: newFreezeDate,
        username: newUsername,
        avatarId: newAvatarId,
        accentColor: newAccentColor,
        persona: newPersona,
        welcomeSeen: newWelcomeSeen,
        notifPromptLastAskedAt: newNotifPromptLastAskedAt,
      });
    }

    (async () => {
      const { data: { session } } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 5_000)
        ),
      ]);
      const user = session?.user ?? null;
      if (!user) { if (!cancelled) setProfileLoading(false); return; }
      if (cancelled) return;

      setSignedUpAt(user.created_at ?? null);

      // ── Fetch deduplication ───────────────────────────────────────────────
      // If another useProfile() instance already started a fetch for this user
      // (within the TTL), await the same Promise instead of firing a new one.
      // This collapses N concurrent DB round-trips into exactly 1.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any | null;
      if (
        _fetchUserId === user.id &&
        _fetchPromise !== null &&
        Date.now() - _fetchedAt < FETCH_TTL_MS
      ) {
        data = await _fetchPromise;
      } else {
        _fetchUserId  = user.id;
        _fetchedAt    = Date.now();
        const _uid = user.id;
        const _sb  = supabase;
        const _t1 = performance.now();
        _fetchPromise = Promise.race([
          (async () => {
            try {
              const { data: d } = await _sb
                .from("profiles")
                .select(
                  "subscription_tier, onboarding_completed, goal, goals, last_freeze_used, " +
                  "freeze_protected_date, reminder_enabled, reminder_hour, reminder_minute, " +
                  "subscription_cancel_at_period_end, subscription_current_period_end, " +
                  "subscription_status, trial_end_date, dream_university, grading_system, user_mode, " +
                  "username, avatar_id, accent_color, persona, welcome_seen, notif_prompt_last_asked_at"
                )
                .eq("id", _uid)
                .single();
              return d ?? null;
            } catch {
              return null;
            }
          })(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
        ]);
        data = await _fetchPromise;
        console.log("[LOAD] profile", Math.round(performance.now() - _t1), "ms");
      }

      // Don't cache a failed/empty fetch — let the next mount retry instead of
      // serving null for up to FETCH_TTL_MS (e.g. profile row not yet created).
      if (data === null) { _fetchPromise = null; _fetchUserId = null; }

      if (cancelled) return;
      if (data) applyData(data);
      setProfileLoading(false);

      // ── Realtime singleton ────────────────────────────────────────────────
      if (_rtUserId === user.id && _rtChannel != null) return;

      if (_rtChannel != null) {
        const sb = _rtSb, ch = _rtChannel;
        _rtChannel = null; _rtSb = null; _rtUserId = null;
        try { sb?.removeChannel(ch)?.catch?.(() => {}); } catch {}
      }

      if (cancelled) return;

      _rtUserId = user.id;
      _rtSb     = supabase;

      try {
        const ch = supabase
          .channel(`profile-rt-${user.id}-${++_rtSeq}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
            (payload) => applyData(payload.new as Parameters<typeof applyData>[0])
          )
          .subscribe();
        _rtChannel = ch;
        channel    = ch;
      } catch (err) {
        console.warn("[useProfile] realtime subscription skipped:", err);
        _rtChannel = null; _rtSb = null; _rtUserId = null;
      }

      if (cancelled && channel) {
        if (_rtChannel === channel) { _rtChannel = null; _rtSb = null; _rtUserId = null; }
        try { supabase.removeChannel(channel).catch(() => {}); } catch {}
        channel = null;
      }
    })();

    return () => {
      cancelled = true;
      if (channel) {
        if (_rtChannel === channel) {
          const sb = _rtSb;
          _rtChannel = null; _rtSb = null; _rtUserId = null;
          try { sb?.removeChannel(channel)?.catch?.(() => {}); } catch {}
        }
        channel = null;
      }
    };
  }, [supabase]);

  const today = new Date().toISOString().split("T")[0];
  const freezeAvailable =
    !lastFreezeUsed ||
    Math.round(
      (new Date(today).getTime() - new Date(lastFreezeUsed).getTime()) / 86400000
    ) >= 7;

  const applyFreeze = useCallback(
    async (): Promise<{ error: string | null }> => {
      const user = await resolveUser();
      if (!user) return { error: "Not signed in" };
      // Tier + weekly-eligibility check now happens server-side (atomic,
      // can't be raced) — see /api/streak-freeze/apply.
      const res = await fetch("/api/streak-freeze/apply", { method: "POST" });
      const body = await res.json().catch(() => null) as
        { error?: string; last_freeze_used?: string; freeze_protected_date?: string } | null;
      if (!res.ok) return { error: body?.error ?? "Couldn't apply streak freeze." };
      if (body?.last_freeze_used)      setLastFreezeUsed(body.last_freeze_used);
      if (body?.freeze_protected_date) setFreezeProtectedDate(body.freeze_protected_date);
      return { error: null };
    },
    []
  );

  const saveReminderPrefs = useCallback(
    async (enabled: boolean, hour: number, minute = 0) => {
      const user = await resolveUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ reminder_enabled: enabled, reminder_hour: hour, reminder_minute: minute })
        .eq("id", user.id);
      setReminderEnabled(enabled);
      setReminderHour(hour);
      setReminderMinute(minute);
    },
    [supabase]
  );

  const markWelcomeSeen = useCallback(async () => {
    setWelcomeSeen(true);
    const user = await resolveUser();
    if (!user) return;
    await supabase.from("profiles").update({ welcome_seen: true }).eq("id", user.id);
  }, [supabase]);

  const markNotifPromptAsked = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifPromptLastAskedAt(now);
    const user = await resolveUser();
    if (!user) return;
    await supabase.from("profiles").update({ notif_prompt_last_asked_at: now }).eq("id", user.id);
  }, [supabase]);

  return {
    tier,
    onboardingCompleted,
    goal,
    goals,
    profileLoading,
    freezeAvailable,
    freezeProtectedDate,
    applyFreeze,
    reminderEnabled,
    reminderHour,
    reminderMinute,
    saveReminderPrefs,
    signedUpAt,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    subscriptionStatus,
    trialEndDate,
    dreamUniversity,
    gradingSystem,
    userMode,
    username,
    avatarId,
    persona,
    welcomeSeen,
    markWelcomeSeen,
    notifPromptLastAskedAt,
    markNotifPromptAsked,
  };
}
