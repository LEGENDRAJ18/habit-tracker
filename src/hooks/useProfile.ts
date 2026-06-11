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
    let channel: ReturnType<typeof supabase.channel> | null = null;

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

    // cancelled prevents the async IIFE from touching state or channels after
    // the effect is cleaned up (React navigation, StrictMode double-invoke, etc.)
    let cancelled = false;

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

      // All .on() handlers must be registered BEFORE .subscribe() — never after.
      channel = supabase
        .channel(`profile-rt-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          (payload) => applyData(payload.new as Parameters<typeof applyData>[0])
        )
        .subscribe();

      // If the effect was cleaned up while the awaits were running, tear down
      // the channel we just created rather than leaving it dangling.
      if (cancelled) {
        supabase.removeChannel(channel);
        channel = null;
      }
    })();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
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
