"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/types";

export function useProfile() {
  const [tier, setTier]                               = useState<Plan>("free");
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [goal, setGoal]                               = useState<string | null>(null);
  const [goals, setGoals]                             = useState<string[]>([]);
  const [profileLoading, setProfileLoading]           = useState(true);
  const [lastFreezeUsed, setLastFreezeUsed]           = useState<string | null>(null);
  const [freezeProtectedDate, setFreezeProtectedDate] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled]               = useState(false);
  const [reminderHour, setReminderHour]                     = useState(8);
  const [reminderMinute, setReminderMinute]                 = useState(0);
  const [signedUpAt, setSignedUpAt]                         = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd]           = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd]             = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus]         = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate]                     = useState<string | null>(null);
  const [dreamUniversity, setDreamUniversity]               = useState<string | null>(null);
  const [userMode, setUserMode]                             = useState<"student" | "parent" | "teacher" | "personal">("personal");
  const supabase = useRef(createClient()).current;

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
      if (d.subscription_tier) setTier(d.subscription_tier as Plan);
      setOnboardingCompleted(d.onboarding_completed ?? false);
      setGoal(d.goal ?? null);
      setGoals(Array.isArray(d.goals) && d.goals.length > 0
        ? d.goals
        : d.goal ? [d.goal] : []);
      setLastFreezeUsed(d.last_freeze_used ?? null);
      setFreezeProtectedDate(d.freeze_protected_date ?? null);
      setReminderEnabled(d.reminder_enabled ?? false);
      setReminderHour(d.reminder_hour ?? 8);
      setReminderMinute(d.reminder_minute ?? 0);
      setCancelAtPeriodEnd(d.subscription_cancel_at_period_end ?? false);
      setCurrentPeriodEnd(d.subscription_current_period_end ?? null);
      setSubscriptionStatus(d.subscription_status ?? null);
      setTrialEndDate(d.trial_end_date ?? null);
      setDreamUniversity(d.dream_university ?? null);
      setUserMode((d.user_mode as "student" | "parent" | "teacher" | "personal") ?? "personal");
    }

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProfileLoading(false); return; }
      setSignedUpAt(user.created_at ?? null);
      const { data } = await supabase
        .from("profiles")
        .select(
          "subscription_tier, onboarding_completed, goal, goals, last_freeze_used, freeze_protected_date, reminder_enabled, reminder_hour, reminder_minute, subscription_cancel_at_period_end, subscription_current_period_end, subscription_status, trial_end_date, dream_university, user_mode"
        )
        .eq("id", user.id)
        .single();
      if (data) applyData(data);
      setProfileLoading(false);

      channel = supabase
        .channel(`profile-rt-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          (payload) => applyData(payload.new as Parameters<typeof applyData>[0])
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Freeze resets every 7 days
  const today = new Date().toISOString().split("T")[0];
  const freezeAvailable =
    !lastFreezeUsed ||
    Math.round(
      (new Date(today).getTime() - new Date(lastFreezeUsed).getTime()) / 86400000
    ) >= 7;

  const applyFreeze = useCallback(
    async (protectedDate: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const todayStr = new Date().toISOString().split("T")[0];
      await supabase
        .from("profiles")
        .update({
          last_freeze_used:      todayStr,
          freeze_protected_date: protectedDate,
          streak_freezes:        0,
        })
        .eq("id", user.id);
      setLastFreezeUsed(todayStr);
      setFreezeProtectedDate(protectedDate);
    },
    [supabase]
  );

  const saveReminderPrefs = useCallback(
    async (enabled: boolean, hour: number, minute = 0) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
