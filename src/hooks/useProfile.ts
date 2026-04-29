"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/types";

export function useProfile() {
  const [tier, setTier]                               = useState<Plan>("free");
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [goal, setGoal]                               = useState<string | null>(null);
  const [profileLoading, setProfileLoading]           = useState(true);
  const [lastFreezeUsed, setLastFreezeUsed]           = useState<string | null>(null);
  const [freezeProtectedDate, setFreezeProtectedDate] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled]         = useState(false);
  const [reminderHour, setReminderHour]               = useState(8);
  const [reminderMinute, setReminderMinute]           = useState(0);
  const [signedUpAt, setSignedUpAt]                   = useState<string | null>(null);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setProfileLoading(false); return; }
      setSignedUpAt(user.created_at ?? null);
      supabase
        .from("profiles")
        .select(
          "subscription_tier, onboarding_completed, goal, last_freeze_used, freeze_protected_date, reminder_enabled, reminder_hour, reminder_minute"
        )
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.subscription_tier) setTier(data.subscription_tier as Plan);
          setOnboardingCompleted(data?.onboarding_completed ?? false);
          setGoal(data?.goal ?? null);
          setLastFreezeUsed(data?.last_freeze_used ?? null);
          setFreezeProtectedDate(data?.freeze_protected_date ?? null);
          setReminderEnabled(data?.reminder_enabled ?? false);
          setReminderHour(data?.reminder_hour ?? 8);
          setReminderMinute(data?.reminder_minute ?? 0);
          setProfileLoading(false);
        });
    });
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
    profileLoading,
    freezeAvailable,
    freezeProtectedDate,
    applyFreeze,
    reminderEnabled,
    reminderHour,
    reminderMinute,
    saveReminderPrefs,
    signedUpAt,
  };
}
