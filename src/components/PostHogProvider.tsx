"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function PageviewTracker() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!posthog.__loaded) return;
    const qs  = searchParams.toString();
    const url = window.location.origin + pathname + (qs ? `?${qs}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function UserIdentifier() {
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const user = session.user;
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, subscription_tier")
            .eq("id", user.id)
            .single();

          posthog.identify(user.id, {
            email:    user.email,
            name:     user.user_metadata?.full_name ?? user.user_metadata?.name,
            username: profile?.username ?? null,
            plan:     profile?.subscription_tier ?? "free",
          });
        } else {
          posthog.reset();
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (posthog.__loaded) return;

    posthog.init(key, {
      api_host:        "https://us.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      persistence:     "localStorage",
      autocapture:     false,
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense>
        <PageviewTracker />
        <UserIdentifier />
      </Suspense>
      {children}
    </PHProvider>
  );
}
