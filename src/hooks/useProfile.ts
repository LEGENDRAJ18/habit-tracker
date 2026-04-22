"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/types";

export function useProfile() {
  const [tier, setTier] = useState<Plan>("free");
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.subscription_tier) {
            setTier(data.subscription_tier as Plan);
          }
          setProfileLoading(false);
        });
    });
  }, []);

  return { tier, profileLoading };
}
