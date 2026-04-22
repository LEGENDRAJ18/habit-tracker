"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/types";

export function useProfile() {
  const [tier, setTier]                         = useState<Plan>("free");
  // Default true to prevent onboarding flash while loading
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [goal, setGoal]                         = useState<string | null>(null);
  const [profileLoading, setProfileLoading]     = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      supabase
        .from("profiles")
        .select("subscription_tier, onboarding_completed, goal")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.subscription_tier) setTier(data.subscription_tier as Plan);
          // null means the column didn't exist yet — treat as not completed
          setOnboardingCompleted(data?.onboarding_completed ?? false);
          setGoal(data?.goal ?? null);
          setProfileLoading(false);
        });
    });
  }, []);

  return { tier, onboardingCompleted, goal, profileLoading };
}
