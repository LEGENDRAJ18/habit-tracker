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
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setProfileLoading(false); return; }
      supabase
        .from("profiles")
        .select("subscription_tier, onboarding_completed, goal, last_freeze_used, freeze_protected_date")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.subscription_tier) setTier(data.subscription_tier as Plan);
          setOnboardingCompleted(data?.onboarding_completed ?? false);
          setGoal(data?.goal ?? null);
          setLastFreezeUsed(data?.last_freeze_used ?? null);
          setFreezeProtectedDate(data?.freeze_protected_date ?? null);
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

  return {
    tier,
    onboardingCompleted,
    goal,
    profileLoading,
    freezeAvailable,
    freezeProtectedDate,
    applyFreeze,
  };
}
