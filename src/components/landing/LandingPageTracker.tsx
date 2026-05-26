"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function LandingPageTracker() {
  useEffect(() => {
    posthog.capture("landing_page_viewed");
  }, []);
  return null;
}
