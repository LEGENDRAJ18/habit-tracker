"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/types";

// ─── Profile localStorage cache ───────────────────────────────────────────────

const CACHE_KEY = "habitai_profile_v2";

interface ProfileSnapshot {
  tier: string;
  onboardingCompleted: boolean;
  goal: string | null;
  goals: string[];
  dreamUniversity: string | null;
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

// ─── Module-level realtime singleton ─────────────────────────────────────────
// createBrowserClient is a singleton — all useProfile instances share the same
// Supabase client and therefore the same channel registry.
//
// Supabase throws "cannot add 'postgres_changes' callbacks after subscribe()"
// whenever .on() is called on an already-subscribed channel. This happens when:
//   1. Multiple useProfile instances run (AppShell + DashboardNav + etc.)
//   2. The effect re-runs before the previous removeChannel() async round-trip
//      completes (channel is still in the registry at the next .channel() call)
//
// The module-level state below outlives React's effect lifecycle, letting every
// hook instance coordinate:
//   • _rtUserId   — which user's channel is currently active
//   • _rtChannel  — the active RealtimeChannel object (any type to avoid import)
//   • _rtSb       — the Supabase client that owns it (needed for removeChannel)
//   • _rtSeq      — monotonic counter; appended to name so each mount gets a
//                   fresh registry entry even if the old removal is still pending
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rtUserId: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rtChannel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rtSb: any = null;
let _rtSeq = 0;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfile() {
  // Seed synchronously from localStorage so the dashboard renders instantly
  // on return visits without waiting for any network call.
  const [cached] = useState(() => readCache());

  const [tier, setTier]                               = useState<Plan>((cached?.tier as Plan) ?? "free");
  const [onboardingCompleted, setOnboardingCompleted] = useState(cached?.onboardingCompleted ?? true);
  const [goal, setGoal]                               = useState<string | null>(cached?.goal ?? null);
  const [goals, setGoals]                             = useState<string[]>(cached?.goals ?? []);
  const [profileLoading, setProfileLoading]           = useState(!cached);   // false immediately if cached
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
  const [userMode, setUserMode]                       = useState<"student" | "parent" | "teacher" | "personal">(
    (cached?.userMode as "student" | "parent" | "teacher" | "personal") ?? "personal"
  );

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    // cancelled prevents this IIFE from touching state/channels after cleanup.
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
      user_mode?: string | null;
    }) {
      const newTier                = (d.subscription_tier as Plan | null) ?? "free";
      const newOnboarding          = d.onboarding_completed ?? false;
      const newGoal                = d.goal ?? null;
      const newGoals               = Array.isArray(d.goals) && d.goals.length > 0
        ? d.goals
        : d.goal ? [d.goal] : [];
      const newLastFreeze          = d.last_freeze_used ?? null;
      const newFreezeDate          = d.freeze_protected_date ?? null;
      const newReminderEnabled     = d.reminder_enabled ?? false;
      const newReminderHour        = d.reminder_hour ?? 8;
      const newReminderMinute      = d.reminder_minute ?? 0;
      const newCancelAtPeriodEnd   = d.subscription_cancel_at_period_end ?? false;
      const newCurrentPeriodEnd    = d.subscription_current_period_end ?? null;
      const newSubStatus           = d.subscription_status ?? null;
      const newTrialEnd            = d.trial_end_date ?? null;
      const newDreamUniversity     = d.dream_university ?? null;
      const newUserMode            = (d.user_mode as "student" | "parent" | "teacher" | "personal") ?? "personal";

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
      setUserMode(newUserMode);

      // Persist to localStorage so next visit is instant
      writeCache({
        tier: newTier,
        onboardingCompleted: newOnboarding,
        goal: newGoal,
        goals: newGoals,
        dreamUniversity: newDreamUniversity,
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
      });
    }

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setProfileLoading(false); return; }
      if (cancelled) return;

      setSignedUpAt(user.created_at ?? null);

      const { data } = await supabase
        .from("profiles")
        .select(
          "subscription_tier, onboarding_completed, goal, goals, last_freeze_used, freeze_protected_date, reminder_enabled, reminder_hour, reminder_minute, subscription_cancel_at_period_end, subscription_current_period_end, subscription_status, trial_end_date, dream_university, user_mode"
        )
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (data) applyData(data);
      setProfileLoading(false);

      // ── Realtime singleton ──────────────────────────────────────────────────
      // Everything from here to the end of the try/catch is synchronous (no
      // await), so no other async continuation can interleave with it. This
      // gives us atomic check-then-claim semantics without a real mutex.

      // If another useProfile instance already has an active channel for this
      // user, skip — never call .on() on an already-subscribed channel.
      if (_rtUserId === user.id && _rtChannel != null) return;

      // Tear down any stale channel (different user or orphaned).
      // Fire-and-forget: the unique name below makes a registry collision
      // impossible even if the async unsubscribe hasn't flushed yet.
      if (_rtChannel != null) {
        const sb = _rtSb, ch = _rtChannel;
        _rtChannel = null; _rtSb = null; _rtUserId = null;
        try { sb?.removeChannel(ch)?.catch?.(() => {}); } catch {}
      }

      if (cancelled) return;

      // Claim the slot synchronously before creating the channel.
      _rtUserId = user.id;
      _rtSb     = supabase;

      // ALL .on() handlers are registered before .subscribe() — never after.
      // The unique name (seq counter) means supabase.channel() always returns
      // a brand-new object, even if the old removal is still in flight.
      // The entire block is wrapped in try/catch: realtime is optional, and
      // any failure here must never crash or blank the page.
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
        // Swallow — page must render fully with or without realtime
        console.warn("[useProfile] realtime subscription skipped:", err);
        _rtChannel = null; _rtSb = null; _rtUserId = null;
      }

      // Defensive: if effect was cleaned up while awaiting the profile fetch,
      // tear down the channel we just created. (cancelled was checked just above
      // so this path is only reached if cleanup fired between the check and here,
      // which can't happen synchronously — kept for belt-and-suspenders safety.)
      if (cancelled && channel) {
        if (_rtChannel === channel) { _rtChannel = null; _rtSb = null; _rtUserId = null; }
        try { supabase.removeChannel(channel).catch(() => {}); } catch {}
        channel = null;
      }
    })();

    return () => {
      cancelled = true;
      if (channel) {
        // Only remove the global channel if we own it — don't tear down a
        // channel that was already claimed by a newer effect instance.
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
    async (protectedDate: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const todayStr = new Date().toISOString().split("T")[0];
      await supabase
        .from("profiles")
        .update({ last_freeze_used: todayStr, freeze_protected_date: protectedDate, streak_freezes: 0 })
        .eq("id", user.id);
      setLastFreezeUsed(todayStr);
      setFreezeProtectedDate(protectedDate);
    },
    [supabase]
  );

  const saveReminderPrefs = useCallback(
    async (enabled: boolean, hour: number, minute = 0) => {
      const { data: { user } } = await supabase.auth.getUser();
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
    userMode,
  };
}
